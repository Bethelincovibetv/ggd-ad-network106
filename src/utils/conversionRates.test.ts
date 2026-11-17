import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { gggToNaira, gggToEco, ecoToNaira, nairaToGgg } from "./conversionRates";

describe("official GGG/ECO rates", () => {
  it("1 GGG = ₦0.48", () => expect(gggToNaira(1)).toBe(0.48));
  it("125 GGG = 1 ECO", () => expect(gggToEco(125)).toBe(1));
  it("1 ECO = ₦60", () => expect(ecoToNaira(1)).toBe(60));
  it("125 GGG = ₦60", () => expect(gggToNaira(125)).toBe(60));
  it("₦1,000 buys 2083 GGG", () => expect(nairaToGgg(1000)).toBe(2083));
  it("₦60 buys exactly 125 GGG", () => expect(nairaToGgg(60)).toBe(125));
});
