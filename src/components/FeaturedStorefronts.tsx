import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, MapPin, Share2, BadgeCheck } from "lucide-react";
import GuestGateModal from "./GuestGateModal";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";

interface Props {
  onRequireAuth: () => void;
}

interface FeaturedBiz {
  user_id: string;
  business_name: string | null;
  business_slug: string | null;
  business_logo_url: string | null;
  business_category: string | null;
  business_location: string | null;
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
      try {
        // Pull up to 8 businesses with a logo + business_name
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, business_name, business_slug, business_logo_url, business_category, business_location")
          .not("business_name", "is", null)
          .not("business_logo_url", "is", null)
          .order("updated_at", { ascending: false })
          .limit(8);

        const list: FeaturedBiz[] = [];
        for (const p of profiles || []) {
          try {
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
          } catch {}
        }
        setItems(list);
      } catch (err) {
        console.warn("FeaturedStorefronts fetch skipped:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const gate = () => setGateOpen(true);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <section className="py-14 px-4 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-400 mb-2 inline-flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5" /> Live on GGD Network
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white text-balance">
            Explore Active Business Storefronts &amp; Products
          </h2>
          <p className="text-gray-400 mt-2.5 max-w-2xl mx-auto text-sm md:text-base">
            Real businesses selling to real customers on GGD Ad Network right now.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((biz) => (
            <Card
              key={biz.user_id}
              onClick={gate}
              className="cursor-pointer group overflow-hidden rounded-2xl bg-gray-900/85 border border-white/10 hover:border-orange-500/60 shadow-[0_14px_34px_-16px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.06)] hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-14px_rgba(234,88,12,0.28)] transition-all duration-200"
            >
              <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl overflow-hidden bg-orange-500/10 border border-white/10 flex-shrink-0">
                      {biz.business_logo_url ? (
                        <img
                          src={biz.business_logo_url}
                          alt={biz.business_name || "Storefront"}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Store className="h-6 w-6 text-orange-400" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-white text-base truncate">{biz.business_name}</h3>
                        <BadgeCheck className="h-4 w-4 text-sky-400 flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 truncate mt-0.5">
                        {biz.business_category && (
                          <span className="text-orange-300/90 font-medium truncate">{biz.business_category}</span>
                        )}
                        {biz.business_category && biz.business_location && <span aria-hidden="true">·</span>}
                        {biz.business_location && (
                          <span className="inline-flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span>{biz.business_location}, NG</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                      <FavoriteButton
                        item={{
                          targetId: biz.user_id,
                          type: 'business',
                          title: biz.business_name || 'Partner Storefront',
                          subtitle: biz.business_category,
                          imageUrl: biz.business_logo_url,
                          location: biz.business_location,
                          category: biz.business_category,
                          verified: true,
                          linkUrl: biz.business_slug ? `/b/${biz.business_slug}` : `/user/${biz.user_id}`,
                          businessName: biz.business_name,
                        }}
                        variant="overlay"
                        size="sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {biz.products.slice(0, 3).map((p) => (
                      <div key={p.id} className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-800 border border-white/5">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.title}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[10px] text-gray-400 text-center p-1.5">
                            {p.title}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={(e) => { e.stopPropagation(); gate(); }}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-xs font-bold shadow-[0_8px_18px_-6px_rgba(234,88,12,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] active:translate-y-[1px] transition-all duration-150"
                >
                  <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share this Flyer &amp; Earn
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