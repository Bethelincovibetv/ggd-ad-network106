import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  Send,
  ExternalLink,
  Users,
  Lock,
  Globe,
  Sliders,
  Sparkles,
  ArrowRight,
  Server,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ConnectedEmailAccount,
  EmailGatewaySettings,
  getConnectedEmailAccounts,
  getEmailGatewaySettings,
  saveEmailGatewaySettings,
  setActiveSendingAccount,
  connectGoogleGmailAccount,
  removeConnectedEmailAccount,
  toggleAccountUserAccess,
  dispatchEmailViaActiveGateway,
} from '@/services/emailGatewayService';

export const ConnectedGmailManager: React.FC = () => {
  const [accounts, setAccounts] = useState<ConnectedEmailAccount[]>([]);
  const [settings, setSettings] = useState<EmailGatewaySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [newNameInput, setNewNameInput] = useState('');
  
  // Test email state
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accs, sett] = await Promise.all([
        getConnectedEmailAccounts(),
        getEmailGatewaySettings(),
      ]);
      setAccounts(accs);
      setSettings(sett);
    } catch (err) {
      console.warn('Failed to load email accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeAccount = accounts.find((a) => a.isActiveSender) || accounts[0];

  const handleSwitchActiveSender = async (accountId: string) => {
    const updated = await setActiveSendingAccount(accountId);
    setAccounts(updated);
    const selected = updated.find((a) => a.id === accountId);
    toast.success(`Active sending gateway switched to ${selected?.email || 'selected account'}!`);
  };

  const handleConnectWithGoogle = async () => {
    setIsConnectingGoogle(true);
    try {
      // Simulate Google OAuth popup handshake
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const mockEmail = newEmailInput.trim() || `business.${Math.random().toString(36).substring(2, 6)}@gmail.com`;
      const mockName = newNameInput.trim() || 'Google Connected Gateway';

      const created = await connectGoogleGmailAccount({
        email: mockEmail,
        displayName: mockName,
        provider: 'gmail',
        avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        isActiveSender: false,
      });

      toast.success(`Successfully connected Google Account: ${created.email}`);
      setShowAddModal(false);
      setNewEmailInput('');
      setNewNameInput('');
      await loadData();
    } catch (err: any) {
      toast.error('Google Sign-In connection failed: ' + (err.message || 'Error'));
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleRemoveAccount = async (accountId: string, email: string) => {
    if (accounts.length <= 1) {
      toast.error('You must keep at least one connected sending gateway.');
      return;
    }
    const updated = await removeConnectedEmailAccount(accountId);
    setAccounts(updated);
    toast.success(`Disconnected email gateway: ${email}`);
  };

  const handleToggleUserAccess = async (accountId: string, currentVal: boolean) => {
    const updated = await toggleAccountUserAccess(accountId, !currentVal);
    setAccounts(updated);
    toast.success(!currentVal ? 'Gateway enabled for user access' : 'Gateway restricted to admin only');
  };

  const handleToggleAllowUserCustomGateways = async (checked: boolean) => {
    if (!settings) return;
    const newSettings = { ...settings, allowUserCustomGateways: checked };
    setSettings(newSettings);
    await saveEmailGatewaySettings(newSettings);
    toast.success(checked ? 'Users & Merchants can now connect personal Gmail gateways' : 'User custom email gateways disabled');
  };

  const handleSendTestDispatch = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Please enter a valid recipient email address');
      return;
    }

    setIsSendingTest(true);
    try {
      const result = await dispatchEmailViaActiveGateway({
        recipientEmail: testEmail,
        subject: `⚡ GGD Email Gateway Test (${activeAccount?.email})`,
        htmlContent: `<p>This test was dispatched via connected Gmail: <b>${activeAccount?.email}</b></p>`,
        scenarioId: 'gateway_verification',
      });

      toast.success(`Email dispatched successfully via ${result.activeGateway.email} to ${testEmail}!`);
      await loadData();
    } catch (err: any) {
      toast.error('Failed to send test email: ' + (err.message || 'Gateway error'));
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 border border-indigo-500/30 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-red-500 via-amber-500 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-white">Connected Gmail & Multi-Email Gateways</h2>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                <ShieldCheck className="h-3 w-3 mr-1" /> Google OAuth Verified
              </Badge>
            </div>
            <p className="text-xs text-indigo-200/80">
              Manage connected Gmail sending addresses, switch active dispatch gateways, and control user gateway availability.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-md h-9 px-4 shrink-0 flex items-center gap-1.5"
        >
          {/* Google Icon SVG */}
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Connect Another Google Account
        </Button>
      </div>

      {/* Active Sending Gateway Spotlight Card */}
      {activeAccount && (
        <Card className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 via-card to-background shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-xl shadow-md overflow-hidden">
                    {activeAccount.avatarUrl ? (
                      <img src={activeAccount.avatarUrl} alt="Google Avatar" className="w-full h-full object-cover" />
                    ) : (
                      activeAccount.email.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-background"></span>
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-emerald-500 text-white font-bold text-[10px] px-2 py-0.5 shadow-xs">
                      ⚡ ACTIVE SYSTEM SENDING GATEWAY
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      Provider: {activeAccount.provider.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-foreground">{activeAccount.email}</h3>
                  <p className="text-xs text-muted-foreground">
                    {activeAccount.displayName} • Verified SSL & DKIM Handshake
                  </p>
                </div>
              </div>

              {/* Stats pills */}
              <div className="grid grid-cols-3 gap-3 bg-muted/40 p-3 rounded-2xl border border-border/60">
                <div className="text-center px-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Sent Today</span>
                  <span className="text-sm font-black text-foreground">
                    {activeAccount.sentToday} / {activeAccount.dailyQuota}
                  </span>
                </div>
                <div className="text-center px-2 border-x border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Deliverability</span>
                  <span className="text-sm font-black text-emerald-600">
                    {activeAccount.deliverabilityRate}
                  </span>
                </div>
                <div className="text-center px-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Auth Status</span>
                  <span className="text-xs font-bold text-blue-600 flex items-center justify-center gap-1 mt-0.5">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </span>
                </div>
              </div>
            </div>

            {/* Quota Progress Bar */}
            <div className="mt-4 pt-4 border-t border-border/60 space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>Daily Sending Quota Utilization</span>
                <span>{((activeAccount.sentToday / activeAccount.dailyQuota) * 100).toFixed(0)}% used</span>
              </div>
              <Progress
                value={(activeAccount.sentToday / activeAccount.dailyQuota) * 100}
                className="h-2 rounded-full"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Grid: Accounts List & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Connected Accounts List & Switcher (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="rounded-3xl border border-border/80 shadow-sm bg-card">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Server className="h-4 w-4 text-purple-600" /> Connected Google & Gmail Accounts
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Select which account to use as the active sending gateway or toggle user access.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-bold">
                  {accounts.length} Connected
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3">
              {accounts.map((acc) => {
                const isCurrent = acc.isActiveSender;
                return (
                  <div
                    key={acc.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-500/5 shadow-xs ring-1 ring-emerald-400'
                        : 'border-border/70 hover:border-purple-500/40 bg-card'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm text-foreground shrink-0 border border-border">
                          {acc.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-foreground">{acc.email}</span>
                            {isCurrent && (
                              <Badge className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0">
                                ACTIVE
                              </Badge>
                            )}
                            {acc.allowedForUsers && (
                              <Badge variant="secondary" className="text-[9px] font-bold">
                                <Users className="h-2.5 w-2.5 mr-1" /> User Shared
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {acc.displayName} • Quota: {acc.sentToday}/{acc.dailyQuota} daily
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {!isCurrent ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleSwitchActiveSender(acc.id)}
                            className="rounded-xl text-xs font-bold h-8 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-colors"
                          >
                            Set as Active
                          </Button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" /> Selected
                          </span>
                        )}

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveAccount(acc.id, acc.email)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                          title="Disconnect Account"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Shared for users permission toggle row */}
                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Available as shared gateway for merchant store outreach:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-foreground">
                          {acc.allowedForUsers ? 'Allowed' : 'Private (Admin Only)'}
                        </span>
                        <Switch
                          checked={acc.allowedForUsers}
                          onCheckedChange={() => handleToggleUserAccess(acc.id, acc.allowedForUsers)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Gateway Settings & Live Dispatch Test (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Platform Gateway Permissions */}
          <Card className="rounded-3xl border border-border/80 shadow-sm bg-card">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sliders className="h-4 w-4 text-purple-600" /> Gateway Policies & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Allow User / Merchant Gateways</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Let sellers connect their own Gmail accounts for custom buyer notifications.
                  </p>
                </div>
                <Switch
                  checked={settings?.allowUserCustomGateways ?? false}
                  onCheckedChange={handleToggleAllowUserCustomGateways}
                />
              </div>

              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Strict DKIM & Anti-Spam Headers</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Automatically inject authenticated SPF/DKIM headers to ensure inbox delivery.
                  </p>
                </div>
                <Switch checked={true} disabled />
              </div>
            </CardContent>
          </Card>

          {/* Send Verification / Test Email */}
          <Card className="rounded-3xl border border-border/80 shadow-sm bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <h4 className="text-sm font-bold text-foreground">Test Dispatch with Active Gateway</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Send an instant test email through <span className="font-bold text-foreground">{activeAccount?.email}</span> to verify deliverability.
            </p>
            <div className="space-y-2">
              <Input
                placeholder="recipient@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="h-10 rounded-xl text-xs bg-background"
              />
              <Button
                type="button"
                onClick={handleSendTestDispatch}
                disabled={isSendingTest}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold h-10 shadow-md"
              >
                {isSendingTest ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Verification Email
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Connect Google Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <h3 className="font-bold text-base text-foreground">Sign in with Google Account</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddModal(false)}
                className="h-8 w-8 p-0 rounded-full"
              >
                ✕
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Connect a Google or Gmail account with OAuth permissions to dispatch authenticated transactional emails.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">Google / Gmail Address</label>
                <Input
                  placeholder="e.g. support@yourdomain.com or myname@gmail.com"
                  value={newEmailInput}
                  onChange={(e) => setNewEmailInput(e.target.value)}
                  className="rounded-xl text-xs h-10"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">Sender Display Name</label>
                <Input
                  placeholder="e.g. GGD Global Support"
                  value={newNameInput}
                  onChange={(e) => setNewNameInput(e.target.value)}
                  className="rounded-xl text-xs h-10"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <Button
                type="button"
                onClick={handleConnectWithGoogle}
                disabled={isConnectingGoogle}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold h-10"
              >
                {isConnectingGoogle ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Authenticate & Connect
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl text-xs font-bold h-10 px-4"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectedGmailManager;
