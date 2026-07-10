import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Store, Search, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AdDisplayPreview from '@/components/AdDisplayPreview';

const IndustryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<any>(null);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: cat } = await (supabase.from('business_categories') as any).select('*').eq('slug', slug).maybeSingle();
      setCategory(cat);
      if (cat) {
        const { data: biz } = await (supabase.from('business_profiles') as any)
          .select('*').eq('is_directory_listed', true).eq('category_id', cat.id);
        setBusinesses(biz || []);
      }
      setLoading(false);
    })();
  }, [slug]);

  const goBack = () => window.history.length > 1 ? navigate(-1) : navigate('/');

  const filtered = businesses.filter(b => !q || b.business_name?.toLowerCase().includes(q.toLowerCase()));

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>;
  if (!category) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <p className="text-muted-foreground">Industry not found</p>
      <Button onClick={goBack} variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 dark:from-background dark:to-background">
      <header className="bg-card/90 backdrop-blur border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goBack} className="gap-1"><ArrowLeft className="h-4 w-4" />Back</Button>
          <span className="text-sm font-bold flex-1 truncate">{category.name}</span>
        </div>
      </header>

      <div className="relative h-40 md:h-56 overflow-hidden">
        {category.banner_url ? (
          <img src={category.banner_url} alt={category.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-500 via-red-500 to-pink-600" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="text-xs opacity-80 uppercase tracking-widest">Industry</p>
          <h1 className="text-3xl md:text-4xl font-black">{category.name}</h1>
          {category.description && <p className="text-sm opacity-90 mt-1 line-clamp-2">{category.description}</p>}
        </div>
      </div>

      <div className="container mx-auto px-4 py-5 max-w-4xl space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={`Search ${category.name}...`} value={q} onChange={e => setQ(e.target.value)} className="pl-10 h-11 rounded-xl" />
        </div>

        <p className="text-xs text-muted-foreground font-medium">{filtered.length} businesses in {category.name}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(biz => (
            <Card key={biz.id} className="overflow-hidden hover:shadow-lg transition cursor-pointer active:scale-[0.98]"
              onClick={() => navigate(`/business/${biz.id}`)}>
              <CardContent className="p-0">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 flex items-center gap-3">
                  {biz.logo_url ? (
                    <img src={biz.logo_url} alt={biz.business_name} className="h-14 w-14 rounded-xl object-cover border-2 border-white/30" />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center"><Store className="h-7 w-7 text-white/80" /></div>
                  )}
                  <div className="min-w-0 flex-1 text-white">
                    <h3 className="font-black text-sm truncate">{biz.business_name}</h3>
                    {biz.description && <p className="text-[11px] text-white/80 line-clamp-2">{biz.description}</p>}
                    {biz.address && <p className="text-[10px] text-white/70 flex items-center gap-1 mt-1"><MapPin className="h-2.5 w-2.5" />{biz.address}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Store className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No businesses listed in this industry yet</p>
            </div>
          )}
        </div>

        <div className="pt-4">
          <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wide mb-2">Sponsored</p>
          <AdDisplayPreview />
        </div>
      </div>
    </div>
  );
};

export default IndustryPage;