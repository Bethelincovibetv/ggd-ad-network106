import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ShoppingBag, Wallet, CreditCard, CheckCircle2, ShieldCheck, 
  ExternalLink, Download, AlertCircle, Loader2, Lock, ArrowRight, Sparkles 
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  DigitalProduct, 
  purchaseDigitalProductWithWallet, 
  verifyPaystackDigitalPurchase 
} from "@/services/digitalProductsService";
import confetti from 'canvas-confetti';

interface DigitalProductCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: DigitalProduct | null;
  onSuccess?: () => void;
}

declare global {
  interface Window {
    PaystackPop?: any;
  }
}

export const DigitalProductCheckoutModal: React.FC<DigitalProductCheckoutModalProps> = ({
  open,
  onOpenChange,
  product,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loadingWallet, setLoadingWallet] = useState(true);

  // Selected payment method tab ('wallet' | 'paystack')
  const [selectedMethod, setSelectedMethod] = useState<'wallet' | 'paystack'>('wallet');
  const [processing, setProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  // Determine which payment methods the administrator enabled for this product
  const allowsWallet = Boolean(product?.payment_methods === 'wallet_only' || product?.payment_methods === 'both');
  const allowsPaystack = Boolean(product?.payment_methods === 'paystack_only' || product?.payment_methods === 'both');

  useEffect(() => {
    if (open) {
      setCompletedOrder(null);
      loadUserData();
      // Set initial selected tab to whichever method is enabled
      if (product?.payment_methods === 'paystack_only') {
        setSelectedMethod('paystack');
      } else {
        setSelectedMethod('wallet');
      }
    }
  }, [open, product]);

  const loadUserData = async () => {
    setLoadingWallet(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user || null);

      if (user) {
        const { data: walletData } = await supabase
          .from('task_wallets')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();
        setWalletBalance(Number(walletData?.balance) || 0);
      }
    } catch (e) {
      console.warn("Could not load user wallet:", e);
    } finally {
      setLoadingWallet(false);
    }
  };

  if (!product) return null;

  const price = Number(product.price) || 0;
  const hasSufficientWallet = walletBalance >= price;

  // Process Direct Wallet Purchase
  const handleWalletPurchase = async () => {
    if (!currentUser) {
      toast.error("Please sign in or create an account to complete your purchase.");
      navigate('/?auth=signin');
      return;
    }

    if (!hasSufficientWallet) {
      toast.error(`Insufficient wallet funds. Shortfall: ₦${(price - walletBalance).toLocaleString()}`);
      return;
    }

    setProcessing(true);
    try {
      const res = await purchaseDigitalProductWithWallet(
        product.id,
        currentUser.id,
        currentUser.email
      );

      if (res.success && res.order) {
        setCompletedOrder(res.order);
        setWalletBalance(res.newWalletBalance ?? (walletBalance - price));
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        toast.success("Purchase successful! Access to digital product granted. 🎉");
        onSuccess?.();
      } else {
        toast.error(res.error || "Wallet purchase failed. Please check your balance.");
      }
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred during wallet checkout");
    } finally {
      setProcessing(false);
    }
  };

  // Process Paystack Direct Checkout
  const handlePaystackPurchase = async () => {
    if (!currentUser) {
      toast.error("Please sign in or create an account to complete your purchase.");
      navigate('/?auth=signin');
      return;
    }

    setProcessing(true);

    // Load Paystack inline script if not present
    if (!window.PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);
      await new Promise(res => { script.onload = res; });
    }

    try {
      // Fetch public key from app_settings or environment
      let pubKey = (import.meta as any).env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_d813470bc5528aa6fe9a128f731118182b8126b8';
      try {
        const { data: keyRow } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'paystack_public_key')
          .maybeSingle();
        if (keyRow?.value && keyRow.value.trim().length > 10) {
          pubKey = keyRow.value.trim();
        }
      } catch {}

      const handler = window.PaystackPop.setup({
        key: pubKey,
        email: currentUser.email || 'customer@ggdadnetwork.com',
        amount: price * 100, // in Kobo
        currency: 'NGN',
        ref: `dgt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        metadata: {
          productId: product.id,
          userId: currentUser.id,
          productTitle: product.title,
          type: 'digital_product_direct'
        },
        callback: async (response: any) => {
          try {
            // Verify authoritatively on server
            toast.loading("Verifying transaction on server...");
            const verifyRes = await verifyPaystackDigitalPurchase(
              response.reference,
              product.id,
              currentUser.id,
              currentUser.email
            );

            if (verifyRes.success && verifyRes.order) {
              setCompletedOrder(verifyRes.order);
              confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
              toast.dismiss();
              toast.success("Payment verified! Digital product access granted. 🚀");
              onSuccess?.();
            } else {
              toast.dismiss();
              toast.error(verifyRes.error || "Payment verification failed on the server.");
            }
          } catch (e: any) {
            toast.dismiss();
            toast.error(e?.message || "Failed to complete payment verification");
          } finally {
            setProcessing(false);
          }
        },
        onClose: () => {
          setProcessing(false);
          toast.info("Transaction cancelled.");
        }
      });

      handler.openIframe();
    } catch (err: any) {
      setProcessing(false);
      toast.error("Could not launch Paystack checkout: " + err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-5 sm:p-6 rounded-3xl border-border/80 shadow-2xl bg-background">
        <DialogHeader className="space-y-1.5 text-left border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white grid place-items-center shadow-md shadow-orange-500/20">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black text-foreground">
                {completedOrder ? "Order Completed! 🎉" : "Direct Digital Checkout"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {completedOrder
                  ? "Your digital product access is active and ready"
                  : "Verified administrator direct purchasing system"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* COMPLETED ORDER VIEW */}
        {completedOrder ? (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h3 className="text-base font-black text-foreground">
                Payment Successfully Confirmed!
              </h3>
              <p className="text-xs text-muted-foreground">
                Order ID: <span className="font-mono font-bold text-foreground">{completedOrder.orderId}</span>
              </p>
              <Badge className="bg-emerald-600 text-white text-xs font-bold px-3 py-1">
                ₦{Number(completedOrder.amount).toLocaleString()} Paid via {completedOrder.paymentMethod === 'wallet' ? 'Wallet Balance' : 'Paystack'}
              </Badge>
            </div>

            {/* Access & Download Box */}
            <Card className="rounded-2xl border-border/80 bg-card p-4 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-orange-500" />
                Your Digital Access Link & Materials
              </h4>

              <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line bg-muted/40 p-3 rounded-xl border border-border/40 font-medium">
                {completedOrder.accessInstructions || product.access_instructions || "Your digital downloads and private dashboard portal are unlocked."}
              </p>

              {completedOrder.digitalAccessUrl && (
                <a
                  href={completedOrder.digitalAccessUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Open &amp; Access Digital Product Now</span>
                  <ExternalLink className="h-4 w-4 ml-0.5" />
                </a>
              )}
            </Card>

            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full h-11 rounded-xl text-xs font-bold"
            >
              Done &amp; Close Window
            </Button>
          </div>
        ) : (
          /* CHECKOUT FORM VIEW */
          <div className="space-y-4 pt-2">
            {/* Product Summary Card */}
            <div className="p-3.5 rounded-2xl bg-card border border-border/70 flex items-center gap-3">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="h-16 w-16 rounded-xl object-cover border border-border/60 shrink-0"
                />
              ) : (
                <div className="h-16 w-16 rounded-xl bg-orange-500/10 text-orange-600 grid place-items-center shrink-0">
                  <ShoppingBag className="h-7 w-7" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[9px] font-black uppercase py-0">
                    Digital Product
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">Instant Access</span>
                </div>
                <h4 className="text-xs sm:text-sm font-black text-foreground truncate mt-0.5">
                  {product.title}
                </h4>
                <p className="text-base font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mt-0.5">
                  ₦{price.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Administrator Allowed Payment Methods Selection */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Select Available Payment Method:
              </label>

              {/* Both Methods Available: Choice Tabs */}
              {allowsWallet && allowsPaystack && (
                <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-muted/60 border border-border/60 mb-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('wallet')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      selectedMethod === 'wallet'
                        ? 'bg-background text-foreground shadow-xs font-black'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Wallet className="h-3.5 w-3.5 text-orange-500" />
                    <span>Wallet Balance</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('paystack')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      selectedMethod === 'paystack'
                        ? 'bg-background text-foreground shadow-xs font-black'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                    <span>Paystack</span>
                  </button>
                </div>
              )}

              {/* Single Method Only Badges */}
              {!allowsPaystack && allowsWallet && (
                <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs font-bold text-orange-700 dark:text-orange-400 flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4" />
                  <span>Administrator Setting: Wallet Balance Only</span>
                </div>
              )}

              {!allowsWallet && allowsPaystack && (
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Administrator Setting: Paystack Online Only</span>
                </div>
              )}

              {/* WALLET BALANCE VIEW */}
              {selectedMethod === 'wallet' && allowsWallet && (
                <div className="p-4 rounded-2xl bg-card border-2 border-border/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Your Wallet Balance</p>
                      <p className="text-xl font-black text-foreground">
                        ₦{walletBalance.toLocaleString()}
                      </p>
                    </div>
                    <Badge className={hasSufficientWallet ? "bg-emerald-600 text-white text-[10px]" : "bg-red-600 text-white text-[10px]"}>
                      {hasSufficientWallet ? "Funds Sufficient" : "Insufficient Balance"}
                    </Badge>
                  </div>

                  {!hasSufficientWallet && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs space-y-2">
                      <p className="text-red-700 dark:text-red-300 font-medium">
                        You need ₦{(price - walletBalance).toLocaleString()} more in your wallet to complete this order.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onOpenChange(false);
                          navigate('/?tab=wallet');
                        }}
                        className="h-8 text-xs font-bold w-full border-red-500/30 text-red-600 dark:text-red-400"
                      >
                        Top Up Wallet in Wallet Hub <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  )}

                  <Button
                    onClick={handleWalletPurchase}
                    disabled={processing || !hasSufficientWallet}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-xs sm:text-sm shadow-md cursor-pointer"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Authorizing Wallet Deduction...
                      </>
                    ) : (
                      <>
                        <Wallet className="h-4 w-4 mr-1.5" />
                        Pay ₦{price.toLocaleString()} with Wallet
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* PAYSTACK VIEW */}
              {selectedMethod === 'paystack' && allowsPaystack && (
                <div className="p-4 rounded-2xl bg-card border-2 border-border/80 space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">Instant Paystack Gateway</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Pay with Debit Card (Mastercard / Visa / Verve), Bank Transfer, or USSD. Access is granted instantly on successful payment.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                    <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>256-bit Bank Grade Encrypted Payment</span>
                  </div>

                  <Button
                    onClick={handlePaystackPurchase}
                    disabled={processing}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-black text-xs sm:text-sm shadow-md cursor-pointer"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting to Paystack...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-1.5" />
                        Pay ₦{price.toLocaleString()} with Paystack
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            <p className="text-[10px] text-center text-muted-foreground">
              Protected by GGD Direct Purchasing Engine • 100% Guaranteed Digital Delivery
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DigitalProductCheckoutModal;
