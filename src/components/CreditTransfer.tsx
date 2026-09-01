import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Send, Wallet, History, ArrowRight, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CreditTransferProps {
  credits: number;
  onCreditsUpdate: (credits: number) => void;
  isPremium: boolean;
}

const CreditTransfer = ({ credits, onCreditsUpdate, isPremium }: CreditTransferProps) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('credit_transfers' as any).select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false }).limit(10);
    setHistory(data || []);
  };

  const handleTransfer = async () => {
    const transferAmount = parseInt(amount);
    if (!recipientEmail.trim()) { toast.error('Enter recipient email'); return; }
    if (!transferAmount || transferAmount < 1) { toast.error('Enter valid amount'); return; }
    if (transferAmount > credits) { toast.error('Insufficient credits'); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('transfer_credits', {
        p_recipient_email: recipientEmail.trim(),
        p_amount: transferAmount,
      });

      if (error) throw error;
      const res = data as any;
      if (res && !res.success) {
        throw new Error(res.error || 'Transfer failed');
      }

      const newBalance = res?.new_balance !== undefined ? res.new_balance : (credits - transferAmount);
      onCreditsUpdate(newBalance);
      toast.success(`Sent ${transferAmount} credits to ${recipientEmail}!`);
      setRecipientEmail('');
      setAmount('');
      fetchHistory();
    } catch (err: any) {
      toast.error(err.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="p-6 text-center">
          <Wallet className="h-10 w-10 mx-auto mb-2 text-blue-600" />
          <p className="text-xs text-muted-foreground">Available Credits</p>
          <p className="text-4xl font-bold text-blue-700">{credits}</p>
        </CardContent>
      </Card>

      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-purple-800">Transfer Credits</p>
              <p className="text-[10px] text-purple-600 mt-0.5">
                {isPremium 
                  ? "As a Premium user, you can sell credits to other users! Share your referral code and transfer credits to buyers."
                  : "You can send credits to any registered user. Enter their email and the amount to transfer instantly."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="h-4 w-4" />Send Credits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Recipient Email</Label>
            <Input placeholder="user@example.com" value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Amount</Label>
            <Input type="number" placeholder="Enter credits to send" value={amount}
              onChange={e => setAmount(e.target.value)} className="mt-1" />
          </div>
          <Button onClick={handleTransfer} disabled={loading} className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
            {loading ? 'Sending...' : 'Transfer Credits'}
          </Button>
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4" />Transfer History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                <div className="text-xs">
                  <p className="font-medium text-foreground">{h.amount} credits</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">Completed</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CreditTransfer;
