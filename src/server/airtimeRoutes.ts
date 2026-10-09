import { Router, Request, Response } from 'express';
import {
  getSabussConfig,
  saveSabussConfig,
  recordAirtimeRedemption,
  updateAirtimeRedemption,
  getUserAirtimeRedemptions,
  getAllAirtimeRedemptions,
  DEFAULT_SABUSS_API_KEY,
  AirtimeRedemptionRecord
} from '../services/airtimeDb';
import { isCloudSqlConfigured } from '../db/index';

const router = Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://sdgxpquruczhkpyhjaxn.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

/**
 * Plan mapping for Nigerian mobile networks on Sabuss VTU
 * 1 = MTN, 2 = GLO, 3 = AIRTEL, 4 = 9MOBILE
 */
function resolveNetworkPlanId(network: string, explicitPlanId?: string): string {
  if (explicitPlanId && explicitPlanId.trim().length > 0) return explicitPlanId.trim();
  const net = (network || '').toLowerCase();
  if (net.includes('mtn')) return '1';
  if (net.includes('glo')) return '2';
  if (net.includes('airtel')) return '3';
  if (net.includes('9mobile') || net.includes('etisalat')) return '4';
  return '1';
}

/**
 * Maps Sabuss API response status code to standardized platform status:
 * 200 » success
 * 400 » pending
 * 800 » failed
 * 900 » reversed
 */
function mapSabussStatusCode(code: any): { status: 'success' | 'pending' | 'failed' | 'reversed'; message: string } {
  const codeStr = String(code || '').trim();
  if (codeStr === '200' || codeStr === 'success' || codeStr === 'successful') {
    return { status: 'success', message: 'Airtime recharge delivered successfully.' };
  }
  if (codeStr === '400' || codeStr === 'pending' || codeStr === 'processing') {
    return { status: 'pending', message: 'Recharge is currently processing with network carrier.' };
  }
  if (codeStr === '900' || codeStr === 'reversed' || codeStr === 'refunded') {
    return { status: 'reversed', message: 'Transaction was reversed. Credits remain in your wallet.' };
  }
  // 800 and any unhandled errors
  return { status: 'failed', message: 'Recharge failed from provider. Please check phone number and retry.' };
}

// --------------------------------------------------------------------------
// 1. Public Marketplace Configuration
// --------------------------------------------------------------------------
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const config = await getSabussConfig();
    return res.json({
      success: true,
      marketplace: 'Airtime & Data Redeem Marketplace',
      isActive: config.isActive === 'true',
      minAmount: config.minAmount || 100,
      maxAmount: config.maxAmount || 10000,
      exchangeRate: 1, // 1 GGD Credit = ₦1 Airtime
      cloudSqlActive: isCloudSqlConfigured(),
      networks: [
        { id: 'mtn', name: 'MTN Nigeria', planId: '1', color: '#FFCC00', textColor: '#000' },
        { id: 'airtel', name: 'Airtel Nigeria', planId: '3', color: '#FF0000', textColor: '#FFF' },
        { id: 'glo', name: 'Glo (Globacom)', planId: '2', color: '#00A859', textColor: '#FFF' },
        { id: '9mobile', name: '9mobile (Etisalat)', planId: '4', color: '#00693E', textColor: '#FFF' },
      ],
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to load configuration' });
  }
});

