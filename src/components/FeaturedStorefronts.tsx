import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, MapPin, Share2, BadgeCheck } from "lucide-react";
import GuestGateModal from "./GuestGateModal";

interface Props {
  onRequireAuth: () => void;
}

interface FeaturedBiz {
  user_id: string;
  business_name: string | null;
  business_slug: string | null;
  business_logo_url: string | null;
  business_category: string | null;
  business_state: string | null;
  business_city: string | null;
  verified?: boolean;
  products: { id: string; title: string; image_url: string | null }[];
}

/** Public landing-page section: "Explore Active Business Storefronts & Products".
 *  Renders real featured businesses + a small gallery of their top products.
 *  Guests cannot see tracking data — every card click / share button triggers the
 *  GuestGateModal to nudge them into signing up.
 */
const FeaturedStorefronts: React.FC<Props> = ({ onRequireAuth }) => {
  const [items, setItems] = useState<FeaturedBiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [gateOpen, setGateOpen] = useState(false);

  useEffect(() => {
    (async () => {
      // Pull up to 8 businesses with a logo + business_name
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, business_name, business_slug, business_logo_url, business_category, business_state, business_city")
        .not("business_name", "is", null)
        .not("business_logo_url", "is", null)
        .order("updated_at", { ascending: false })
        .limit(8);

      const list: FeaturedBiz[] = [];
      for (const p of profiles || []) {
        const { data: listings } = await supabase
          .from("business_listings")
          .select("id, title, image_url")
          .eq("user_id", p.user_id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(3);
        if ((listings || []).length === 0) continue;
        list.push({ ...(p as any), products: listings || [] });
        if (list.length >= 6) break;
      }
      setItems(list);
      setLoading(false);
    })();
  }, []);

  const gate = () => setGateOpen(true);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <section className="py-14 px-4 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs font-bold mb-3">
            <Store className="h-3.5 w-3.5" /> LIVE ON GGD NETWORK
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white">
            Explore Active Business Storefronts & Products
          </h2>
          <p className="text-gray-400 mt-2 max-w-2xl mx-auto text-sm md:text-base">
            Real businesses selling to real customers on GGD Ad Network right now.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((biz) => (
            <Card
              key={biz.user_id}
              onClick={gate}
              className="cursor-pointer group overflow-hidden bg-gray-900/70 border-white/10 hover:border-orange-500/50 hover:-translate-y-1 transition-all"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl overflow-hidden bg-orange-500/10 flex-shrink-0">
                    {biz.business_logo_url ? (
                      <img src={biz.business_logo_url} alt={biz.business_name || ""} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Store className="h-6 w-6 text-orange-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <h3 className="font-bold text-white text-sm truncate">{biz.business_name}</h3>
                      <BadgeCheck className="h-4 w-4 text-blue-400 flex-shrink-0" />
                    </div>
                    {biz.business_category && (
                      <Badge variant="outline" className="text-[9px] mt-0.5 border-orange-500/30 text-orange-300">
                        {biz.business_category}
                      </Badge>
                    )}
                  </div>
                </div>

                {(biz.business_city || biz.business_state) && (
                  <div className="flex items-center gap-1 mt-2 text-[11px] text-gray-400">
                    <MapPin className="h-3 w-3" />
                    {[biz.business_city, biz.business_state, "NG"].filter(Boolean).join(", ")}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-1.5 mt-3">
                  {biz.products.slice(0, 3).map((p) => (
                    <div key={p.id} className="aspect-square rounded-lg overflow-hidden bg-gray-800">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[9px] text-gray-500 text-center p-1">
                          {p.title}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  onClick={(e) => { e.stopPropagation(); gate(); }}
                  className="w-full mt-3 h-10 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-xs font-bold"
                >
                  <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share this Flyer & Earn
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <GuestGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        onRegister={() => { setGateOpen(false); onRequireAuth(); }}
      />
    </section>
  );
};

export default FeaturedStorefronts;