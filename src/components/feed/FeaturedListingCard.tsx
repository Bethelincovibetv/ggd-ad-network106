import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Store, ArrowRight } from 'lucide-react';

interface Props { listing: any }

/** Existing Featured Listings surfaced natively inside the Community Feed. */
const FeaturedListingCard: React.FC<Props> = ({ listing }) => {
  const href = `/product/${listing.id}`;
  const isService = (listing.listing_type || 'product') === 'service';
  return (
    <Card className="border border-yellow-500/30 shadow-sm overflow-hidden rounded-xl">
      <CardContent className="p-0">
        <div className="px-3 pt-3 pb-2 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center">
            <Store className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-[13px] truncate">{listing.business_name || 'GGD Business'}</p>
              <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-600 shrink-0">
                <Sparkles className="h-2.5 w-2.5" /> FEATURED LISTING
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">{isService ? 'Service' : 'Product'} listing</p>
          </div>
        </div>

        <Link to={href} className="block">
          {listing.image_url && (
            <img src={listing.image_url} alt={listing.title} className="w-full max-h-[420px] object-cover" />
          )}
          <div className="px-3 py-2">
            <p className="font-bold text-[14px] leading-snug">{listing.title}</p>
            {listing.description && (
              <p className="text-[13px] text-muted-foreground line-clamp-2 mt-0.5">{listing.description}</p>
            )}
            {listing.price != null && (
              <p className="text-[15px] font-black text-orange-600 mt-1">₦{Number(listing.price).toLocaleString()}</p>
            )}
          </div>
        </Link>

        <div className="p-3 pt-0">
          <Button asChild className="w-full h-11 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 font-bold">
            <Link to={href}>View {isService ? 'service' : 'product'} <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeaturedListingCard;