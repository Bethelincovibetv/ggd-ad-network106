import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageCircle,
  ShoppingBag,
  Plus,
  Minus,
  MapPin,
  Phone,
  User,
  CreditCard,
  FileText,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Truck,
  Sparkles,
  ArrowRight,
  Send,
  Loader2,
  Store,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  normalizePhone,
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderLink,
  WhatsAppOrderPayload,
} from '@/lib/whatsapp';

export const NIGERIAN_STATES = [
  "Lagos", "FCT - Abuja", "Rivers", "Oyo", "Kano", "Kaduna", "Ogun", "Enugu", 
  "Anambra", "Delta", "Edo", "Akwa Ibom", "Abia", "Adamawa", "Bauchi", "Bayelsa", 
  "Benue", "Borno", "Cross River", "Ebonyi", "Ekiti", "Gombe", "Imo", "Jigawa", 
  "Katsina", "Kebbi", "Kogi", "Kwara", "Nasarawa", "Niger", "Ondo", "Osun", 
  "Plateau", "Sokoto", "Taraba", "Yobe", "Zamfara", "Other / International"
];

export const PAYMENT_METHODS = [
  { id: "Pay on Delivery (POD)", label: "Pay on Delivery (Cash/POS)", desc: "Pay when item arrives at your doorstep" },
  { id: "Direct Bank Transfer", label: "Direct Bank Transfer", desc: "Fast instant bank transfer to seller" },
  { id: "GGD Escrow & Wallet", label: "GGD Escrow Protection", desc: "Funds held securely until confirmed" },
  { id: "Online Card / Paystack", label: "Online Card / Paystack", desc: "Instant secure debit card checkout" },
];

export interface WhatsAppCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id?: string;
    title: string;
    price?: number | string | null;
    image_url?: string | null;
    listing_type?: 'product' | 'service' | string;
    description?: string | null;
    user_id?: string;
    business_name?: string;
    business_phone?: string;
    seller_phone?: string;
  };
  sellerInfo?: {
    name?: string;
    phone?: string;
    business_name?: string;
    address?: string;
  };
  onChatGgd?: () => void;
}

export const WhatsAppCheckoutModal: React.FC<WhatsAppCheckoutModalProps> = ({
  isOpen,
  onClose,
  product,
  sellerInfo,
  onChatGgd,
}) => {
  const isService = product.listing_type === 'service';
  const unitPrice = Number(product.price) || 0;

  // Order state
  const [quantity, setQuantity] = useState<number>(1);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryState, setDeliveryState] = useState<string>('Lagos');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Pay on Delivery (POD)');
  const [variant, setVariant] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Auto-fill customer details from logged in profile
  useEffect(() => {
    if (!isOpen) return;

    // Reset quantity to 1 when modal opens
    setQuantity(1);

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('display_name, business_name, business_phone, business_location, state')
            .eq('user_id', user.id)
            .maybeSingle();

          if (prof) {
            if (prof.display_name || prof.business_name) {
              setCustomerName(prof.display_name || prof.business_name || '');
            }
            if (prof.business_phone) {
              setCustomerPhone(prof.business_phone);
            }
            if (prof.state && NIGERIAN_STATES.includes(prof.state)) {
              setDeliveryState(prof.state);
            }
            if (prof.business_location) {
              setDeliveryAddress(prof.business_location);
            }
          }
        }
      } catch (e) {
        // ignore profile load error
      }
    })();
  }, [isOpen]);

  const targetSellerPhone = 
    product.seller_phone || 
    product.business_phone || 
    sellerInfo?.phone || 
    '';

  const cleanSellerPhone = normalizePhone(targetSellerPhone);
  const sellerDisplayName = 
    sellerInfo?.business_name || 
    product.business_name || 
    sellerInfo?.name || 
    'Verified Merchant';

  const totalAmount = unitPrice > 0 ? unitPrice * quantity : 0;
  const currentUrl = typeof window !== 'undefined' 
    ? (product.id ? `${window.location.origin}/product/${product.id}` : window.location.href)
    : '';

  const orderPayload: WhatsAppOrderPayload = {
    productTitle: product.title,
    unitPrice: unitPrice,
    quantity: isService ? 1 : quantity,
    totalAmount: isService ? unitPrice : totalAmount,
    listingType: product.listing_type || 'product',
    customerName,
    customerPhone,
    deliveryState,
    deliveryAddress,
    paymentMethod,
    variant,
    notes,
    productUrl: currentUrl,
    businessName: sellerDisplayName,
  };

  const formattedReceipt = buildWhatsAppOrderMessage(orderPayload);
  const waOrderUrl = buildWhatsAppOrderLink(cleanSellerPhone, orderPayload);

  const handleLaunchWhatsApp = async () => {
    setIsSubmitting(true);
    try {
      // Record order activity in Supabase if logged in
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && product.id) {
          // Log order inquiry for analytics and notification
          await (supabase.from('product_inquiries') as any).insert({
            product_id: product.id,
            buyer_id: user.id,
            seller_id: product.user_id || null,
            buyer_name: customerName || 'Anonymous Buyer',
            buyer_phone: customerPhone || null,
            delivery_state: deliveryState,
            delivery_address: deliveryAddress,
            quantity: quantity,
            total_amount: totalAmount,
            payment_method: paymentMethod,
            notes: notes,
            source: 'whatsapp_checkout',
          }).maybeSingle();
        }
      } catch {
        // Non-blocking
      }

      toast.success("Opening WhatsApp with your filled order receipt! 🚀");
      
      // Open WhatsApp checkout link
      window.open(waOrderUrl, '_blank');
      onClose();
    } catch (err: any) {
      toast.error("Could not open WhatsApp: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyReceipt = () => {
    navigator.clipboard.writeText(formattedReceipt);
    setCopied(true);
    toast.success("Order receipt copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border border-border/80 shadow-2xl bg-card">
        {/* Header with WhatsApp Emerald Branding */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 p-5 text-white sticky top-0 z-10 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur border border-white/30 grid place-items-center shadow-inner">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                  WhatsApp Instant Checkout
                  <Badge className="bg-white/25 text-white text-[10px] font-black border-0">
                    DIRECT TO SELLER
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-white/80 font-medium">
                  Autofills item, quantities & delivery details directly to the merchant.
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Product Summary Card */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-muted/40 border border-border/70">
            <div className="h-16 w-16 rounded-xl bg-muted overflow-hidden border border-border/60 shrink-0">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-orange-500/10 text-orange-600">
                  <ShoppingBag className="h-7 w-7" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Badge className="text-[9px] font-black uppercase px-2 py-0 border-0 bg-emerald-500/10 text-emerald-600">
                  {isService ? 'Service' : 'Product'}
                </Badge>
                <span className="text-[11px] font-bold text-muted-foreground truncate">
                  by {sellerDisplayName}
                </span>
              </div>
              <h4 className="font-bold text-sm text-foreground truncate mt-0.5">
                {product.title}
              </h4>
              <p className="text-sm font-black text-orange-600">
                {unitPrice > 0 ? `₦${unitPrice.toLocaleString()}` : 'Price on Inquiry'}
              </p>
            </div>

            {/* Quantity Controller (for products) */}
            {!isService && (
              <div className="flex items-center gap-1 bg-background border border-border/80 rounded-xl p-1 shrink-0 shadow-xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="h-7 w-7 p-0 rounded-lg hover:bg-muted"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-7 text-center font-black text-xs text-foreground">
                  {quantity}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="h-7 w-7 p-0 rounded-lg hover:bg-muted"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Form Fields for Instant Order Details */}
          <div className="space-y-3.5">
            <h5 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-emerald-600" />
              Customer & Delivery Details
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Your Full Name</label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Tunde Balogun"
                  className="h-10 rounded-xl bg-muted/20 border-border/80 text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Your Phone / WhatsApp Number</label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 08012345678"
                  className="h-10 rounded-xl bg-muted/20 border-border/80 text-xs font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Delivery State</label>
                <Select value={deliveryState} onValueChange={setDeliveryState}>
                  <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-border/80 text-xs font-medium">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {NIGERIAN_STATES.map((st) => (
                      <SelectItem key={st} value={st} className="text-xs">
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Payment Preference</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-border/80 text-xs font-medium">
                    <SelectValue placeholder="Payment Method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id} className="text-xs">
                        {pm.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-foreground">Street Address / Landmark</label>
              <Input
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="e.g. 14 Admiralty Way, Lekki Phase 1, Lagos"
                className="h-10 rounded-xl bg-muted/20 border-border/80 text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">
                  {isService ? 'Service Scope / Date' : 'Size / Color / Variant (Optional)'}
                </label>
                <Input
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                  placeholder={isService ? "e.g. Full Package, Starting Next Week" : "e.g. Large, Black Color"}
                  className="h-10 rounded-xl bg-muted/20 border-border/80 text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Special Instructions / Notes</label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Call before dispatching"
                  className="h-10 rounded-xl bg-muted/20 border-border/80 text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Pricing Calculation Summary */}
          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Unit Price</span>
              <span className="font-bold text-foreground">
                {unitPrice > 0 ? `₦${unitPrice.toLocaleString()}` : 'Custom'}
              </span>
            </div>
            {!isService && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Quantity</span>
                <span className="font-bold text-foreground">× {quantity}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Destination</span>
              <span className="font-bold text-emerald-600">{deliveryState}</span>
            </div>
            <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between">
              <span className="text-xs font-black text-foreground uppercase tracking-wider">
                Total Order Value
              </span>
              <span className="text-lg sm:text-xl font-black text-emerald-600">
                {totalAmount > 0 ? `₦${totalAmount.toLocaleString()}` : 'Price on Inquiry'}
              </span>
            </div>
          </div>

          {/* Live Formatted WhatsApp Receipt Toggle */}
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 p-0 h-auto gap-1"
            >
              <FileText className="h-3.5 w-3.5" />
              {showPreview ? 'Hide Live WhatsApp Message Preview' : 'Show Live WhatsApp Message Preview'}
            </Button>

            {showPreview && (
              <div className="mt-2 p-3.5 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-[11px] leading-relaxed border border-emerald-500/30 whitespace-pre-wrap select-all max-h-48 overflow-y-auto">
                {formattedReceipt}
              </div>
            )}
          </div>

          {/* Seller Phone Notice / Status */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border/50">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>
              {cleanSellerPhone
                ? `Direct WhatsApp Order to +${cleanSellerPhone}`
                : `Seller phone is not configured; order receipt will open in WhatsApp contact picker.`}
            </span>
          </div>

          {/* Action Hub Buttons */}
          <div className="space-y-2.5 pt-1">
            <Button
              type="button"
              onClick={handleLaunchWhatsApp}
              disabled={isSubmitting}
              className="w-full h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-base shadow-lg hover:shadow-emerald-600/30 gap-2 cursor-pointer transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <MessageCircle className="h-5 w-5 fill-white" />
              )}
              Complete Order on WhatsApp 🚀
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyReceipt}
                className="h-10 rounded-xl text-xs font-bold border-border/80 gap-1.5 hover:bg-muted"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied Receipt!' : 'Copy Order Text'}
              </Button>

              {onChatGgd && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onChatGgd();
                  }}
                  className="h-10 rounded-xl text-xs font-bold border-orange-500/30 text-orange-600 hover:bg-orange-500/10 gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  Chat on GGD
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppCheckoutModal;
