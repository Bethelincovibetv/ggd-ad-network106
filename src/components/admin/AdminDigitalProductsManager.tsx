import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Package, Plus, Edit3, Trash2, ShieldCheck, Wallet, CreditCard, 
  ExternalLink, Download, Loader2, Sparkles, AlertCircle, Check 
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  DigitalProduct, 
  fetchDigitalProducts, 
  saveDigitalProduct, 
  deleteDigitalProduct 
} from "@/services/digitalProductsService";

export const AdminDigitalProductsManager: React.FC = () => {
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminUserId, setAdminUserId] = useState<string>('');

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DigitalProduct | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [price, setPrice] = useState('5000');
  const [imageUrl, setImageUrl] = useState('');
  const [digitalAccessUrl, setDigitalAccessUrl] = useState('');
  const [accessInstructions, setAccessInstructions] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<'wallet_only' | 'paystack_only' | 'both'>('both');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setAdminEmail(user.email || 'goodgiftdigital@gmail.com');
        setAdminUserId(user.id);
      }
    });
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    const list = await fetchDigitalProducts(true);
    setProducts(list);
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setTitle('');
    setDescription('');
    setLongDescription('');
    setPrice('5000');
    setImageUrl('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop');
    setDigitalAccessUrl('https://drive.google.com/drive/folders/ggd_materials_vip');
    setAccessInstructions('Your digital downloads, guides, and portals are ready. Click the access link to view your materials.');
    setPaymentMethods('both');
    setIsActive(true);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (p: DigitalProduct) => {
    setEditingProduct(p);
    setTitle(p.title);
    setDescription(p.description || '');
    setLongDescription(p.long_description || '');
    setPrice(String(p.price));
    setImageUrl(p.image_url || '');
    setDigitalAccessUrl(p.digital_access_url || '');
    setAccessInstructions(p.access_instructions || '');
    setPaymentMethods(p.payment_methods || 'both');
    setIsActive(p.is_active !== false);
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a product title");
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      toast.error("Please enter a valid price in Naira");
      return;
    }

    if (!digitalAccessUrl.trim()) {
      toast.error("Please provide a digital access/download URL for customers");
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<DigitalProduct> = {
        id: editingProduct ? editingProduct.id : undefined,
        title: title.trim(),
        description: description.trim(),
        long_description: longDescription.trim() || description.trim(),
        price: numPrice,
        image_url: imageUrl.trim(),
        digital_access_url: digitalAccessUrl.trim(),
        access_instructions: accessInstructions.trim(),
        payment_methods: paymentMethods,
        is_active: isActive,
        is_digital: true,
      };

      const res = await saveDigitalProduct(payload, adminEmail, adminUserId);
      if (res.success) {
        toast.success(editingProduct ? "Digital product updated!" : "Digital product created and published!");
        setIsDialogOpen(false);
        loadProducts();
      } else {
        toast.error(res.error || "Could not save digital product");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error saving product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, prodTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${prodTitle}"?`)) return;
    try {
      const res = await deleteDigitalProduct(id, adminEmail, adminUserId);
      if (res.success) {
        toast.success("Digital product deleted");
        loadProducts();
      } else {
        toast.error(res.error || "Failed to delete product");
      }
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="rounded-3xl border-border/80 bg-gradient-to-br from-card via-card to-orange-500/5 shadow-md overflow-hidden">
        <CardHeader className="p-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px] font-black uppercase">
                  Admin Exclusive Feature
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Server-Verified
                </span>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-black text-foreground mt-1">
                Direct Purchases for Digital Products
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                Create, manage, and configure payment methods (Wallet Balance &amp; Paystack) for eligible digital products with authoritative server verification.
              </CardDescription>
            </div>

            <Button
              onClick={handleOpenCreate}
              className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-2xl font-black text-xs sm:text-sm h-11 px-5 shadow-lg cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Digital Product
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Products Catalog Table / Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3">
          <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
            Loading digital products...
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center p-12 bg-card rounded-3xl border border-dashed border-border/80 space-y-3">
          <Package className="h-10 w-10 text-muted-foreground/60 mx-auto" />
          <h3 className="text-base font-bold text-foreground">No digital products listed yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Click "Add Digital Product" above to publish your first direct purchase product.
          </p>
          <Button onClick={handleOpenCreate} variant="outline" className="rounded-xl text-xs font-bold">
            <Plus className="h-4 w-4 mr-1" /> Create First Product
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((p) => {
            const hasWallet = p.payment_methods === 'wallet_only' || p.payment_methods === 'both';
            const hasPaystack = p.payment_methods === 'paystack_only' || p.payment_methods === 'both';

            return (
              <Card key={p.id} className="rounded-3xl border-border/80 shadow-xs overflow-hidden flex flex-col justify-between">
                <div>
                  {/* Top Image & Status */}
                  <div className="h-40 w-full relative overflow-hidden bg-slate-900">
                    <img
                      src={p.image_url}
                      alt={p.title}
                      className="w-full h-full object-cover opacity-90"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <Badge className={p.is_active ? "bg-emerald-600 text-white text-[10px]" : "bg-zinc-600 text-white text-[10px]"}>
                        {p.is_active ? "Published" : "Draft"}
                      </Badge>
                      <Badge className="bg-black/60 text-white backdrop-blur-md text-[10px] border border-white/20">
                        Digital Asset
                      </Badge>
                    </div>

                    <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded-xl text-white font-black text-sm border border-white/10">
                      ₦{Number(p.price).toLocaleString()}
                    </div>
                  </div>

                  <CardContent className="p-5 space-y-3">
                    <div>
                      <h3 className="font-black text-base text-foreground line-clamp-1">{p.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                        {p.description}
                      </p>
                    </div>

                    {/* Payment Methods Badges */}
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider mb-1.5">
                        Allowed Payment Methods:
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {hasWallet && (
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30 text-[10px] font-bold gap-1">
                            <Wallet className="h-3 w-3" /> Wallet Balance
                          </Badge>
                        )}
                        {hasPaystack && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[10px] font-bold gap-1">
                            <CreditCard className="h-3 w-3" /> Paystack
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Digital link info */}
                    <div className="p-2.5 rounded-xl bg-muted/40 text-[11px] text-muted-foreground flex items-center justify-between">
                      <span className="truncate max-w-[240px]">Link: {p.digital_access_url}</span>
                      <a href={p.digital_access_url} target="_blank" rel="noopener noreferrer" className="text-orange-600 font-bold shrink-0 ml-1">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </CardContent>
                </div>

                {/* Card Actions */}
                <div className="p-4 pt-0 flex items-center justify-between border-t border-border/40 gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ID: {p.id.slice(0, 16)}...
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(p)}
                      className="h-8 rounded-xl text-xs font-bold"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(p.id, p.title)}
                      className="h-8 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-500/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-3xl border-border/80 shadow-2xl">
          <DialogHeader className="space-y-1.5 text-left border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-orange-500/10 text-orange-600 grid place-items-center font-bold">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-foreground">
                  {editingProduct ? "Edit Digital Product" : "New Digital Product Listing"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Configure title, authoritative price, delivery access, and payment methods.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Product Title *</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Nigerian Ad Copy Masterclass, E-Commerce Guide"
                required
                className="rounded-xl text-xs sm:text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Authoritative Price (₦) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₦</span>
                  <Input
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    required
                    min="0"
                    className="pl-7 rounded-xl text-xs sm:text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Cover Image URL</label>
                <Input
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Short Description</label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="One or two sentences highlighting benefits and deliverables..."
                rows={2}
                className="rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Full Curriculum / Details</label>
              <Textarea
                value={longDescription}
                onChange={e => setLongDescription(e.target.value)}
                placeholder="Detailed outline of modules, downloads, blueprints, or bonuses..."
                rows={3}
                className="rounded-xl text-xs"
              />
            </div>

            {/* DIGITAL ACCESS LINK & INSTRUCTIONS */}
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-3">
              <div>
                <label className="text-xs font-black uppercase text-foreground flex items-center gap-1.5 mb-1">
                  <Download className="h-3.5 w-3.5 text-orange-500" />
                  Digital Access / Download Link *
                </label>
                <Input
                  value={digitalAccessUrl}
                  onChange={e => setDigitalAccessUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or download portal URL"
                  required
                  className="rounded-xl text-xs bg-background"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Granted instantly to customers on order confirmation.
                </p>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-foreground block mb-1">
                  Access Instructions Shown After Payment
                </label>
                <Textarea
                  value={accessInstructions}
                  onChange={e => setAccessInstructions(e.target.value)}
                  placeholder="e.g., Click the link to open your Google Drive folder and save the masterclass materials..."
                  rows={2}
                  className="rounded-xl text-xs bg-background"
                />
              </div>
            </div>

            {/* REQUIREMENT 5: LET ADMINISTRATORS CHOOSE PAYMENT METHODS */}
            <div className="p-4 rounded-2xl bg-card border-2 border-border/80 space-y-2.5">
              <label className="text-xs font-black uppercase tracking-wider text-foreground block">
                Allowed Payment Methods for this Product:
              </label>
              <p className="text-[11px] text-muted-foreground">
                Choose which payment method(s) customers are allowed to use at checkout for this specific product listing.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPaymentMethods('wallet_only')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    paymentMethods === 'wallet_only'
                      ? 'border-orange-500 bg-orange-500/10 font-bold'
                      : 'border-border/80 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-black">
                    <Wallet className="h-3.5 w-3.5 text-orange-500" />
                    <span>Wallet Only</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Deducts from Naira task wallet only</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethods('paystack_only')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    paymentMethods === 'paystack_only'
                      ? 'border-blue-500 bg-blue-500/10 font-bold'
                      : 'border-border/80 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-black">
                    <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                    <span>Paystack Only</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Card, USSD &amp; Bank Transfer only</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethods('both')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    paymentMethods === 'both'
                      ? 'border-emerald-500 bg-emerald-500/10 font-bold'
                      : 'border-border/80 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-black">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Both Methods</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Customer chooses Wallet or Paystack</p>
                </button>
              </div>
            </div>

            {/* Active Status Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
              <div>
                <p className="text-xs font-bold text-foreground">Published Status</p>
                <p className="text-[10px] text-muted-foreground">Make available to customers immediately</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="flex gap-2.5 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1 h-11 rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-xs shadow-md"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingProduct ? "Update Product" : "Publish Digital Product"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDigitalProductsManager;
