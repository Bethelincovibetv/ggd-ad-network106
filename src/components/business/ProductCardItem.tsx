import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Package,
  Zap,
  Crown,
  Pencil,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Sparkles,
  Play,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BlazingBadge } from "@/components/BlazingBadge";
import { broadcastFeaturedProductNotification } from "@/services/pushNotificationService";

interface ProductCardItemProps {
  item: any;
  onEdit: (item: any) => void;
  onRefresh: () => void;
  userCredits?: number;
}

export const ProductCardItem: React.FC<ProductCardItemProps> = ({
  item,
  onEdit,
  onRefresh,
  userCredits = 0,
}) => {
  const isService = item.listing_type === 'service';
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [featuring, setFeaturing] = useState(false);

  const handleToggleStatus = async (checked: boolean) => {
    setTogglingStatus(true);
    try {
      const { error } = await (supabase.from('business_listings') as any)
        .update({ is_active: checked })
        .eq('id', item.id);
      if (error) throw error;
      toast.success(checked ? "Listing published!" : "Listing set to draft (hidden)");
      onRefresh();
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleFeature = async () => {
    const cost = 10;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setFeaturing(true);
    try {
      const { data: prof } = await supabase.from('profiles').select('credits').eq('user_id', user.id).single();
      if (!prof || (prof.credits || 0) < cost) {
        toast.error(`You need ${cost} credits to feature this item. (Current: ${prof?.credits || 0})`);
        setFeaturing(false);
        return;
      }

      // Deduct credits
      const { error: credErr } = await supabase
        .from('profiles')
        .update({ credits: prof.credits - cost })
        .eq('user_id', user.id);
      if (credErr) throw credErr;

      // Set featured for 7 days
      const featuredUntil = new Date();
      featuredUntil.setDate(featuredUntil.getDate() + 7);

      const { error: listErr } = await (supabase.from('business_listings') as any)
        .update({
          is_featured: true,
          featured_until: featuredUntil.toISOString(),
        })
        .eq('id', item.id);
      if (listErr) throw listErr;

      // Broadcast real-time push notification for the newly featured product
      await broadcastFeaturedProductNotification({
        id: item.id,
        title: item.title,
        price: item.price,
        image_url: item.image_url,
      });

      toast.success("🔥 Product is now Blazing Featured! Push notification broadcasted to users.");
      onRefresh();
    } catch (err: any) {
      toast.error("Failed to feature: " + err.message);
    } finally {
      setFeaturing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await (supabase.from('business_listings') as any)
        .delete()
        .eq('id', item.id);
      if (error) throw error;
      toast.success("Listing deleted");
      onRefresh();
    } catch (err: any) {
      toast.error("Failed to delete: " + err.message);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const isFeatured = item.is_featured && (!item.featured_until || new Date(item.featured_until) > new Date());
  const isActive = item.is_active !== false;

  return (
    <>
      <Card
        className={`overflow-hidden border transition-all duration-200 hover:shadow-md ${
          isFeatured
            ? 'border-amber-300/80 bg-gradient-to-br from-amber-500/[0.04] to-orange-500/[0.02] shadow-amber-500/5'
            : !isActive
            ? 'border-border/60 opacity-80 bg-muted/20'
            : 'border-border/70 bg-card'
        }`}
      >
        <CardContent className="p-3.5 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Visual Thumbnail */}
            <div className="relative h-24 w-full sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-muted flex-shrink-0">
              {item.image_url ? (
                <img
                  loading="lazy"
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted to-muted/60 text-muted-foreground/60">
                  {isService ? (
                    <Zap className="h-8 w-8 text-purple-400" />
                  ) : (
                    <Package className="h-8 w-8 text-blue-400" />
                  )}
                </div>
              )}

              {/* Badges on Thumbnail */}
              <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                <Badge
                  className={`text-[9px] font-black uppercase px-2 py-0.5 border-0 shadow-sm ${
                    isService
                      ? 'bg-purple-600 text-white'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {isService ? 'Service' : 'Product'}
                </Badge>
              </div>

              {item.video_url && (
                <div className="absolute bottom-1.5 right-1.5 h-6 w-6 rounded-full bg-black/75 text-white grid place-items-center shadow-md">
                  <Play className="h-3 w-3 fill-white ml-0.5" />
                </div>
              )}
            </div>

            {/* Content Details */}
            <div className="min-w-0 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-sm sm:text-base text-foreground truncate max-w-full">
                        {item.title}
                      </h4>
                      {isFeatured && (
                        <BlazingBadge label="BLAZING FEATURED" size="sm" />
                      )}
                    </div>

                    {/* Price Display */}
                    <div className="mt-1">
                      {Number(item.price) > 0 ? (
                        <p className="text-base sm:text-lg font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                          {isService ? 'Starting at ' : ''}₦{Number(item.price).toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-xs font-bold text-muted-foreground">
                          {isService ? 'Rate: Contact for Quote' : 'Price on Inquiry'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick Active Toggle */}
                  <div className="flex items-center gap-1.5 shrink-0 bg-muted/40 px-2 py-1 rounded-xl border border-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground hidden sm:inline">
                      {isActive ? 'Active' : 'Draft'}
                    </span>
                    <Switch
                      checked={isActive}
                      onCheckedChange={handleToggleStatus}
                      disabled={togglingStatus}
                      className="scale-90"
                    />
                  </div>
                </div>

                {/* Description */}
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border/50">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(item)}
                    className="h-9 px-3 text-xs font-bold gap-1 rounded-xl border-border/70 hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5 text-blue-600" />
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(`/product/${item.id}`, '_blank')}
                    className="h-9 px-2.5 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground rounded-xl"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Preview
                  </Button>
                </div>

                <div className="flex items-center gap-1.5">
                  {!isFeatured ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleFeature}
                      disabled={featuring}
                      title="Feature at top of storefront & directory for 7 days (10 credits)"
                      className="h-9 px-2.5 text-xs font-bold text-amber-700 dark:text-amber-300 border-amber-400/50 hover:bg-amber-50 dark:hover:bg-amber-950/20 gap-1 rounded-xl"
                    >
                      {featuring ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                      )}
                      Feature (10c)
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50 h-8 px-2">
                      ⭐ Featured Active
                    </Badge>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                    title="Delete listing"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-black">
              Delete this {isService ? 'Service' : 'Product'}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete "{item.title}"? This will permanently remove it from your business catalog and public storefront.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={deleting} className="text-xs font-bold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProductCardItem;
