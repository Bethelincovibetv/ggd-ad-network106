import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Package, Zap, Upload, Loader2, Save, X, ImagePlus, Video, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ListingFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingType: 'product' | 'service';
  editingItem?: any | null;
  businessProfileId: string;
  userId: string;
  onSaved: () => void;
}

export const ListingFormModal: React.FC<ListingFormModalProps> = ({
  open,
  onOpenChange,
  listingType,
  editingItem,
  businessProfileId,
  userId,
  onSaved,
}) => {
  const isService = listingType === 'service';
  const isEditing = !!editingItem;

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title || '');
      setPrice(editingItem.price != null ? String(editingItem.price) : '');
      setDescription(editingItem.description || '');
      setLongDescription(editingItem.long_description || '');
      setImageUrl(editingItem.image_url || '');
      setExtraImages(Array.isArray(editingItem.extra_images) ? editingItem.extra_images : []);
      setVideoUrl(editingItem.video_url || '');
      setIsActive(editingItem.is_active !== false);
    } else {
      // Reset form for fresh create
      setTitle('');
      setPrice('');
      setDescription('');
      setLongDescription('');
      setImageUrl('');
      setExtraImages([]);
      setVideoUrl('');
      setIsActive(true);
    }
  }, [editingItem, open]);

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/listing-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
      // Use standard avatars bucket (which has public read and user upsert access)
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) {
        toast.error("Upload failed: " + error.message);
        return null;
      }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      return publicUrl;
    } catch (err: any) {
      toast.error("Upload error: " + (err?.message || "Could not upload file"));
      return null;
    }
  };

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const url = await uploadFile(file);
    if (url) {
      setImageUrl(url);
      toast.success("Image uploaded successfully!");
    }
    setUploadingImage(false);
  };

  const handleExtraImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (extraImages.length >= 4) {
      toast.error("You can add up to 4 gallery images");
      return;
    }
    setUploadingExtra(true);
    const url = await uploadFile(file);
    if (url) {
      setExtraImages(prev => [...prev, url]);
      toast.success("Gallery photo added!");
    }
    setUploadingExtra(false);
  };

  const removeExtraImage = (indexToRemove: number) => {
    setExtraImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(isService ? "Service name is required" : "Product name is required");
      return;
    }
    if (!businessProfileId || !userId) {
      toast.error("Business profile not ready. Please try again in a moment.");
      return;
    }

    setSaving(true);
    try {
      const numPrice = price.trim() === '' ? 0 : parseFloat(price);
      const payload: any = {
        title: title.trim().slice(0, 150),
        description: description.trim().slice(0, 500) || null,
        long_description: longDescription.trim() || null,
        price: isNaN(numPrice) ? 0 : numPrice,
        image_url: imageUrl.trim() || null,
        extra_images: extraImages.length > 0 ? extraImages : null,
        video_url: videoUrl.trim() || null,
        listing_type: listingType,
        is_active: isActive,
      };

      if (isEditing) {
        const { error } = await (supabase.from('business_listings') as any)
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
        toast.success(isService ? "Service updated! ✨" : "Product updated! ✨");
      } else {
        const insertPayload = {
          ...payload,
          business_profile_id: businessProfileId,
          user_id: userId,
        };
        const { error } = await (supabase.from('business_listings') as any)
          .insert(insertPayload);
        if (error) throw error;
        toast.success(isService ? "Service added successfully! 🎉" : "Product added successfully! 🎉");
      }

      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error("Failed to save: " + (err?.message || "An unexpected error occurred"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-3xl sm:rounded-3xl border-border/80 shadow-2xl">
        <DialogHeader className="space-y-1.5 text-left border-b pb-3">
          <div className="flex items-center gap-2">
            <div className={`h-9 w-9 rounded-xl grid place-items-center text-white shadow-md ${isService ? 'bg-gradient-to-br from-purple-500 to-pink-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600'}`}>
              {isService ? <Zap className="h-5 w-5" /> : <Package className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-foreground">
                {isEditing ? `Edit ${isService ? 'Service' : 'Product'}` : `Add New ${isService ? 'Service' : 'Product'}`}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isService
                  ? "Detail your professional service offering and inquiry rate"
                  : "List your product with pricing, details, and photos"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Title */}
          <div>
            <Label className="text-xs font-bold text-foreground">
              {isService ? "Service Name *" : "Product Name *"}
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isService ? "e.g., Website Development, Graphic Design, Legal Advice" : "e.g., Organic Shea Butter, Wireless Earbuds, Fashion Dress"}
              className="mt-1 h-11 text-sm"
              maxLength={120}
            />
          </div>

          {/* Pricing */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">
                {isService ? "Starting Rate or Fee (₦)" : "Price (₦) *"}
              </Label>
              {isService && (
                <span className="text-[10px] text-muted-foreground">
                  Leave empty or 0 for "Quote upon inquiry"
                </span>
              )}
            </div>
            <div className="relative mt-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₦</span>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={isService ? "0" : "5000"}
                className="pl-8 h-11 text-sm font-bold"
                min="0"
                step="any"
              />
            </div>
          </div>

          {/* Short Description */}
          <div>
            <Label className="text-xs font-bold text-foreground">
              Short Description / Summary
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isService ? "One or two sentences summarizing the key outcome and deliverable..." : "Brief overview of what makes this product special..."}
              rows={2}
              className="mt-1 text-xs"
              maxLength={300}
            />
          </div>

          {/* Full / Detailed Description */}
          <div>
            <Label className="text-xs font-bold text-foreground">
              {isService ? "Full Deliverables & Scope" : "Detailed Specifications & Inclusions"}
            </Label>
            <Textarea
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              placeholder={isService ? "Detailed breakdown of the process, timeline, prerequisites, and what clients receive upon completion..." : "Full product specs, materials, sizing, warranty, or delivery details..."}
              rows={3}
              className="mt-1 text-xs"
            />
          </div>

          {/* Primary Image */}
          <div>
            <Label className="text-xs font-bold text-foreground block mb-1">
              {isService ? "Service Banner / Feature Image" : "Main Product Photo"}
            </Label>
            {imageUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-border group bg-muted/30">
                <img src={imageUrl} alt="Listing preview" className="w-full h-40 object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/70 text-white grid place-items-center hover:bg-black transition-colors"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-border/80 hover:border-orange-500/80 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/40 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMainImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
                {uploadingImage ? (
                  <div className="flex items-center gap-2 text-xs text-orange-600 font-bold py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading photo...
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-foreground">Click to upload photo</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG or WebP up to 5MB</p>
                  </div>
                )}
              </label>
            )}
          </div>

          {/* Extra Gallery Photos */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-bold text-foreground">
                Gallery Photos (Optional)
              </Label>
              <span className="text-[10px] text-muted-foreground">{extraImages.length}/4 added</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {extraImages.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                  <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExtraImage(idx)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 text-white grid place-items-center hover:bg-black"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {extraImages.length < 4 && (
                <label className="aspect-square border-2 border-dashed border-border/70 hover:border-orange-500 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted/40 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleExtraImageUpload}
                    disabled={uploadingExtra}
                    className="hidden"
                  />
                  {uploadingExtra ? (
                    <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  )}
                </label>
              )}
            </div>
          </div>

          {/* Video Demonstration URL */}
          <div>
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 text-orange-500" />
              Demo / Showcase Video Link (Optional)
            </Label>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or direct MP4 link"
              className="mt-1 h-10 text-xs"
            />
          </div>

          {/* Active Status Switch */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/50">
            <div>
              <p className="text-xs font-bold text-foreground">Publish on Public Storefront</p>
              <p className="text-[10px] text-muted-foreground">
                {isActive ? "Visible to customers on your public page and business directory" : "Saved as draft — hidden from public view"}
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex gap-2.5 pt-4 border-t mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="flex-1 h-11 font-bold text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 h-11 font-bold text-xs text-white shadow-md ${isService ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'}`}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" />
                {isEditing ? "Save Changes" : `Create ${isService ? 'Service' : 'Product'}`}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ListingFormModal;
