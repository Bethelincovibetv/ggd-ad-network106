import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Bell, 
  Send, 
  Users, 
  MapPin, 
  Sparkles, 
  Clock, 
  CheckCircle, 
  Loader2,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { NIGERIAN_STATES } from "@/utils/nigerianStates";

interface SyndicateNotificationsProps {
  allMembers: any[];
  onRefresh: () => void;
}

export const SyndicateNotifications: React.FC<SyndicateNotificationsProps> = ({
  allMembers,
  onRefresh,
}) => {
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'active_only' | 'state'>('active_only');
  const [targetState, setTargetState] = useState('Lagos');
  const [notificationType, setNotificationType] = useState<'info' | 'campaign' | 'payout' | 'urgent'>('campaign');
  const [sending, setSending] = useState(false);
  const [sentHistory, setSentHistory] = useState<any[]>([]);

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error("Please provide both title and message for broadcast");
      return;
    }

    setSending(true);
    try {
      // Determine recipients
      let recipients = allMembers;
      if (targetAudience === 'active_only') {
        recipients = allMembers.filter(m => m.is_active && !m.is_suspended);
      } else if (targetAudience === 'state') {
        recipients = allMembers.filter(m => m.state === targetState);
      }

      if (recipients.length === 0) {
        toast.error("No recipients found for the selected audience");
        setSending(false);
        return;
      }

      const inserts = recipients.map(m => ({
        user_id: m.user_id,
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        type: notificationType === 'urgent' ? 'alert' : notificationType,
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('notifications').insert(inserts);
      if (error) throw error;

      toast.success(`Broadcast sent successfully to ${recipients.length} members!`);
      
      setSentHistory(prev => [
        {
          id: Date.now().toString(),
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
          recipientsCount: recipients.length,
          audience: targetAudience === 'state' ? `${targetState} Operators` : targetAudience === 'active_only' ? 'Active Team' : 'All Members',
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);

      setBroadcastTitle('');
      setBroadcastMessage('');
    } catch (err: any) {
      toast.error("Failed to broadcast notification: " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Broadcast Composer Card */}
      <Card className="border border-border shadow-md rounded-3xl overflow-hidden bg-card">
        <div className="bg-gradient-to-r from-purple-900 to-indigo-950 p-6 text-white">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-purple-300" />
            <h3 className="font-bold text-lg">Direct Team Broadcast Composer</h3>
          </div>
          <p className="text-xs text-purple-200 mt-1">
            Dispatch instant notifications, operational alerts, and instructions to Syndicate operators.
          </p>
        </div>

        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-foreground">Target Audience</Label>
              <select
                aria-label="Target Audience"
                value={targetAudience}
                onChange={(e: any) => setTargetAudience(e.target.value)}
                className="mt-1.5 w-full h-11 text-xs font-semibold rounded-xl border border-input bg-background px-3"
              >
                <option value="active_only">Active Verified Operators Only ({allMembers.filter(m => m.is_active && !m.is_suspended).length})</option>
                <option value="all">All Syndicate Members ({allMembers.length})</option>
                <option value="state">Specific State Station</option>
              </select>
            </div>

            {targetAudience === 'state' ? (
              <div>
                <Label className="text-xs font-bold text-foreground">Select Target State</Label>
                <select
                  aria-label="Select Target State"
                  value={targetState}
                  onChange={e => setTargetState(e.target.value)}
                  className="mt-1.5 w-full h-11 text-xs font-semibold rounded-xl border border-input bg-background px-3"
                >
                  {NIGERIAN_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <Label className="text-xs font-bold text-foreground">Notification Category</Label>
                <select
                  aria-label="Notification Category"
                  value={notificationType}
                  onChange={(e: any) => setNotificationType(e.target.value)}
                  className="mt-1.5 w-full h-11 text-xs font-semibold rounded-xl border border-input bg-background px-3"
                >
                  <option value="campaign">📢 New Campaign Alert</option>
                  <option value="payout">💰 Settlement / Payout Notice</option>
                  <option value="urgent">🚨 Urgent Action Required</option>
                  <option value="info">ℹ️ General Information</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs font-bold text-foreground">Broadcast Subject / Title</Label>
            <Input
              placeholder="e.g. ⚡ Today's Lagos Campaign is Live - Immediate Execution"
              value={broadcastTitle}
              onChange={e => setBroadcastTitle(e.target.value)}
              className="mt-1.5 h-11 text-sm font-bold rounded-xl"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-foreground">Broadcast Message Content</Label>
            <textarea
              rows={4}
              placeholder="Write the full message or instructions for operators..."
              value={broadcastMessage}
              onChange={e => setBroadcastMessage(e.target.value)}
              className="mt-1.5 w-full text-xs rounded-xl border border-input bg-background p-3.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button
              type="button"
              onClick={handleSendBroadcast}
              disabled={sending}
              className="h-11 px-6 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md flex items-center gap-2"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Dispatch Broadcast Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sent History */}
      {sentHistory.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-600" /> Dispatched Broadcasts This Session
          </h4>

          <div className="space-y-2">
            {sentHistory.map(item => (
              <div key={item.id} className="p-4 rounded-2xl bg-card border border-border space-y-1">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-foreground text-xs">{item.title}</h5>
                  <Badge variant="outline" className="text-[10px]">{item.audience} ({item.recipientsCount})</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.message}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{item.timestamp}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
