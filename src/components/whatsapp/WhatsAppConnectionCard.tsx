import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Smartphone,
  CheckCircle2,
  XCircle,
  RefreshCw,
  LogOut,
  Users,
  Coins,
  Megaphone,
  Radio,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { WhatsAppQrModal } from './WhatsAppQrModal';
import {
  getWhatsAppStatus,
  disconnectWhatsApp,
  syncWhatsAppAdminGroups,
} from '@/services/whatsappService';
import { WhatsAppSessionState, WhatsAppAdminGroup } from '@/types/whatsapp';

interface WhatsAppConnectionCardProps {
  userId?: string;
  onStatusChange?: (status: WhatsAppSessionState) => void;
  compact?: boolean;
}

export const WhatsAppConnectionCard: React.FC<WhatsAppConnectionCardProps> = ({
  userId,
  onStatusChange,
  compact = false,
}) => {
  const [session, setSession] = useState<WhatsAppSessionState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isQrOpen, setIsQrOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
  const [showGroupList, setShowGroupList] = useState<boolean>(false);

  const fetchStatus = async () => {
    try {
      const data = await getWhatsAppStatus(userId);
      setSession(data);
      onStatusChange?.(data);
    } catch (err) {
      console.error('Failed to load WhatsApp status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [userId]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncWhatsAppAdminGroups(userId);
      if (res.success) {
        toast.success(res.message || `Synced ${res.totalAdminGroups} admin groups!`);
        fetchStatus();
      } else {
        toast.error(res.error || 'Failed to sync WhatsApp groups');
      }
    } catch (err: any) {
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectWhatsApp(userId);
      toast.info('WhatsApp disconnected successfully.');
      fetchStatus();
    } catch (err) {
      toast.error('Could not disconnect WhatsApp');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const isConnected = session?.status === 'connected';
  const totalAudience = (session?.adminGroups || []).reduce((acc, g) => acc + (g.size || 0), 0);

  return (
    <>
      <Card className="overflow-hidden border-2 border-emerald-500/20 bg-gradient-to-br from-card via-background to-emerald-500/5 shadow-md rounded-2xl">
        <CardContent className="p-4 sm:p-5">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-3 mb-3.5">
            <div className="flex items-center gap-2.5">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-md ${
                  isConnected
                    ? 'bg-gradient-to-br from-[#075E54] to-[#25D366] text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm text-foreground flex items-center gap-1.5">
                    WhatsApp Share to Earn
                    {isConnected && <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
                  </h3>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {isConnected
                    ? `Linked: ${session?.phoneNumber || 'Active Account'}`
                    : 'Broadcast to managed groups & earn rewards'}
                </p>
              </div>
            </div>

            {/* Connection Status Badge */}
            <Badge
              variant="outline"
              className={`px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-lg border ${
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full mr-1.5 ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>

          {/* Connected State View */}
          {isConnected ? (
            <div className="space-y-3.5">
              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-muted/40 rounded-xl border border-border/60">
                <div className="text-center">
                  <span className="text-[10px] text-muted-foreground font-semibold block flex items-center justify-center gap-1">
                    <Users className="h-3 w-3 text-emerald-600" /> Admin Groups
                  </span>
                  <span className="text-sm font-black text-foreground">
                    {session?.totalAdminGroups || 0}
                  </span>
                </div>
                <div className="text-center border-x border-border/60">
                  <span className="text-[10px] text-muted-foreground font-semibold block flex items-center justify-center gap-1">
                    <Radio className="h-3 w-3 text-cyan-600" /> Est. Reach
                  </span>
                  <span className="text-sm font-black text-foreground">
                    {totalAudience > 0 ? totalAudience.toLocaleString() : '4,720+'}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-muted-foreground font-semibold block flex items-center justify-center gap-1">
                    <Coins className="h-3 w-3 text-amber-500" /> Earned
                  </span>
                  <span className="text-sm font-black text-amber-600">
                    +{session?.totalCreditsEarned || 0} pts
                  </span>
                </div>
              </div>

              {/* Collapsible Admin Groups Preview */}
              {(session?.adminGroups?.length || 0) > 0 && (
                <div className="rounded-xl border border-border/60 overflow-hidden bg-card/60">
                  <button
                    type="button"
                    onClick={() => setShowGroupList(!showGroupList)}
                    className="w-full px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-between cursor-pointer bg-muted/30"
                  >
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      {session?.adminGroups?.length} Synchronized WhatsApp Groups
                    </span>
                    {showGroupList ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {showGroupList && (
                    <div className="p-2 space-y-1.5 max-h-48 overflow-y-auto">
                      {session?.adminGroups.map((grp) => (
                        <div
                          key={grp.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/40 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                            <p className="font-semibold text-foreground truncate text-[11px]">
                              {grp.name}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0 font-mono">
                            {grp.size} members
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex-1 h-9 text-xs font-bold rounded-xl cursor-pointer border-emerald-500/30 hover:bg-emerald-500/10"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Groups'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="h-9 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 rounded-xl cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            /* Disconnected State View */
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect your WhatsApp account via Baileys to automatically broadcast promotional
                adverts to all WhatsApp groups you manage and claim instant reward points!
              </p>

              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                <Zap className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Earn up to <strong>+50 promotional credits</strong> per broadcast!</span>
              </div>

              <Button
                onClick={() => setIsQrOpen(true)}
                className="w-full h-11 bg-gradient-to-r from-[#075E54] via-[#128C7E] to-[#25D366] hover:opacity-95 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                <Smartphone className="h-4 w-4" />
                Connect WhatsApp (Scan QR)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Connect Modal */}
      <WhatsAppQrModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        userId={userId}
        onConnected={(newSession) => {
          setSession(newSession);
          onStatusChange?.(newSession);
        }}
      />
    </>
  );
};
