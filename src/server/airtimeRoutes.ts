import { Router, Request, Response } from 'express';

const router = Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://sdgxpquruczhkpyhjaxn.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkZ3hwcXVydWN6aGtweWhqYXhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NDA5MTIsImV4cCI6MjA5NDMxNjkxMn0.HwJv2cazvcLAbN1YkiwrMZ07HA5Kt0jq-OSUHQ3BB20";

// Public marketplace configuration
router.get('/config', async (_req: Request, res: Response) => {
  return res.json({
    success: true,
    marketplace: 'Airtime & Data Redeem Marketplace',
    isActive: true,
    exchangeRate: 100,
    networks: [
      { id: 'mtn', name: 'MTN Nigeria', color: '#FFCC00', textColor: '#000' },
      { id: 'airtel', name: 'Airtel Nigeria', color: '#FF0000', textColor: '#FFF' },
      { id: 'glo', name: 'Glo (Globacom)', color: '#00A859', textColor: '#FFF' },
      { id: '9mobile', name: '9mobile (Etisalat)', color: '#00693E', textColor: '#FFF' },
    ],
  });
});

// Admin config status
router.get('/admin/config', async (_req: Request, res: Response) => {
  return res.json({
    success: true,
    marketplace: 'Airtime & Data Redeem Marketplace',
    mode: 'credit_gated_marketplace',
    isActive: true,
  });
});

// Health check / diagnostic
router.get('/health', (_req: Request, res: Response) => {
  return res.json({ status: 'ok', service: 'Airtime & Data Marketplace' });
});

export function registerAirtimeRoutes(app: any) {
  app.use('/api/airtime', router);
  app.use('/api/admin/airtime', router);
}

export default router;