// --------------------------------------------------------------------------
// 2. Airtime Redemption via Sabuss API (User Facing)
// --------------------------------------------------------------------------
router.post('/redeem', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      userEmail,
      network,
      phoneNumber,
      amount,
      planId: userPlanId,
    } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, error: 'User must be authenticated to redeem airtime.' });
    }

    const cleanPhone = String(phoneNumber || '').replace(/\s+/g, '').replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 14) {
      return res.status(400).json({ success: false, error: 'Please provide a valid Nigerian mobile phone number (e.g. 08012345678).' });
    }

    const numAmount = parseInt(String(amount), 10);
    if (isNaN(numAmount) || numAmount < 100) {
      return res.status(400).json({ success: false, error: 'Minimum airtime redemption is ₦100 (100 credits).' });
    }

    if (numAmount > 10000) {
      return res.status(400).json({ success: false, error: 'Maximum single airtime redemption is ₦10,000.' });
    }

    // 1 GGD Credit = ₦1 Airtime
    const creditsCost = numAmount;

    // Check user balance in Supabase
    let userCurrentCredits = 0;
    try {
      const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=credits,display_name`, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        }
      });
      if (profileRes.ok) {
        const rows = await profileRes.json();
        if (rows && rows[0]) {
          userCurrentCredits = Number(rows[0].credits) || 0;
        }
      }
    } catch (e) {
      console.warn('Balance check warning:', e);
    }

    if (userCurrentCredits < creditsCost) {
      return res.status(400).json({
        success: false,
        error: `Insufficient wallet credits! You have ${userCurrentCredits.toLocaleString()} credits, but ₦${numAmount.toLocaleString()} airtime requires ${creditsCost.toLocaleString()} credits.`,
        currentCredits: userCurrentCredits,
        requiredCredits: creditsCost,
      });
    }

    // Get active Sabuss config from Cloud SQL
    const config = await getSabussConfig();
    const apiKey = config.apiKey || process.env.SABUSS_API_KEY || DEFAULT_SABUSS_API_KEY;
    const apiPin = config.apiPin || '0000';
    const planId = resolveNetworkPlanId(network, userPlanId);
    const reference = `GGD_VTU_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const redemptionId = `airtime_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const nowIso = new Date().toISOString();

    // Prepare pending redemption record
    const record: AirtimeRedemptionRecord = {
      id: redemptionId,
      userId,
      userEmail: userEmail || null,
      network: network || 'MTN',
      planId,
      phoneNumber: cleanPhone,
      amountNgn: numAmount,
      creditsDeducted: creditsCost,
      reference,
      status: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Save pending record in Cloud SQL
    await recordAirtimeRedemption(record);

    // Call Sabuss VTU API
    const sabussUrl = `https://sabuss.com/vtu/api/buy/${encodeURIComponent(apiKey)}`;
    const postPayload = {
      pin: apiPin,
      plan_id: planId,
      phone: cleanPhone,
      amount: numAmount,
      reference: reference,
    };

    let apiRawResult: any = null;
    let statusCodeReceived: string = '400';

    try {
      const sabussRes = await fetch(sabussUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(postPayload),
      });

      const responseText = await sabussRes.text();
      try {
        apiRawResult = JSON.parse(responseText);
      } catch {
        apiRawResult = { raw: responseText };
      }

      // Resolve status code: Sabuss returns status / code / status_code
      statusCodeReceived = String(
        apiRawResult?.code ||
        apiRawResult?.status ||
        apiRawResult?.status_code ||
        (sabussRes.ok ? '200' : '800')
      );
    } catch (apiErr: any) {
      console.warn('[Sabuss VTU Request Failed]:', apiErr?.message || apiErr);
      statusCodeReceived = '800';
      apiRawResult = { error: apiErr?.message || 'Network connectivity error to Sabuss gateway' };
    }

    const { status, message } = mapSabussStatusCode(statusCodeReceived);

    // Deduct credits only if success (200) or pending (400)
    let newBalance = userCurrentCredits;
    if (status === 'success' || status === 'pending') {
      newBalance = Math.max(0, userCurrentCredits - creditsCost);
      try {
        await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ credits: newBalance }),
        });

        // Insert notification to user
        await fetch(`${supabaseUrl}/rest/v1/notifications`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            title: status === 'success' ? `🎉 ₦${numAmount.toLocaleString()} Airtime Recharged!` : `⏳ ₦${numAmount.toLocaleString()} Airtime Processing`,
            message: `Your ${network.toUpperCase()} line ${cleanPhone} was queued for ₦${numAmount.toLocaleString()} airtime using ${creditsCost} GGD credits. Ref: ${reference}`,
            type: 'airtime_redemption',
            link_url: '/redeem',
            nav_target: 'wallet',
          }),
        });
      } catch (deductErr) {
        console.warn('Credits deduction error note:', deductErr);
      }
    }

    // Update redemption record with final outcome in Cloud SQL
    await updateAirtimeRedemption(redemptionId, {
      apiStatusCode: statusCodeReceived,
      status: status,
      apiResponse: JSON.stringify(apiRawResult),
    });

    return res.json({
      success: status === 'success' || status === 'pending',
      status: status,
      statusCode: statusCodeReceived,
      message: message,
      reference: reference,
      amountNgn: numAmount,
      creditsDeducted: (status === 'success' || status === 'pending') ? creditsCost : 0,
      remainingCredits: newBalance,
      details: {
        network,
        phoneNumber: cleanPhone,
        apiStatusCode: statusCodeReceived,
      },
    });
  } catch (err: any) {
    console.error('Airtime redeem error:', err);
    return res.status(500).json({
      success: false,
      status: 'failed',
      statusCode: '800',
      error: err?.message || 'Unexpected server error while processing airtime redemption',
    });
  }
});

