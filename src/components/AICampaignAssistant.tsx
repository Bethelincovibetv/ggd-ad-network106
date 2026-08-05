import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Wand2, Target, Coins, CalendarClock, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface AISuggestions {
  headlines?: string[];
  descriptions?: string[];
  improvements?: string[];
  audience?: string;
  budget?: string;
  duration?: string;
  campaignType?: string;
}

interface Props {
  currentTitle?: string;
  currentDescription?: string;
  analytics?: Record<string, unknown>;
  onApplyTitle?: (v: string) => void;
  onApplyDescription?: (v: string) => void;
}

/** AI Campaign Assistant — plugs into the existing campaign creation flow. */
const AICampaignAssistant: React.FC<Props> = ({ currentTitle, currentDescription, analytics, onApplyTitle, onApplyDescription }) => {
  const [product, setProduct] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<AISuggestions | null>(null);

  const run = async () => {
    if (!product.trim() && !currentTitle) { toast.error("Tell the assistant what you're promoting"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-campaign-assistant", {
        body: { product, goal, currentTitle, currentDescription, analytics },
      });
      if (error) throw error;
      if ((data as any)?.error) { toast.error((data as any).error); return; }
      setOut(data as AISuggestions);
      toast.success("Suggestions ready");
    } catch (e: any) {
      toast.error(e?.message || "AI assistant unavailable right now");
    } finally { setLoading(false); }
  };

  return (
    <Card className="border-orange-300/60 bg-gradient-to-br from-orange-50/60 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-black flex items-center gap-2">
          <span className="h-9 w-9 rounded-xl grid place-items-center bg-gradient-to-br from-orange-500 to-red-600 text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          AI Campaign Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-sm font-semibold">What are you promoting?</Label>
          <Input value={product} onChange={e => setProduct(e.target.value)} placeholder="e.g. Handmade leather bags in Lagos" className="h-12 text-base mt-1 rounded-xl" />
        </div>
        <div>
          <Label className="text-sm font-semibold">Your goal (optional)</Label>
          <Input value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g. More WhatsApp orders" className="h-12 text-base mt-1 rounded-xl" />
        </div>
        <Button onClick={run} disabled={loading} className="w-full h-12 text-base font-bold bg-gradient-to-r from-orange-500 to-red-600 text-white">
          {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Wand2 className="h-5 w-5 mr-2" />}
          {loading ? "Thinking…" : "Get AI suggestions"}
        </Button>

        {out && (
          <div className="space-y-3 pt-1">
            {!!out.headlines?.length && (
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Headlines</p>
                {out.headlines.map((h, i) => (
                  <button key={i} onClick={() => { onApplyTitle?.(h); toast.success("Headline applied"); }}
                    className="w-full text-left p-3 rounded-xl border border-border bg-card hover:border-orange-400 active:scale-[0.99] transition text-sm font-semibold">
                    {h}
                  </button>
                ))}
              </div>
            )}
            {!!out.descriptions?.length && (
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Descriptions</p>
                {out.descriptions.map((d, i) => (
                  <button key={i} onClick={() => { onApplyDescription?.(d); toast.success("Description applied"); }}
                    className="w-full text-left p-3 rounded-xl border border-border bg-card hover:border-orange-400 active:scale-[0.99] transition text-sm">
                    {d}
                  </button>
                ))}
              </div>
            )}
            <div className="grid gap-2">
              {out.audience && <Row icon={Target} label="Target audience" value={out.audience} />}
              {out.budget && <Row icon={Coins} label="Budget" value={out.budget} />}
              {out.duration && <Row icon={CalendarClock} label="Duration" value={out.duration} />}
              {out.campaignType && <Row icon={Sparkles} label="Best campaign type" value={out.campaignType} />}
            </div>
            {!!out.improvements?.length && (
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Improvements</p>
                {out.improvements.map((t, i) => (
                  <div key={i} className="flex gap-2 p-3 rounded-xl bg-muted/50 text-sm">
                    <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Row = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex gap-2 p-3 rounded-xl border border-border bg-card">
    <Icon className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
    <div className="min-w-0">
      <Badge variant="secondary" className="text-[10px] font-bold mb-1">{label}</Badge>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  </div>
);

export default AICampaignAssistant;
