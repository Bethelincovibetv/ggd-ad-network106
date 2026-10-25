import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Link2, Copy, Check, ExternalLink, Sparkles, MessageSquare, Globe, Store,
  Package, Loader2, BarChart2, Plus, ArrowRight, ShieldCheck
} from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhone, buildWhatsAppLink } from "@/lib/whatsapp";

interface MarketingLinkGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectLink?: (linkUrl: string) => void;
}

const generateSlug = () => Math.random().toString(36).substring(2, 8);

export const MarketingLinkGeneratorModal: React.FC<MarketingLinkGeneratorModalProps> = ({
  open,
  onOpenChange,
  onSelectLink,
}) => {
  const [activeType, setActiveType] = useState<'whatsapp' | 'storefront' | 'website' | 'product'>('whatsapp');
  const [loading, setLoading] = useState(false);
  const [fetchingExisting, setFetchingExisting] = useState(false);
  const [existingLinks, setExistingLinks] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states
  const [waPhone, setWaPhone] = useState('');
  const [waMessage, setWaMessage] = useState('Hello! I saw your banner advert on GGD and I would like to get more information.');
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [myBusinessSlug, setMyBusinessSlug] = useState('');
  const [myUserId, setMyUserId] = useState('');
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (open) {
      loadUserDataAndLinks();
    }
  }, [open]);

  const loadUserDataAndLinks = async () => {
    setFetchingExisting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setFetchingExisting(false);
      return;
    }
    setMyUserId(user.id);

    const [linksRes, profRes, bizRes, listingsRes] = await Promise.all([
      supabase.from('short_links').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('profiles').select('business_slug, business_phone, business_name').eq('user_id', user.id).maybeSingle(),
      (supabase.from('business_profiles') as any).select('whatsapp_link, website_link, business_name, slug').eq('user_id', user.id).maybeSingle(),
      (supabase.from('business_listings') as any).select('id, title, price, listing_type').eq('user_id', user.id).limit(10),
    ]);

    setExistingLinks(linksRes.data || []);

    const slug = bizRes.data?.slug || profRes.data?.business_slug || '';
    setMyBusinessSlug(slug);

    const phone = bizRes.data?.whatsapp_link || profRes.data?.business_phone || '';
    if (phone && !waPhone) {
      setWaPhone(phone.replace(/[^\d+]/g, ''));
    }

    if (bizRes.data?.business_name && !customTitle) {
      setCustomTitle(`${bizRes.data.business_name} Advert Link`);
    }

    setMyProducts(listingsRes.data || []);
    setFetchingExisting(false);
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Marketing link copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSelectAndClose = (url: string) => {
    if (onSelectLink) {
      onSelectLink(url);
      toast.success("Link selected and inserted into your advert!");
    }
    onOpenChange(false);
  };

  const handleGenerateLink = async () => {
    let destinationUrl = '';
    let linkTitle = customTitle.trim();

    if (activeType === 'whatsapp') {
      const cleanPhone = normalizePhone(waPhone);
      if (!cleanPhone || cleanPhone.length < 7) {
        toast.error("Please provide a valid WhatsApp phone number");
        return;
      }
      destinationUrl = buildWhatsAppLink(cleanPhone, { message: waMessage.trim() || 'Hello, I saw your ad on GGD Ad Network!' });
      if (!linkTitle) linkTitle = 'WhatsApp Direct Contact';
    } else if (activeType === 'storefront') {
      if (myBusinessSlug) {
        destinationUrl = `${origin}/b/${myBusinessSlug}`;
      } else if (myUserId) {
        destinationUrl = `${origin}/user/${myUserId}`;
      } else {
        destinationUrl = `${origin}/#directory`;
      }
      if (!linkTitle) linkTitle = 'Digital Business Storefront';
    } else if (activeType === 'product') {
      if (!selectedProductId) {
        toast.error("Please select one of your products or services");
        return;
      }
      const prod = myProducts.find(p => p.id === selectedProductId);
      destinationUrl = `${origin}/product/${selectedProductId}`;
      if (!linkTitle) linkTitle = prod ? `${prod.title} Offer` : 'Product Link';
    } else {
      // Website URL
      let cleanUrl = customUrl.trim();
      if (!cleanUrl) {
        toast.error("Please enter a destination landing page URL");
        return;
      }
      if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl;
      }
      destinationUrl = cleanUrl;
      if (!linkTitle) linkTitle = 'Advert Landing Page';
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to generate a marketing link");
        setLoading(false);
        return;
      }

      const slug = (customSlug.trim() || generateSlug())
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 24) || generateSlug();

      const { data: newLink, error } = await supabase.from('short_links').insert({
        user_id: user.id,
        slug,
        target_url: destinationUrl.slice(0, 2000),
        title: linkTitle.slice(0, 120),
        link_type: activeType,
      }).select().single();

      if (error) {
        if (error.message.includes('duplicate')) {
          toast.error("This link slug is already taken. Please try another custom slug.");
        } else {
          toast.error(error.message || "Failed to create marketing link");
        }
        setLoading(false);
        return;
      }

      const fullShortUrl = `${origin}/r/${slug}`;
      toast.success("🎉 Marketing link created successfully!");

      // Refresh links
      await loadUserDataAndLinks();

      // If opened from ad creation form, auto-select it
      if (onSelectLink) {
        onSelectLink(fullShortUrl);
        onOpenChange(false);
      } else {
        handleCopy(fullShortUrl, newLink.id);
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.25rem)] max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-3xl p-4 sm:p-6 mx-auto border border-border/80 shadow-2xl">
        <DialogHeader className="space-y-1 text-left min-w-0 max-w-full">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 grid place-items-center text-white shadow-md shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base sm:text-lg font-black truncate">
                Marketing Link Generator
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-tight line-clamp-2">
                Generate trackable, conversion-ready landing links for your banner adverts and campaigns.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2 min-w-0 max-w-full overflow-hidden">
          {/* Link Type Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setActiveType('whatsapp')}
              className={`p-2.5 sm:p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between min-w-0 overflow-hidden ${
                activeType === 'whatsapp'
                  ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-300'
                  : 'border-border/60 hover:border-border text-muted-foreground'
              }`}
            >
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 mb-1.5 text-green-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">WhatsApp Link</p>
                <p className="text-[10px] opacity-75 truncate">Direct chat & orders</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveType('storefront')}
              className={`p-2.5 sm:p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between min-w-0 overflow-hidden ${
                activeType === 'storefront'
                  ? 'border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-300'
                  : 'border-border/60 hover:border-border text-muted-foreground'
              }`}
            >
              <Store className="h-4 w-4 sm:h-5 sm:w-5 mb-1.5 text-orange-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">My Storefront</p>
                <p className="text-[10px] opacity-75 truncate">Official business site</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveType('website')}
              className={`p-2.5 sm:p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between min-w-0 overflow-hidden ${
                activeType === 'website'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                  : 'border-border/60 hover:border-border text-muted-foreground'
              }`}
            >
              <Globe className="h-4 w-4 sm:h-5 sm:w-5 mb-1.5 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">Website URL</p>
                <p className="text-[10px] opacity-75 truncate">Custom landing page</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveType('product')}
              className={`p-2.5 sm:p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between min-w-0 overflow-hidden ${
                activeType === 'product'
                  ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300'
                  : 'border-border/60 hover:border-border text-muted-foreground'
              }`}
            >
              <Package className="h-4 w-4 sm:h-5 sm:w-5 mb-1.5 text-purple-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">Product Offer</p>
                <p className="text-[10px] opacity-75 truncate">Link to item</p>
              </div>
            </button>
          </div>

          {/* Form Fields Based on Type */}
          <div className="bg-muted/40 p-3.5 sm:p-4 rounded-2xl border border-border/50 space-y-3.5 min-w-0 max-w-full overflow-hidden">
            {activeType === 'whatsapp' && (
              <>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-bold">WhatsApp Phone Number</Label>
                  <Input
                    placeholder="e.g. 08012345678 or 2348012345678"
                    value={waPhone}
                    onChange={(e) => setWaPhone(e.target.value)}
                    className="h-10 rounded-xl bg-background text-xs sm:text-sm min-w-0"
                  />
                  <p className="text-[10.5px] text-muted-foreground leading-tight">
                    When customers click your advert, WhatsApp will immediately open a chat with this number.
                  </p>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-bold">Pre-Filled Greeting Message</Label>
                  <Textarea
                    placeholder="Enter the message customers will send you automatically..."
                    value={waMessage}
                    onChange={(e) => setWaMessage(e.target.value)}
                    rows={2}
                    className="rounded-xl bg-background text-xs sm:text-sm resize-none min-w-0"
                  />
                </div>
              </>
            )}

            {activeType === 'storefront' && (
              <div className="space-y-2 min-w-0 max-w-full">
                <p className="text-xs font-bold text-foreground truncate">Destination: Your GGD Digital Business Website</p>
                <div className="p-2.5 sm:p-3 bg-background rounded-xl border border-border/60 text-[11px] sm:text-xs font-mono text-muted-foreground break-all max-w-full overflow-hidden">
                  {myBusinessSlug ? `${origin}/b/${myBusinessSlug}` : `${origin}/user/${myUserId || 'your-profile'}`}
                </div>
                <p className="text-[10.5px] text-muted-foreground leading-tight">
                  Advert clicks will be directed straight to your official storefront, business biography, catalog, and verified contacts.
                </p>
              </div>
            )}

            {activeType === 'website' && (
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs font-bold">Destination Landing Page URL</Label>
                <Input
                  placeholder="https://yourwebsite.com/special-offer"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="h-10 rounded-xl bg-background text-xs sm:text-sm min-w-0"
                />
                <p className="text-[10.5px] text-muted-foreground leading-tight">
                  Any external landing page, portfolio, linktree, or Shopify/Paystack store URL.
                </p>
              </div>
            )}

            {activeType === 'product' && (
              <div className="space-y-2 min-w-0 max-w-full">
                <Label className="text-xs font-bold">Select Your Product / Service</Label>
                {myProducts.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {myProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedProductId(p.id)}
                        className={`w-full p-2.5 rounded-xl text-left text-xs flex items-center justify-between border transition min-w-0 ${
                          selectedProductId === p.id
                            ? 'border-orange-500 bg-orange-500/10 font-bold'
                            : 'border-border/40 bg-background hover:bg-muted'
                        }`}
                      >
                        <span className="truncate flex-1 min-w-0 mr-2">{p.title}</span>
                        {p.price && <span className="text-orange-600 font-bold shrink-0">₦{Number(p.price).toLocaleString()}</span>}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    You have not published any listings yet. You can use the WhatsApp link or Storefront option instead!
                  </p>
                )}
              </div>
            )}

            {/* Common options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 min-w-0">
              <div className="space-y-1 min-w-0">
                <Label className="text-[11px] font-semibold text-muted-foreground">Campaign / Link Label (Optional)</Label>
                <Input
                  placeholder="e.g. Summer Promo Link"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="h-9 rounded-xl bg-background text-xs min-w-0"
                />
              </div>
              <div className="space-y-1 min-w-0">
                <Label className="text-[11px] font-semibold text-muted-foreground">Custom Link Slug (Optional)</Label>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[11px] text-muted-foreground font-mono shrink-0">/r/</span>
                  <Input
                    placeholder="my-promo"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    className="h-9 rounded-xl bg-background text-xs font-mono min-w-0 flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleGenerateLink}
            disabled={loading}
            className="w-full h-11 sm:h-12 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold shadow-lg shadow-orange-500/20 text-xs sm:text-sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {onSelectLink ? "Generate & Use in Advert" : "Generate Trackable Marketing Link"}
          </Button>

          {/* Recently Generated Links */}
          {existingLinks.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/40 min-w-0 max-w-full">
              <div className="flex items-center justify-between min-w-0">
                <p className="text-xs font-black text-foreground truncate">Your Generated Marketing Links</p>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {existingLinks.length} Links
                </Badge>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 min-w-0 max-w-full">
                {existingLinks.map((item) => {
                  const fullUrl = `${origin}/r/${item.slug}`;
                  const isCopied = copiedId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-2xl border border-border/60 bg-card hover:bg-muted/40 transition flex items-center justify-between gap-2 min-w-0 max-w-full overflow-hidden"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-xs font-bold truncate text-foreground flex-1 min-w-0">
                            {item.title || item.slug}
                          </p>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 shrink-0">
                            /r/{item.slug}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5 font-mono max-w-full">
                          {item.target_url}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5 shrink-0">
                            <BarChart2 className="h-3 w-3 text-emerald-500" />
                            {item.clicks || 0} clicks
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {onSelectLink && (
                          <Button
                            size="sm"
                            onClick={() => handleSelectAndClose(fullUrl)}
                            className="h-8 px-2 text-[11px] font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white shrink-0"
                          >
                            Use in Ad
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(fullUrl, item.id)}
                          className="h-8 w-8 p-0 rounded-xl shrink-0"
                          title="Copy Link"
                        >
                          {isCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                        <a
                          href={fullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 w-8 rounded-xl border border-border/60 grid place-items-center hover:bg-muted text-muted-foreground shrink-0"
                          title="Test Link in new tab"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