// --------------------------------------------------------------------------
// 3. User History
// --------------------------------------------------------------------------
router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    const history = await getUserAirtimeRedemptions(userId);
    return res.json({ success: true, history });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch history' });
  }
});

// --------------------------------------------------------------------------
// 4. Admin Management (Cloud SQL API Key & Settings)
// --------------------------------------------------------------------------
router.get('/admin/config', async (_req: Request, res: Response) => {
  try {
    const config = await getSabussConfig();
    const hasKey = Boolean(config.apiKey && config.apiKey.length > 10);
    const keySnippet = hasKey ? `${config.apiKey.slice(0, 6)}...${config.apiKey.slice(-4)}` : 'Not configured';

    return res.json({
      success: true,
      config: {
        ...config,
        hasKey,
        keySnippet,
      },
      cloudSqlActive: isCloudSqlConfigured(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to read admin configuration' });
  }
});

router.post('/admin/config', async (req: Request, res: Response) => {
  try {
    const { apiKey, apiPin, isActive, minAmount, maxAmount, environment } = req.body || {};
    const updated = await saveSabussConfig({
      apiKey,
      apiPin,
      isActive,
      minAmount: typeof minAmount === 'number' ? minAmount : undefined,
      maxAmount: typeof maxAmount === 'number' ? maxAmount : undefined,
      environment,
    });

    return res.json({
      success: true,
      message: 'Sabuss VTU configuration updated and persisted to Cloud SQL.',
      config: {
        ...updated,
        hasKey: Boolean(updated.apiKey && updated.apiKey.length > 10),
        keySnippet: `${updated.apiKey.slice(0, 6)}...${updated.apiKey.slice(-4)}`,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to update admin configuration' });
  }
});

router.get('/admin/redemptions', async (_req: Request, res: Response) => {
  try {
    const redemptions = await getAllAirtimeRedemptions();
    return res.json({ success: true, redemptions });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch all redemptions' });
  }
});

router.post('/admin/test', async (req: Request, res: Response) => {
  try {
    const config = await getSabussConfig();
    const key = req.body?.apiKey || config.apiKey || process.env.SABUSS_API_KEY || DEFAULT_SABUSS_API_KEY;

    let reachable = false;
    let details = '';
    try {
      const testRes = await fetch(`https://sabuss.com/vtu/api/buy/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: config.apiPin || '0000',
          plan_id: '1',
          phone: '08000000000',
          amount: 100,
          reference: `TEST_${Date.now()}`,
        }),
      });
      const data = await testRes.text();
      reachable = true;
      details = data.slice(0, 200);
    } catch (e: any) {
      details = e?.message || 'Connection failed';
    }

    return res.json({
      success: true,
      reachable,
      details,
      keySnippet: `${key.slice(0, 6)}...${key.slice(-4)}`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Test failed' });
  }
});

// --------------------------------------------------------------------------
// 5. Health Check
// --------------------------------------------------------------------------
router.get('/health', (_req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    service: 'Sabuss VTU Airtime Engine',
    cloudSqlActive: isCloudSqlConfigured(),
    timestamp: new Date().toISOString()
  });
});

export function registerAirtimeRoutes(app: any) {
  app.use('/api/airtime', router);
  app.use('/api/admin/airtime', router);
}

export default router;
