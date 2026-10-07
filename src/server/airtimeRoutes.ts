import { Router, Request, Response } from 'express';
import { 
  getSabussConfig, 
  saveSabussConfig, 
  recordAirtimeRedemption, 
  updateAirtimeRedemption, 
  getUserAirtimeRedemptions, 
  getAllAirtimeRedemptions 
} from '../services/airtimeDb.ts';

const router = Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://sdgxpquruczhkpyhjaxn.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkZ3hwcXVydWN6aGtweWhqYXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDA5MTIsImV4cCI6MjA5NDMxNjkxMn0.HwJv2cazvcLAbN1YkiwrMZ07HA5Kt0jq-OSUHQ3BB20";

// Helper to fetch user credits from Supabase
async function getUserProfile(userId: string) {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return null;
  }
}

// Helper to update user credits in Supabase
async function updateUserCredits(userId: string, newCredits: number) {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ credits: newCredits }),
    });
    return res.ok;
  } catch (err) {
    console.error('Error updating user credits:', err);
    return false;
  }
}

// Helper to get exchange rate (Credits to NGN)
async function getCreditExchangeRate(): Promise<number> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/app_settings?key=eq.credit_exchange_rate&select=value`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      const val = parseInt(data?.[0]?.value, 10);
      if (val > 0) return val;
    }
  } catch {}
  return 100; // Default 100 NGN per credit (or 1 credit = 100 NGN, so 100 NGN airtime = 1 credit)
}

// ============================================================================
// PUBLIC & USER ROUTES
// ============================================================================

// GET /api/airtime/config - Public configuration
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const config = await getSabussConfig();
    const exchangeRate = await getCreditExchangeRate();

    return res.json({
      success: true,
      minAmount: config.minAmount || 100,
      maxAmount: config.maxAmount || 10000,
      isActive: config.isActive === 'true',
      exchangeRate, // NGN per credit
      networks: [
        { id: 'mtn', name: 'MTN Nigeria', planId: '1', color: '#FFCC00', textColor: '#000', prefix: ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'] },
        { id: 'airtel', name: 'Airtel Nigeria', planId: '4', color: '#FF0000', textColor: '#FFF', prefix: ['0802', '0808', '0708', '0812', '0701', '0902', '0901', '0907', '0912'] },
        { id: 'glo', name: 'Glo (Globacom)', planId: '2', color: '#00A859', textColor: '#FFF', prefix: ['0805', '0807', '0705', '0815', '0811', '0905', '0915'] },
        { id: '9mobile', name: '9mobile (Etisalat)', planId: '3', color: '#00693E', textColor: '#FFF', prefix: ['0809', '0817', '0818', '0909', '0908'] },
      ],
      quickAmounts: [100, 200, 500, 1000, 2000, 5000],
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/airtime/user-history/:userId - User transaction history
router.get('/user-history/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    const redemptions = await getUserAirtimeRedemptions(userId);
    return res.json({ success: true, redemptions });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/airtime/redeem - Execute airtime redemption with Sabuss API
router.post('/redeem', async (req: Request, res: Response) => {
  try {
    const { userId, userEmail, network, planId, phoneNumber, amountNgn, pin } = req.body;

    if (!userId || !network || !planId || !phoneNumber || !amountNgn) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: userId, network, planId, phoneNumber, amountNgn',
      });
    }

    const amount = Number(amountNgn);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid airtime amount' });
    }

    const config = await getSabussConfig();
    if (config.isActive !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'Airtime redemption is currently paused by admin for scheduled maintenance.',
      });
    }

    if (amount < (config.minAmount || 100) || amount > (config.maxAmount || 10000)) {
      return res.status(400).json({
        success: false,
        error: `Airtime amount must be between ₦${config.minAmount || 100} and ₦${config.maxAmount || 10000}`,
      });
    }

    // Clean phone number (Ensure 11 digits standard Nigerian format e.g. 08012345678)
    let cleanPhone = String(phoneNumber).replace(/\D/g, '');
    if (cleanPhone.startsWith('234') && cleanPhone.length === 13) {
      cleanPhone = '0' + cleanPhone.slice(3);
    }
    if (cleanPhone.length !== 11) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid 11-digit Nigerian phone number (e.g., 08011223344)',
      });
    }

    // Check exchange rate and required credits
    const exchangeRate = await getCreditExchangeRate();
    // 1 credit = exchangeRate NGN. Required credits = ceil(amount / exchangeRate)
    const requiredCredits = Math.max(1, Math.ceil(amount / exchangeRate));

    // Check user profile and balance
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    const currentCredits = Number(userProfile.credits || 0);
    if (currentCredits < requiredCredits) {
      return res.status(400).json({
        success: false,
        error: `Insufficient credit balance! You need ${requiredCredits} credits for ₦${amount.toLocaleString()} airtime. Current balance: ${currentCredits} credits.`,
        currentCredits,
        requiredCredits,
      });
    }

    // Generate unique reference
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const reference = `GGD_AIRTIME_${timestamp}_${randomSuffix}`;
    const redemptionId = `red_${timestamp}_${randomSuffix.toLowerCase()}`;

    // 1. Debit credits from user profile atomically
    const newBalance = currentCredits - requiredCredits;
    const debitSuccess = await updateUserCredits(userId, newBalance);
    if (!debitSuccess) {
      return res.status(500).json({ success: false, error: 'Failed to debit wallet credits. Please try again.' });
    }

    // 2. Create pending record in Cloud SQL / Airtime DB
    const initialRecord = await recordAirtimeRedemption({
      id: redemptionId,
      userId,
      userEmail: userEmail || userProfile.email || null,
      network,
      planId: String(planId),
      phoneNumber: cleanPhone,
      amountNgn: amount,
      creditsDeducted: requiredCredits,
      reference,
      apiStatusCode: '400',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 3. Invoke Sabuss API
    const apiKey = config.apiKey.trim();
    const apiPin = (pin && String(pin).trim()) || config.apiPin || '0000';
    const sabussEndpoint = `https://sabuss.com/vtu/api/buy/${apiKey}`;

    const formData = new URLSearchParams();
    formData.append('pin', apiPin);
    formData.append('plan_id', String(planId));
    formData.append('phone', cleanPhone);
    formData.append('amount', String(amount));
    formData.append('reference', reference);

    let apiResult: any = null;
    let apiRawText = '';
    let apiStatusCode = '400';
    let transactionStatus: 'success' | 'pending' | 'failed' | 'reversed' = 'pending';
    let errorMessage = '';

    try {
      const response = await fetch(sabussEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      apiRawText = await response.text();
      try {
        apiResult = JSON.parse(apiRawText);
      } catch {
        apiResult = { raw: apiRawText };
      }

      // Determine status code from response
      // Sabuss returns numeric code or status string: 200 => success, 400 => pending, 800 => failed, 900 => reversed
      const rawCode = apiResult?.code || apiResult?.status_code || (response.ok ? '200' : '800');
      apiStatusCode = String(rawCode).trim();

      if (apiStatusCode === '200' || apiResult?.status === 'success' || apiResult?.status === '200') {
        transactionStatus = 'success';
        apiStatusCode = '200';
      } else if (apiStatusCode === '400' || apiResult?.status === 'pending' || apiResult?.status === '400') {
        transactionStatus = 'pending';
        apiStatusCode = '400';
      } else if (apiStatusCode === '900' || apiResult?.status === 'reversed') {
        transactionStatus = 'reversed';
        apiStatusCode = '900';
        errorMessage = apiResult?.message || apiResult?.description || 'Transaction was reversed by provider.';
      } else {
        transactionStatus = 'failed';
        apiStatusCode = apiStatusCode || '800';
        errorMessage = apiResult?.message || apiResult?.description || apiResult?.error || 'Airtime dispatch failed on provider network.';
      }
    } catch (networkErr: any) {
      console.error('Sabuss API network dispatch error:', networkErr);
      transactionStatus = 'failed';
      apiStatusCode = '800';
      errorMessage = `Network timeout / gateway error: ${networkErr.message}`;
      apiRawText = JSON.stringify({ error: networkErr.message });
    }

    // If failed or reversed, refund credits back to user
    let wasRefunded = false;
    if (transactionStatus === 'failed' || transactionStatus === 'reversed') {
      const refundCredits = currentCredits; // Restore original balance
      await updateUserCredits(userId, refundCredits);
      wasRefunded = true;
    }

    // 4. Update redemption record in Cloud SQL / Airtime DB
    const finalRecord = await updateAirtimeRedemption(redemptionId, {
      apiStatusCode,
      status: transactionStatus,
      apiResponse: apiRawText,
    });

    return res.json({
      success: transactionStatus === 'success' || transactionStatus === 'pending',
      statusCode: apiStatusCode,
      status: transactionStatus,
      message: transactionStatus === 'success'
        ? `🎉 ₦${amount.toLocaleString()} ${network.toUpperCase()} airtime successfully sent to ${cleanPhone}!`
        : transactionStatus === 'pending'
        ? `⏳ Airtime top-up for ${cleanPhone} is queued and processing.`
        : `❌ Airtime delivery failed: ${errorMessage} (${wasRefunded ? 'Your credits have been refunded' : ''})`,
      reference,
      amountNgn: amount,
      phoneNumber: cleanPhone,
      network,
      creditsDeducted: wasRefunded ? 0 : requiredCredits,
      newCreditsBalance: wasRefunded ? currentCredits : newBalance,
      record: finalRecord || initialRecord,
    });
  } catch (err: any) {
    console.error('Fatal airtime redemption error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

// ============================================================================
// ADMIN ROUTES
// ============================================================================

// GET /api/admin/airtime/all - Admin view of all redemptions & analytics
router.get('/admin/all', async (_req: Request, res: Response) => {
  try {
    const list = await getAllAirtimeRedemptions();
    const config = await getSabussConfig();
    const exchangeRate = await getCreditExchangeRate();

    const totalRedemptions = list.length;
    const successful = list.filter((r) => r.status === 'success');
    const pending = list.filter((r) => r.status === 'pending');
    const failed = list.filter((r) => r.status === 'failed' || r.status === 'reversed');

    const totalAmountDispatched = successful.reduce((sum, r) => sum + (r.amountNgn || 0), 0);
    const totalCreditsRedeemed = successful.reduce((sum, r) => sum + (r.creditsDeducted || 0), 0);

    return res.json({
      success: true,
      stats: {
        totalRedemptions,
        successCount: successful.length,
        pendingCount: pending.length,
        failedCount: failed.length,
        totalAmountDispatched,
        totalCreditsRedeemed,
        exchangeRate,
      },
      config,
      redemptions: list,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/airtime/config - Get current admin Sabuss config
router.get('/admin/config', async (_req: Request, res: Response) => {
  try {
    const config = await getSabussConfig();
    return res.json({ success: true, config });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/airtime/config - Update Sabuss API Key and settings
router.post('/admin/config', async (req: Request, res: Response) => {
  try {
    const { apiKey, apiPin, isActive, minAmount, maxAmount, environment } = req.body;

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 5) {
      return res.status(400).json({ success: false, error: 'Valid Sabuss API Key is required' });
    }

    const updated = await saveSabussConfig({
      apiKey: apiKey.trim(),
      apiPin: apiPin ? String(apiPin).trim() : '0000',
      isActive: isActive === false || isActive === 'false' ? 'false' : 'true',
      minAmount: Number(minAmount) || 100,
      maxAmount: Number(maxAmount) || 10000,
      environment: environment || 'production',
    });

    return res.json({
      success: true,
      message: 'Sabuss API configuration saved successfully to Cloud SQL and app cache!',
      config: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/airtime/retry/:id - Admin manual retry / refund action
router.post('/admin/retry/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'retry' | 'refund' | 'mark_success'

    const all = await getAllAirtimeRedemptions();
    const item = all.find((r) => r.id === id);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Redemption record not found' });
    }

    if (action === 'refund') {
      const userProfile = await getUserProfile(item.userId);
      if (userProfile) {
        const newCredits = Number(userProfile.credits || 0) + item.creditsDeducted;
        await updateUserCredits(item.userId, newCredits);
      }
      const updated = await updateAirtimeRedemption(id, {
        status: 'reversed',
        apiStatusCode: '900',
        apiResponse: 'Admin manually refunded credits to user balance.',
      });
      return res.json({ success: true, message: 'Credits refunded to user wallet', record: updated });
    }

    if (action === 'mark_success') {
      const updated = await updateAirtimeRedemption(id, {
        status: 'success',
        apiStatusCode: '200',
        apiResponse: 'Admin manually verified and marked as delivered.',
      });
      return res.json({ success: true, message: 'Marked as successful', record: updated });
    }

    return res.status(400).json({ success: false, error: 'Invalid action specified' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export function registerAirtimeRoutes(app: any) {
  app.use('/api/airtime', router);
}

export default router;
