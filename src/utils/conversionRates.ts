import { supabase } from "@/integrations/supabase/client";

export interface ConversionRates {
  nairaPerGgg: number;   // 1 GGG = ₦0.48
  gggPerEco: number;     // 125 GGG = 1 ECO
  nairaPerEco: number;   // 1 ECO = ₦60
  minRedeemGgg: number;
}

export const DEFAULT_RATES: ConversionRates = { nairaPerGgg: 0.48, gggPerEco: 125, nairaPerEco: 60, minRedeemGgg: 125 };

const pos = (v: unknown, d: number) => { const n = parseFloat(String(v ?? "")); return Number.isFinite(n) && n > 0 ? n : d; };

let cache: Promise<ConversionRates> | null = null;
export function getConversionRates(force = false): Promise<ConversionRates> {
  if (!cache || force) {
    cache = (async () => {
      const { data } = await supabase.from("app_settings").select("key,value")
        .in("key", ["credit_exchange_rate", "eco_ggg_redemption_rate", "eco_naira_rate", "eco_min_redemption_ggg"]);
      const m = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
      return {
        nairaPerGgg: pos(m.credit_exchange_rate, DEFAULT_RATES.nairaPerGgg),
        gggPerEco: pos(m.eco_ggg_redemption_rate, DEFAULT_RATES.gggPerEco),
        nairaPerEco: pos(m.eco_naira_rate, DEFAULT_RATES.nairaPerEco),
        minRedeemGgg: pos(m.eco_min_redemption_ggg, DEFAULT_RATES.minRedeemGgg),
      };
    })().catch(() => DEFAULT_RATES);
  }
  return cache;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
export const gggToNaira = (ggg: number, r = DEFAULT_RATES) => round2(ggg * r.nairaPerGgg);
export const gggToEco = (ggg: number, r = DEFAULT_RATES) => Math.round((ggg / r.gggPerEco) * 10000) / 10000;
export const ecoToNaira = (eco: number, r = DEFAULT_RATES) => round2(eco * r.nairaPerEco);
export const nairaToGgg = (naira: number, r = DEFAULT_RATES) => Math.floor(round2(naira / r.nairaPerGgg));

export const formatNaira = (n: number) => `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const formatEco = (e: number) => `${e.toLocaleString("en-NG", { maximumFractionDigits: 2 })} ECO`;
