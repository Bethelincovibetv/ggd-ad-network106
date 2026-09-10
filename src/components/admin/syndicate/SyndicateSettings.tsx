import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Settings, 
  Save, 
  ShieldCheck, 
  Percent, 
  DollarSign, 
  Zap, 
  Lock, 
  Loader2, 
  CheckCircle,
  HelpCircle,
  MapPin,
  Users,
  CheckCheck,
  Globe
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SyndicateSettingsProps {
  currentPayoutPct: number;
  currentExchangeRate: number;
  onRefresh: () => void;
}

export const SyndicateSettings: React.FC<SyndicateSettingsProps> = ({
  currentPayoutPct,
  currentExchangeRate,
  onRefresh,
}) => {
  const [payoutPct, setPayoutPct] = useState<number>(currentPayoutPct || 70);
  const [exchangeRate, setExchangeRate] = useState<number>(currentExchangeRate || 50);
  const [stateTargetingEnabled, setStateTargetingEnabled] = useState<boolean>(true);
  const [customCountEnabled, setCustomCountEnabled] = useState<boolean>(true);
  const [fixedCampaignPrice, setFixedCampaignPrice] = useState<number>(5000);
  const [autoApprove, setAutoApprove] = useState<boolean>(false);
  const [minPayout, setMinPayout] = useState<number>(500);
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    loadExtraSettings();
  }, []);

  const loadExtraSettings = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [
          'syndicate_state_targeting_enabled',
          'syndicate_custom_count_enabled',
          'syndicate_fixed_campaign_price',
        ]);

      if (data) {
        data.forEach(item => {
          if (item.key === 'syndicate_state_targeting_enabled') {
            setStateTargetingEnabled(item.value !== 'false');
          }
          if (item.key === 'syndicate_custom_count_enabled') {
            setCustomCountEnabled(item.value !== 'false');
          }
          if (item.key === 'syndicate_fixed_campaign_price') {
            const val = parseInt(item.value, 10);
            if (!isNaN(val) && val > 0) setFixedCampaignPrice(val);
          }
        });
      }
    } catch (err) {
      console.warn("Failed to load extra settings:", err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSaveSettings = async () => {
    if (payoutPct < 1 || payoutPct > 100) {
      toast.error("Payout percentage must be between 1% and 100%");
      return;
    }
    if (exchangeRate <= 0) {
      toast.error("Exchange rate must be greater than 0");
      return;
    }
    if (fixedCampaignPrice <= 0) {
      toast.error("Fixed campaign price must be greater than 0");
      return;
    }

    setSaving(true);
    try {
      const updates = [
        { key: 'syndicate_payout_percentage', value: payoutPct.toString() },
        { key: 'credit_exchange_rate', value: exchangeRate.toString() },
        { key: 'syndicate_state_targeting_enabled', value: stateTargetingEnabled ? 'true' : 'false' },
        { key: 'syndicate_custom_count_enabled', value: customCountEnabled ? 'true' : 'false' },
        { key: 'syndicate_fixed_campaign_price', value: fixedCampaignPrice.toString() },
      ];

      for (const item of updates) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(item, { onConflict: 'key' });
        if (error) throw error;
      }

      toast.success("Syndicate configuration & policy settings saved!");
      onRefresh();
    } catch (err: any) {
      toast.error("Failed to update settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="border border-border shadow-md rounded-3xl overflow-hidden bg-card">
        <div className="bg-gradient-to-r from-purple-900 to-indigo-950 p-6 text-white">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-300" />
            <h3 className="font-bold text-lg">Direct Team System & Financial Configuration</h3>
          </div>
          <p className="text-xs text-purple-200 mt-1">
            Configure platform payout percentages, credit exchange rates, automated task distribution policies, and campaign pricing rules.
          </p>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Automated Task Assignment: State Targeting Toggle */}
          <div className="p-5 rounded-2xl bg-muted/40 border border-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <Label className="text-sm font-black text-foreground">State Targeting Task Assignment</Label>
                  <Badge variant="outline" className={stateTargetingEnabled ? "text-purple-600 border-purple-500/30 text-[10px]" : "text-emerald-600 border-emerald-500/30 text-[10px]"}>
                    {stateTargetingEnabled ? "State Filter Active" : "Nationwide Auto-Assigned"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground max-w-xl">
                  {stateTargetingEnabled
                    ? "Active: Syndicate tasks are restricted to operators registered in the targeted state. Nationwide tasks go to all."
                    : "Turned Off: State targeting is disabled. All syndicates automatically receive and are assigned every task, regardless of what state they are registered in."}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold text-muted-foreground">{stateTargetingEnabled ? "ON" : "OFF"}</span>
                <Switch
                  checked={stateTargetingEnabled}
                  onCheckedChange={setStateTargetingEnabled}
                  className="data-[state=checked]:bg-purple-600"
                />
              </div>
            </div>

            {!stateTargetingEnabled && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Global Distribution Active:</strong> Every active syndicate operator now automatically receives all campaigns across Nigeria without state restrictions.
                </span>
              </div>
            )}
          </div>

          {/* Syndicate Count Selection & Fixed Pricing Toggle */}
          <div className="p-5 rounded-2xl bg-muted/40 border border-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <Label className="text-sm font-black text-foreground">Syndicate Selection & Custom Count</Label>
                  <Badge variant="outline" className={customCountEnabled ? "text-indigo-600 border-indigo-500/30 text-[10px]" : "text-amber-600 border-amber-500/30 text-[10px]"}>
                    {customCountEnabled ? "Custom Slots Allowed" : "Fixed Campaign Price (Auto-Confirm)"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground max-w-xl">
                  {customCountEnabled
                    ? "Active: Businesses can select custom number of syndicates and choose between manual or automatic confirmation."
                    : "Turned Off: Number of syndicates selection is removed. Customers pay a flat admin-set price for any campaign, manual business confirmation is removed, and automatic confirmation is default."}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-bold text-muted-foreground">{customCountEnabled ? "ON" : "OFF"}</span>
                <Switch
                  checked={customCountEnabled}
                  onCheckedChange={setCustomCountEnabled}
                  className="data-[state=checked]:bg-indigo-600"
                />
              </div>
            </div>

            {/* Flat Price Input */}
            <div className="pt-2 border-t border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <Label className="text-xs font-bold text-foreground">
                    Admin Set Campaign Price (₦) {customCountEnabled && "(Standard Flat Baseline)"}
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {customCountEnabled
                      ? "Default baseline price for single-tier syndicate campaigns."
                      : "Fixed price customers pay for ANY campaign while syndicate count selection is turned off."}
                  </p>
                </div>
                <div className="relative flex-1 max-w-xs">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-xs">₦</span>
                  <Input
                    type="number"
                    min="100"
                    step="500"
                    value={fixedCampaignPrice}
                    onChange={(e) => setFixedCampaignPrice(parseInt(e.target.value, 10) || 0)}
                    className="pl-8 h-10 text-sm font-bold rounded-xl"
                  />
                </div>
              </div>
            </div>

            {!customCountEnabled && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <CheckCheck className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Flat Pricing & Automatic Confirmation Enforced:</strong> Businesses will be charged exactly ₦{fixedCampaignPrice.toLocaleString()} per campaign. Business manual confirmation buttons are deactivated and all submissions are auto-confirmed.
                </span>
              </div>
            )}
          </div>

          {/* Payout Pool Percentage */}
          <div className="p-5 rounded-2xl bg-muted/40 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-black text-foreground">Syndicate Payout Percentage (%)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The fixed percentage of total campaign budget allocated to participating verified operators.
                </p>
              </div>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {payoutPct}%
              </div>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="range"
                min="10"
                max="95"
                step="5"
                value={payoutPct}
                onChange={(e) => setPayoutPct(parseInt(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <Input
                type="number"
                min="1"
                max="100"
                value={payoutPct}
                onChange={(e) => setPayoutPct(parseInt(e.target.value) || 0)}
                className="w-20 h-10 text-center font-bold text-sm rounded-xl"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Example: On a ₦100,000 campaign with 50 operators, <strong>₦{((100000 * payoutPct) / 100).toLocaleString()}</strong> is divided among eligible operators (₦{(((100000 * payoutPct) / 100) / 50).toLocaleString()} each).
            </p>
          </div>

          {/* Credit Exchange Rate */}
          <div className="p-5 rounded-2xl bg-muted/40 border border-border space-y-3">
            <div>
              <Label className="text-sm font-black text-foreground">Credit Exchange Rate (₦ / Credit)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Conversion rate applied when converting between Nigerian Naira (₦) and GGD platform credits.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-xs">₦</span>
                <Input
                  type="number"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(parseInt(e.target.value) || 0)}
                  className="pl-8 h-11 text-sm font-bold rounded-xl"
                />
              </div>
              <span className="text-xs font-bold text-muted-foreground">= 1 GGD Platform Credit</span>
            </div>
          </div>

          {/* Bank Security & Lock Policy */}
          <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold text-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Immutable Bank Account Lock Policy</span>
            </div>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Once an operator resolves and confirms their Paystack bank account, the details are permanently locked to prevent unauthorized changes. Any modification requires admin review in the Bank Verification queue.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end pt-2">
            <Button
              type="button"
              onClick={handleSaveSettings}
              disabled={saving}
              className="h-11 px-6 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md flex items-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
