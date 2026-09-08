import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, Copy, Printer, Share2, ArrowDownLeft, ArrowUpRight,
  ShieldCheck, Calendar, Hash, User, Wallet, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import ggdLogo from '@/assets/ggd-logo.png';

export interface ReceiptData {
  transferId: string;
  amount: number;
  direction?: 'sent' | 'received';
  counterpartyName: string;
  counterpartyHandle?: string;
  senderName?: string;
  senderHandle?: string;
  receiverName?: string;
  receiverHandle?: string;
  timestamp: string;
  newBalance?: number;
  exchangeRate?: number;
  status?: string;
}

interface TransactionReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptData | null;
}

export const TransactionReceiptModal: React.FC<TransactionReceiptModalProps> = ({
  open,
  onOpenChange,
  receipt,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!receipt) return null;

  const isSent = receipt.direction === 'sent';
  const exchangeRate = receipt.exchangeRate || 100;
  const nairaVal = receipt.amount * exchangeRate;
  const status = receipt.status || 'Completed';

  const senderDisplay = receipt.senderName || (isSent ? 'You' : receipt.counterpartyName);
  const receiverDisplay = receipt.receiverName || (!isSent ? 'You' : receipt.counterpartyName);

  const copyReceipt = async () => {
    const text = `
=== GGD AD NETWORK OFFICIAL TRANSACTION RECEIPT ===
Reference: ${receipt.transferId}
Status: ${status.toUpperCase()}
Date & Time: ${new Date(receipt.timestamp).toLocaleString()}
Type: ${isSent ? 'Credit Transfer (Sent)' : 'Credit Transfer (Received)'}
Sender: ${senderDisplay} ${receipt.senderHandle ? `(${receipt.senderHandle})` : ''}
Recipient: ${receiverDisplay} ${receipt.receiverHandle ? `(${receipt.receiverHandle})` : ''}
Amount: ${receipt.amount.toLocaleString()} GGG Credits
Estimated Value: ₦${nairaVal.toLocaleString()} NGN
Settlement: Instant Ledger Clearance
===================================================
    `.trim();

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Receipt copied to clipboard!');
    } catch {
      toast.error('Failed to copy receipt');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border border-border/80 bg-card rounded-2xl shadow-2xl print:max-w-none print:border-none print:shadow-none">
        {/* Printable Receipt Card */}
        <div ref={receiptRef} className="p-6 space-y-5 bg-gradient-to-b from-card to-muted/20">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="flex items-center gap-2.5">
              <img src={ggdLogo} alt="GGD" className="h-8 w-8 rounded-lg shadow-sm" />
              <div>
                <h3 className="text-sm font-black tracking-tight text-foreground">GGD AD NETWORK</h3>
                <p className="text-[10px] text-muted-foreground font-semibold">Official Transaction Receipt</p>
              </div>
            </div>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-[11px] font-bold px-2.5 py-0.5">
              <ShieldCheck className="h-3 w-3" /> VERIFIED
            </Badge>
          </div>

          {/* Transfer Amount Showcase */}
          <div className="text-center py-3 bg-gradient-to-br from-muted/50 to-muted/20 rounded-2xl border border-border/60 relative overflow-hidden">
            <div className="absolute top-2 right-2">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isSent ? 'bg-orange-500/10 text-orange-600' : 'bg-emerald-500/10 text-emerald-600'
              }`}>
                {isSent ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                {isSent ? 'Transfer Sent' : 'Transfer Received'}
              </span>
            </div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Transaction Amount
            </p>
            <div className="text-3xl font-black text-foreground tracking-tight">
              <span className={isSent ? 'text-orange-600' : 'text-emerald-600'}>
                {isSent ? '-' : '+'}{receipt.amount.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground font-bold ml-1.5">GGG Credits</span>
            </div>
            <p className="text-xs font-semibold text-emerald-600 mt-1">
              ≈ ₦{nairaVal.toLocaleString()} NGN
            </p>
          </div>

          {/* Details Grid */}
          <div className="space-y-2.5 text-xs bg-card p-4 rounded-xl border border-border/60">
            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" /> Reference ID
              </span>
              <code className="font-mono text-[11px] font-bold text-foreground bg-muted px-1.5 py-0.5 rounded select-all truncate max-w-[200px]">
                {receipt.transferId}
              </code>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Date & Time
              </span>
              <span className="font-medium text-foreground">
                {new Date(receipt.timestamp).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" /> Sender
              </span>
              <span className="font-bold text-foreground text-right">
                {senderDisplay}
                {receipt.senderHandle && (
                  <span className="block text-[10px] font-medium text-muted-foreground">
                    {receipt.senderHandle}
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" /> Receiver
              </span>
              <span className="font-bold text-foreground text-right">
                {receiverDisplay}
                {receipt.receiverHandle && (
                  <span className="block text-[10px] font-medium text-muted-foreground">
                    {receipt.receiverHandle}
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Settlement Status
              </span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">
                {status}
              </Badge>
            </div>
          </div>

          {/* Footer / Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1 print:hidden">
            <Button
              variant="outline"
              onClick={copyReceipt}
              className="h-11 rounded-xl text-xs font-semibold gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" /> Copy Receipt
            </Button>
            <Button
              onClick={handlePrint}
              className="h-11 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-red-600 text-white gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" /> Print Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionReceiptModal;
