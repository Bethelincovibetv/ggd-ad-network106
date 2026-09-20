export interface NigerianBank {
  name: string;
  code: string;
  slug: string;
}

// Comprehensive, verified list of popular Nigerian banks with accurate Paystack NUBAN resolution codes
export const POPULAR_NIGERIAN_BANKS: NigerianBank[] = [
  { name: 'Access Bank', code: '044', slug: 'access-bank' },
  { name: 'Access Bank (Diamond)', code: '063', slug: 'access-bank-diamond' },
  { name: 'ALAT by WEMA', code: '035A', slug: 'alat-by-wema' },
  { name: 'Carbon', code: '565', slug: 'carbon' },
  { name: 'Citibank Nigeria', code: '023', slug: 'citibank-nigeria' },
  { name: 'Dot Microfinance Bank', code: '50162', slug: 'dot-microfinance-bank-ng' },
  { name: 'Ecobank Nigeria', code: '050', slug: 'ecobank-nigeria' },
  { name: 'FairMoney Microfinance Bank', code: '51318', slug: 'fairmoney-microfinance-bank-ng' },
  { name: 'Fidelity Bank', code: '070', slug: 'fidelity-bank' },
  { name: 'First Bank of Nigeria', code: '011', slug: 'first-bank-of-nigeria' },
  { name: 'First City Monument Bank (FCMB)', code: '214', slug: 'first-city-monument-bank' },
  { name: 'Globus Bank', code: '103', slug: 'globus-bank' },
  { name: 'GoMoney', code: '100022', slug: 'gomoney' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058', slug: 'guaranty-trust-bank' },
  { name: 'Heritage Bank', code: '030', slug: 'heritage-bank' },
  { name: 'Jaiz Bank', code: '301', slug: 'jaiz-bank' },
  { name: 'Keystone Bank', code: '082', slug: 'keystone-bank' },
  { name: 'Kuda Bank', code: '50211', slug: 'kuda-bank' },
  { name: 'Lotus Bank', code: '303', slug: 'lotus-bank' },
  { name: 'Moniepoint MFB', code: '50515', slug: 'moniepoint-mfb-ng' },
  { name: 'Nova Merchant Bank', code: '561', slug: 'nova-merchant-bank' },
  { name: 'OPay Digital Services (Paycom)', code: '999992', slug: 'paycom' },
  { name: 'Optimus Bank', code: '107', slug: 'optimus-bank' },
  { name: 'PalmPay', code: '999991', slug: 'palmpay' },
  { name: 'Parallex Bank', code: '104', slug: 'parallex-bank' },
  { name: 'Polaris Bank', code: '076', slug: 'polaris-bank' },
  { name: 'PremiumTrust Bank', code: '105', slug: 'premiumtrust-bank' },
  { name: 'Providus Bank', code: '101', slug: 'providus-bank' },
  { name: 'Raven Bank', code: '51204', slug: 'raven-bank' },
  { name: 'Rubies MFB', code: '125', slug: 'rubies-mfb' },
  { name: 'Signature Bank', code: '106', slug: 'signature-bank' },
  { name: 'Stanbic IBTC Bank', code: '221', slug: 'stanbic-ibtc-bank' },
  { name: 'Standard Chartered Bank', code: '068', slug: 'standard-chartered-bank' },
  { name: 'Sterling Bank', code: '232', slug: 'sterling-bank' },
  { name: 'Suntrust Bank', code: '100', slug: 'suntrust-bank' },
  { name: 'TAJ Bank', code: '302', slug: 'taj-bank' },
  { name: 'Tangerine Money', code: '51269', slug: 'tangerine-money' },
  { name: 'Titan Bank / Titan Trust', code: '102', slug: 'titan-trust-bank' },
  { name: 'Union Bank of Nigeria', code: '032', slug: 'union-bank-of-nigeria' },
  { name: 'United Bank for Africa (UBA)', code: '033', slug: 'united-bank-for-africa' },
  { name: 'Unity Bank', code: '215', slug: 'unity-bank' },
  { name: 'VFD Microfinance Bank', code: '566', slug: 'vfd' },
  { name: 'Wema Bank', code: '035', slug: 'wema-bank' },
  { name: 'Zenith Bank', code: '057', slug: 'zenith-bank' },
];

let cachedBanks: NigerianBank[] | null = null;

/**
 * Dynamically fetches all live Nigerian banks from Paystack with in-memory caching
 * and fallback to POPULAR_NIGERIAN_BANKS.
 */
export async function fetchNigerianBanks(): Promise<NigerianBank[]> {
  if (cachedBanks && cachedBanks.length > 0) {
    return cachedBanks;
  }

  try {
    const res = await fetch('/api/paystack/banks');
    if (res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data?.banks) && data.banks.length > 0) {
        // Map and sort alphabetically
        const dynamicList: NigerianBank[] = data.banks.map((b: any) => ({
          name: b.name,
          code: String(b.code),
          slug: b.slug || b.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        }));

        // Put popular banks first, then remaining sorted alphabetically
        const popularCodes = new Set(POPULAR_NIGERIAN_BANKS.map(p => p.code));
        const popularInList = POPULAR_NIGERIAN_BANKS.filter(p => dynamicList.some(d => d.code === p.code));
        const others = dynamicList.filter(d => !popularCodes.has(d.code)).sort((a, b) => a.name.localeCompare(b.name));

        cachedBanks = [...popularInList, ...others];
        return cachedBanks;
      }
    }
  } catch (err) {
    console.warn('Could not fetch dynamic bank list, using local directory:', err);
  }

  cachedBanks = POPULAR_NIGERIAN_BANKS;
  return cachedBanks;
}

