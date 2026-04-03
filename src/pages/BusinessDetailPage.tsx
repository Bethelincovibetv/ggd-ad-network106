import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, Globe, Phone, Facebook, Instagram, Send, ExternalLink, ArrowLeft, MapPin, Star, Crown, MessageCircle, Loader2, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ggdLogo from '@/assets/ggd-logo.png';

const BusinessDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [category, setCategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchBusiness();
  }, [id]);

  const fetchBusiness = async () => {
    const { data } = await (supabase.from('business_profiles') as any).select('*').eq('id', id).single();
    setBusiness(data);
    if (data?.category_id) {
      const { data: cat } = await (supabase.from('business_categories') as any).select('*').eq('id', data.category_id).single();
      setCategory(cat);
    }
    const { data: listingsData } = await (supabase.from('business_listings') as any).select('*').eq('business_profile_id', id).eq('is_active', true).order('is_featured', { ascending: false });
    setListings(listingsData || []);
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-orange-50">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
    </div>
  );

  if (!business) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-orange-50 gap-4">
      <Store className="h-16 w-16 text-muted-foreground opacity-30" />
      <p className="text-muted-foreground">Business not found</p>
      <Button onClick={() => navigate('/')} variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Go Back</Button>
    </div>
  );

  const socialLinks = [
    { key: 'whatsapp_link', icon: Phone, label: 'WhatsApp', color: 'bg-green-500 hover:bg-green-600' },
    { key: 'whatsapp_group_link', icon: MessageCircle, label: 'WhatsApp Group', color: 'bg-green-600 hover:bg-green-700' },
    { key: 'website_link', icon: Globe, label: 'Website', color: 'bg-blue-500 hover:bg-blue-600' },
    { key: 'facebook_url', icon: Facebook, label: 'Facebook', color: 'bg-blue-600 hover:bg-blue-700' },
    { key: 'instagram_url', icon: Instagram, label: 'Instagram', color: 'bg-pink-500 hover:bg-pink-600' },
    { key: 'telegram_url', icon: Send, label: 'Telegram', color: 'bg-sky-500 hover:bg-sky-600' },
    { key: 'tiktok_url', icon: ExternalLink, label: 'TikTok', color: 'bg-gray-800 hover:bg-gray-900' },
  ];

  const activeSocials = socialLinks.filter(s => business[s.key]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50">
      {/* Header */}
      <header className="bg-card/90 backdrop-blur border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 text-xs">
            <ArrowLeft className="h-4 w-4" />Back
          </Button>
          <div className="flex items-center gap-2">
            <img src={ggdLogo} alt="GGD" className="h-6 w-6 rounded-lg" />
            <span className="text-sm font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">GGD Network</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 text-white">
        <div className="container mx-auto px-4 py-8 text-center">
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.business_name} className="h-24 w-24 rounded-2xl mx-auto mb-4 object-cover border-4 border-white/30 shadow-2xl" />
          ) : (
            <div className="h-24 w-24 rounded-2xl mx-auto mb-4 bg-white/20 flex items-center justify-center">
              <Store className="h-12 w-12 text-white/80" />
            </div>
          )}
          <h1 className="text-2xl font-black">{business.business_name}</h1>
          {category && (
            <Badge className="mt-2 bg-white/20 text-white border-white/30">{category.name}</Badge>
          )}
          {business.description && (
            <p className="mt-3 text-sm text-white/85 max-w-md mx-auto">{business.description}</p>
          )}
          {business.address && (
            <p className="mt-2 text-xs text-white/70 flex items-center justify-center gap-1">
              <MapPin className="h-3 w-3" />{business.address}
            </p>
          )}
          {business.phone_number && (
            <p className="mt-1 text-xs text-white/70 flex items-center justify-center gap-1">
              <Phone className="h-3 w-3" />{business.phone_number}
            </p>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Contact Links */}
        {activeSocials.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">📱 Connect With Us</h2>
            <div className="grid grid-cols-2 gap-2">
              {activeSocials.map(s => (
                <Button
                  key={s.key}
                  className={`${s.color} text-white justify-start gap-2 h-11`}
                  onClick={() => window.open(business[s.key], '_blank')}
                >
                  <s.icon className="h-4 w-4" />
                  <span className="text-sm">{s.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Products/Services */}
        {listings.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-foreground mb-3">🛍️ Products & Services</h2>
            <div className="space-y-3">
              {listings.map(listing => (
                <Card key={listing.id} className={`overflow-hidden ${listing.is_featured ? 'border-yellow-300 shadow-lg' : ''}`}>
                  <CardContent className="p-0">
                    {listing.is_featured && (
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 px-3 py-1 flex items-center gap-1">
                        <Crown className="h-3 w-3 text-white" />
                        <span className="text-[10px] font-bold text-white">FEATURED</span>
                      </div>
                    )}
                    <div className="flex gap-3 p-3">
                      {listing.image_url && (
                        <img src={listing.image_url} alt={listing.title} className="h-20 w-20 rounded-xl object-cover flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm text-foreground">{listing.title}</h3>
                        {listing.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{listing.description}</p>}
                        {listing.price > 0 && (
                          <p className="text-sm font-bold text-orange-600 mt-1">₦{Number(listing.price).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Paystack payment info */}
        {business.paystack_enabled && business.paystack_public_key && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <ShoppingBag className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="text-sm font-bold text-green-800">This business accepts online payments</p>
              <p className="text-xs text-green-600 mt-1">Powered by Paystack</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BusinessDetailPage;
