import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  Search,
  Store,
  ShoppingBag,
  Briefcase,
  ExternalLink,
  Trash2,
  Share2,
  Phone,
  Download,
  Upload,
  Sparkles,
  MapPin,
  CheckCircle2,
  Edit2,
  Save,
  X,
  Compass,
  ArrowRight
} from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { FavoriteItem, FavoriteType } from '@/types/favorites';
import { toast } from 'sonner';

interface FavoritesPageProps {
  onNavigateTab?: (tab: string) => void;
}

export const FavoritesPage: React.FC<FavoritesPageProps> = ({ onNavigateTab }) => {
  const navigate = useNavigate();
  const {
    favorites,
    totalCount,
    businessCount,
    productCount,
    serviceCount,
    removeFavorite,
    clearAllFavorites,
    updateFavoriteNotes,
    exportFavorites,
    importFavorites
  } = useFavorites();

  const [activeTypeTab, setActiveTypeTab] = useState<'all' | 'business' | 'product' | 'service'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importingJson, setImportingJson] = useState(false);
  const [jsonInputText, setJsonInputText] = useState('');

  const filteredFavorites = useMemo(() => {
    return favorites.filter((item) => {
      if (activeTypeTab !== 'all' && item.type !== activeTypeTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesSubtitle = item.subtitle?.toLowerCase().includes(q);
        const matchesCategory = item.category?.toLowerCase().includes(q);
        const matchesLocation = item.location?.toLowerCase().includes(q);
        const matchesBiz = item.businessName?.toLowerCase().includes(q);
        const matchesNotes = item.notes?.toLowerCase().includes(q);
        return (
          matchesTitle ||
          matchesSubtitle ||
          matchesCategory ||
          matchesLocation ||
          matchesBiz ||
          matchesNotes
        );
      }
      return true;
    });
  }, [favorites, activeTypeTab, searchQuery]);

  const handleOpenItem = (item: FavoriteItem) => {
    if (item.linkUrl.startsWith('/')) {
      navigate(item.linkUrl);
    } else {
      window.open(item.linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleShare = async (item: FavoriteItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const fullUrl = item.linkUrl.startsWith('/')
      ? `${window.location.origin}${item.linkUrl}`
      : item.linkUrl;

    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: `Check out ${item.title} on GGD Ad Network!`,
          url: fullUrl,
        });
      } catch {
        navigator.clipboard.writeText(fullUrl);
        toast.success('Link copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(fullUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleExport = () => {
    const data = exportFavorites();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ggd-favorites-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Favorites exported as JSON file!');
  };

  const handleImportSubmit = () => {
    if (!jsonInputText.trim()) {
      toast.error('Please paste valid favorites JSON');
      return;
    }
    try {
      const count = importFavorites(jsonInputText);
      toast.success(`Successfully imported ${count} new saved items!`);
      setImportingJson(false);
      setJsonInputText('');
    } catch {
      toast.error('Invalid JSON structure. Please check and try again.');
    }
  };

  const startEditNote = (item: FavoriteItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNoteId(item.id);
    setNoteDraft(item.notes || '');
  };

  const saveNote = (item: FavoriteItem, e: React.MouseEvent) => {
    e.stopPropagation();
    updateFavoriteNotes(item.targetId, noteDraft.trim());
    setEditingNoteId(null);
  };

  const formatPrice = (price?: number | string | null) => {
    if (!price || price === '0') return null;
    const num = Number(price);
    if (isNaN(num)) return String(price);
    return `₦${num.toLocaleString()}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold">
              <Heart className="h-3.5 w-3.5 fill-current" />
              <span>Personal Offline Quick Access</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              My Saved Favorites
            </h1>
            <p className="text-xs sm:text-sm text-rose-100 leading-relaxed font-medium">
              Keep track of top commercial partners, high-yield products, and verified services for immediate recall anytime.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              onClick={handleExport}
              disabled={totalCount === 0}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold h-10 px-4 rounded-xl shadow-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export Backup
            </Button>
            <Button
              onClick={() => setImportingJson(!importingJson)}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold h-10 px-4 rounded-xl shadow-xs"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Import List
            </Button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Import JSON Dialog Banner */}
      {importingJson && (
        <Card className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <Upload className="h-4 w-4" /> Import Favorites JSON Backup
            </h4>
            <button
              onClick={() => setImportingJson(false)}
              className="text-xs text-amber-700 hover:text-amber-900 font-semibold"
            >
              Cancel
            </button>
          </div>
          <textarea
            value={jsonInputText}
            onChange={(e) => setJsonInputText(e.target.value)}
            placeholder="Paste raw JSON here..."
            rows={4}
            className="w-full text-xs font-mono p-3 rounded-xl border border-amber-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <div className="flex justify-end gap-2">
            <Button
              onClick={handleImportSubmit}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
            >
              Merge into My Favorites
            </Button>
          </div>
        </Card>
      )}

      {/* Controls & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Category Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          <button
            onClick={() => setActiveTypeTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTypeTab === 'all'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Heart className="h-3.5 w-3.5" /> All ({totalCount})
          </button>
          <button
            onClick={() => setActiveTypeTab('business')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTypeTab === 'business'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Store className="h-3.5 w-3.5" /> Stores ({businessCount})
          </button>
          <button
            onClick={() => setActiveTypeTab('product')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTypeTab === 'product'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" /> Products ({productCount})
          </button>
          <button
            onClick={() => setActiveTypeTab('service')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTypeTab === 'service'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" /> Services ({serviceCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved items..."
            className="pl-9 pr-8 h-10 text-xs rounded-xl font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Clear Confirmation */}
      {showClearConfirm && (
        <Card className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 p-4 rounded-2xl flex items-center justify-between gap-3">
          <span className="text-xs text-rose-800 dark:text-rose-200 font-bold">
            Remove all {totalCount} saved items from this device?
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowClearConfirm(false)}
              className="h-8 text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                clearAllFavorites();
                setShowClearConfirm(false);
              }}
              className="h-8 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
            >
              Yes, Clear All
            </Button>
          </div>
        </Card>
      )}

      {/* Main Grid of Saved Favorites */}
      {filteredFavorites.length === 0 ? (
        <Card className="p-12 text-center border-dashed rounded-3xl bg-white dark:bg-slate-900 space-y-4">
          <div className="h-16 w-16 rounded-3xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 mx-auto grid place-items-center border border-rose-100 dark:border-rose-900 shadow-inner">
            <Heart className="h-8 w-8 text-rose-400" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
              {searchQuery ? 'No Favorites Matched Your Search' : 'No Saved Favorites Yet'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {searchQuery
                ? `We couldn't find any saved item matching "${searchQuery}".`
                : 'Explore verified merchants, featured catalog items, and top services. Click the heart icon on any card to save it here.'}
            </p>
          </div>

          {!searchQuery && onNavigateTab && (
            <div className="pt-2 flex justify-center gap-3">
              <Button
                onClick={() => onNavigateTab('directory')}
                className="bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-md gap-2"
              >
                <Compass className="h-4 w-4" />
                Explore Business Directory
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFavorites.map((item) => {
            const formattedPrice = formatPrice(item.price);
            const isEditingThisNote = editingNoteId === item.id;

            return (
              <Card
                key={item.id}
                onClick={() => handleOpenItem(item)}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden hover:border-rose-300 dark:hover:border-rose-800/80 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
              >
                <div>
                  {/* Thumbnail Banner */}
                  <div className="relative h-44 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                        {item.type === 'business' ? (
                          <Store className="h-12 w-12 text-slate-300" />
                        ) : item.type === 'service' ? (
                          <Briefcase className="h-12 w-12 text-slate-300" />
                        ) : (
                          <ShoppingBag className="h-12 w-12 text-slate-300" />
                        )}
                      </div>
                    )}

                    <Badge
                      className={`absolute top-3 left-3 text-[10px] font-black uppercase rounded-lg shadow-md ${
                        item.type === 'business'
                          ? 'bg-blue-600 text-white'
                          : item.type === 'service'
                          ? 'bg-purple-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {item.type}
                    </Badge>

                    {/* Quick Remove from Card */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFavorite(item.targetId, item.type, item.title);
                      }}
                      className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/90 dark:bg-slate-900/90 text-rose-500 hover:text-rose-700 hover:scale-110 transition-all flex items-center justify-center shadow-md cursor-pointer"
                      title="Remove from favorites"
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </button>
                  </div>

                  {/* Card Content */}
                  <CardContent className="p-5 space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-base font-black text-slate-900 dark:text-slate-100 group-hover:text-rose-600 transition-colors line-clamp-1">
                          {item.title}
                        </h3>
                        {item.verified && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        )}
                      </div>

                      {(item.subtitle || item.businessName || item.category) && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 font-medium">
                          {item.businessName ? `By ${item.businessName} · ` : ''}
                          {item.subtitle || item.category}
                        </p>
                      )}

                      {item.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Price and Location */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      {formattedPrice ? (
                        <span className="text-base font-black text-rose-600 dark:text-rose-400">
                          {formattedPrice}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-slate-500">
                          {item.type === 'business' ? 'Verified Store' : 'Inquire for Price'}
                        </span>
                      )}

                      {item.location && (
                        <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                          <MapPin className="h-3 w-3" />
                          {item.location}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </div>

                {/* Bottom Card Footer Actions */}
                <div className="p-5 pt-0 space-y-3">
                  {/* Personal Note */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                    {isEditingThisNote ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder="Add a reminder note..."
                          className="h-7 text-xs rounded-lg font-medium"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={(e) => saveNote(item, e)}
                          className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                        >
                          <Save className="h-3 w-3 mr-1" /> Save
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        {item.notes ? (
                          <span className="italic text-slate-600 dark:text-slate-300 flex items-center gap-1 line-clamp-1">
                            📝 {item.notes}
                          </span>
                        ) : (
                          <button
                            onClick={(e) => startEditNote(item, e)}
                            className="text-slate-400 hover:text-slate-600 font-medium hover:underline text-[10px] flex items-center gap-1"
                          >
                            <Edit2 className="h-2.5 w-2.5" /> Add personal note
                          </button>
                        )}

                        {item.notes && (
                          <button
                            onClick={(e) => startEditNote(item, e)}
                            className="text-slate-400 hover:text-slate-600 p-0.5 ml-2"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleShare(item, e)}
                      className="w-full text-xs font-bold rounded-xl h-9 border-slate-200 hover:bg-slate-50 gap-1"
                    >
                      <Share2 className="h-3.5 w-3.5" /> Share
                    </Button>
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white text-xs font-bold rounded-xl h-9 gap-1 shadow-xs"
                    >
                      View Details <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