export function findBankCode(bankName: string): string | null {
  if (!bankName) return null;
  const normalized = bankName.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

  // 1. Direct code match if already numeric
  if (/^\d+$/.test(normalized)) {
    return normalized;
  }

  // Common fintech & digital bank alias mapping
  if (normalized.includes('kuda')) return '50211';
  if (normalized.includes('moniepoint')) return '50515';
  if (normalized.includes('opay') || normalized.includes('paycom')) return '999992';
  if (normalized.includes('palmpay')) return '999991';
  if (normalized.includes('alat') || normalized.includes('035a')) return '035A';
  if (normalized.includes('carbon')) return '565';
  if (normalized.includes('dot microfinance') || normalized.includes('dot mfb') || normalized === 'dot') return '50162';
  if (normalized.includes('fairmoney')) return '51318';
  if (normalized.includes('gomoney')) return '100022';
  if (normalized.includes('raven')) return '51204';
  if (normalized.includes('rubies')) return '125';
  if (normalized.includes('vfd')) return '566';
  if (normalized.includes('gtb') || normalized.includes('guaranty')) return '058';
  if (normalized.includes('zenith')) return '057';
  if (normalized.includes('diamond')) return '063';
  if (normalized.includes('access')) return '044';
  if (normalized.includes('uba') || normalized.includes('united bank')) return '033';
  if (normalized.includes('first bank') && !normalized.includes('monument')) return '011';
  if (normalized.includes('fcmb') || normalized.includes('monument')) return '214';
  if (normalized.includes('stanbic')) return '221';
  if (normalized.includes('sterling')) return '232';
  if (normalized.includes('providus')) return '101';
  if (normalized.includes('polaris')) return '076';
  if (normalized.includes('wema')) return '035';
  if (normalized.includes('unity')) return '215';
  if (normalized.includes('union')) return '032';
  if (normalized.includes('keystone')) return '082';
  if (normalized.includes('ecobank')) return '050';
  if (normalized.includes('jaiz')) return '301';
  if (normalized.includes('taj')) return '302';
  if (normalized.includes('lotus')) return '303';
  if (normalized.includes('titan')) return '102';
  if (normalized.includes('globus')) return '103';
  if (normalized.includes('parallex')) return '104';
  if (normalized.includes('premium')) return '105';
  if (normalized.includes('signature')) return '106';
  if (normalized.includes('optimus')) return '107';

  const list = cachedBanks || POPULAR_NIGERIAN_BANKS;
  const direct = list.find(b => b.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim() === normalized);
  if (direct) return direct.code;

  const partial = list.find(b => {
    const bNorm = b.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    return bNorm.includes(normalized) || normalized.includes(bNorm);
  });
  return partial ? partial.code : null;
}
