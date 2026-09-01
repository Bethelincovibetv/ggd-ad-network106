export interface NigerianBank {
  name: string;
  code: string;
  slug: string;
}

export const POPULAR_NIGERIAN_BANKS: NigerianBank[] = [
  { name: 'Access Bank', code: '044', slug: 'access-bank' },
  { name: 'Access Bank (Diamond)', code: '063', slug: 'access-bank-diamond' },
  { name: 'Ecobank Nigeria', code: '050', slug: 'ecobank-nigeria' },
  { name: 'Fidelity Bank', code: '070', slug: 'fidelity-bank' },
  { name: 'First Bank of Nigeria', code: '011', slug: 'first-bank-of-nigeria' },
  { name: 'First City Monument Bank (FCMB)', code: '214', slug: 'first-city-monument-bank' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058', slug: 'guaranty-trust-bank' },
  { name: 'Heritage Bank', code: '030', slug: 'heritage-bank' },
  { name: 'Jaiz Bank', code: '301', slug: 'jaiz-bank' },
  { name: 'Keystone Bank', code: '082', slug: 'keystone-bank' },
  { name: 'Kuda Microfinance Bank', code: '090110', slug: 'kuda-bank' },
  { name: 'Moniepoint MFB', code: '090405', slug: 'moniepoint-mfb' },
  { name: 'OPay Digital Services', code: '999992', slug: 'opay' },
  { name: 'PalmPay', code: '999991', slug: 'palmpay' },
  { name: 'Polaris Bank', code: '076', slug: 'polaris-bank' },
  { name: 'Providus Bank', code: '101', slug: 'providus-bank' },
  { name: 'Stanbic IBTC Bank', code: '221', slug: 'stanbic-ibtc-bank' },
  { name: 'Standard Chartered Bank', code: '068', slug: 'standard-chartered-bank' },
  { name: 'Sterling Bank', code: '232', slug: 'sterling-bank' },
  { name: 'TAJ Bank', code: '302', slug: 'taj-bank' },
  { name: 'Titan Trust Bank', code: '102', slug: 'titan-trust-bank' },
  { name: 'Union Bank of Nigeria', code: '032', slug: 'union-bank-of-nigeria' },
  { name: 'United Bank for Africa (UBA)', code: '033', slug: 'united-bank-for-africa' },
  { name: 'Unity Bank', code: '215', slug: 'unity-bank' },
  { name: 'VFD Microfinance Bank', code: '566', slug: 'vfd' },
  { name: 'Wema Bank', code: '035', slug: 'wema-bank' },
  { name: 'Zenith Bank', code: '057', slug: 'zenith-bank' },
];

export function findBankCode(bankName: string): string | null {
  if (!bankName) return null;
  const normalized = bankName.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const direct = POPULAR_NIGERIAN_BANKS.find(b => b.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim() === normalized);
  if (direct) return direct.code;
  const partial = POPULAR_NIGERIAN_BANKS.find(b => {
    const bNorm = b.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    return bNorm.includes(normalized) || normalized.includes(bNorm);
  });
  return partial ? partial.code : null;
}
