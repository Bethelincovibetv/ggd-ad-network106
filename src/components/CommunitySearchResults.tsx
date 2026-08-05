import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Store, Package, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props { query: string; onTagSelect?: (tag: string) => void }

interface Hit { id: string; kind: "person" | "business" | "product" | "category"; title: string; sub?: string; image?: string | null; href?: string }

const meta = {
  person: { icon: User, tint: "bg-blue-500/15 text-blue-600", label: "Person" },
  business: { icon: Store, tint: "bg-orange-500/15 text-orange-600", label: "Business" },
  product: { icon: Package, tint: "bg-emerald-500/15 text-emerald-600", label: "Product / Service" },
  category: { icon: Tag, tint: "bg-violet-500/15 text-violet-600", label: "Category" },
} as const;

/** Facebook-style instant search across people, businesses, products and categories. */
const CommunitySearchResults: React.FC<Props> = ({ query }) => {
  const navigate = useNavigate();
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setHits([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const like = `%${q}%`;
      const [{ data: profs }, { data: listings }, { data: cats }] = await Promise.all([
        supabase.from("profiles")
          .select("user_id, display_name, business_name, business_slug, avatar_url, business_logo_url, industry, state")
          .or(`display_name.ilike.${like},business_name.ilike.${like}`).limit(8),
        supabase.from("business_listings")
          .select("id, title, price, image_url, listing_type").eq("is_active", true)
          .ilike("title", like).limit(8),
        supabase.from("business_categories").select("id, name, slug").eq("is_active", true).ilike("name", like).limit(5),
      ]);

      const out: Hit[] = [];
      (profs || []).forEach((p: any) => out.push({
        id: p.user_id,
        kind: p.business_name ? "business" : "person",
        title: p.business_name || p.display_name || "User",
        sub: [p.industry, p.state].filter(Boolean).join(" · "),
        image: p.business_logo_url || p.avatar_url,
        href: p.business_slug ? `/b/${p.business_slug}` : `/user/${p.user_id}`,
      }));
      (listings || []).forEach((l: any) => out.push({
        id: l.id, kind: "product", title: l.title,
        sub: [l.listing_type === "service" ? "Service" : "Product", l.price ? `${Number(l.price).toLocaleString()} credits` : null].filter(Boolean).join(" · "),
        image: l.image_url, href: `/product/${l.id}`,
      }));
      (cats || []).forEach((c: any) => out.push({ id: c.id, kind: "category", title: c.name, href: `/industry/${c.slug}` }));

      setHits(out);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  if (query.trim().length < 2) return null;

  return (
    <Card className="p-2 border-0 shadow-sm">
      {loading ? (
        <div className="py-4 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : hits.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted-foreground">No people, businesses or products match “{query}”.</p>
      ) : (
        <div className="space-y-1">
          {hits.map(h => {
            const m = meta[h.kind];
            const Icon = m.icon;
            return (
              <button key={`${h.kind}-${h.id}`} onClick={() => h.href && navigate(h.href)}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted/60 active:scale-[0.99] transition text-left">
                {h.image
                  ? <img src={h.image} alt={h.title} loading="lazy" className="h-11 w-11 rounded-xl object-cover flex-shrink-0" />
                  : <span className={`h-11 w-11 rounded-xl grid place-items-center flex-shrink-0 ${m.tint}`}><Icon className="h-5 w-5" /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold truncate">{h.title}</span>
                  {h.sub && <span className="block text-xs text-muted-foreground truncate">{h.sub}</span>}
                </span>
                <Badge variant="secondary" className="text-[10px] font-bold flex-shrink-0">{m.label}</Badge>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default CommunitySearchResults;
