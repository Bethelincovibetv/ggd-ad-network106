import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  Star,
  CheckCircle2,
  Copy,
  Edit2,
  Save,
  X
} from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { FavoriteItem, FavoriteType } from '@/types/favorites';
import { toast } from 'sonner';

interface FavoritesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateTab?: (tab: string) => void;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  open,
  onOpenChange,
  onNavigateTab,
}) => {
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

  // Filter and search
  const filteredFavorites = useMemo(() => {
    return favorites.filter((item) => {
      // Type tab filter
      if (activeTypeTab !== 'all' && item.type !== activeTypeTab) {
        return false;
      }
      // Search query filter
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
    onOpenChange(false);
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
        // Fallback to clipboard
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-3xl p-0 overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 text-white p-5 sm:p-6 shrink-0 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner text-white">
                <Heart className="h-6 w-6 fill-current animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  My Saved Favorites
                  <Badge className="bg-white/25 text-white font-bold text-xs border-0 backdrop-blur-sm">
                    {totalCount} {totalCount === 1 ? 'Item' : 'Items'}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-rose-100 mt-0.5 font-medium">
                  Your personal quick-access list of businesses, services, and products.
                </DialogDescription>
              </div>
            </div>

            {/* Quick Export / Import actions */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExport}
                disabled={totalCount === 0}
                className="h-8 px-2.5 text-white hover:bg-white/20 text-xs font-bold rounded-xl"
                title="Backup / Export favorites to JSON"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImportingJson(!importingJson)}
                className="h-8 px-2.5 text-white hover:bg-white/20 text-xs font-bold rounded-xl"
                title="Import favorites from JSON"
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Import</span>
              </Button>
            </div>
          </div>

          {/* Search Bar inside Header */}
          <div className="relative mt-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved stores, products, locations, or notes..."
              className="bg-white text-slate-900 placeholder:text-slate-400 pl-10 pr-9 h-11 rounded-2xl text-xs font-medium shadow-sm border-0 focus-visible:ring-2 focus-visible:ring-rose-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Import JSON Sub-Panel */}
        {importingJson && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 p-4 space-y-2.5 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5" /> Import Favorites JSON
              </span>
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
              placeholder="Paste exported favorites JSON here..."
              rows={3}
              className="w-full text-xs font-mono p-2.5 rounded-xl border border-amber-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                onClick={handleImportSubmit}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-8 rounded-xl"
              >
                Import Items
              </Button>
            </div>
          </div>
        )}

        {/* Category Tabs Bar */}
        <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTypeTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTypeTab === 'all'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Heart className="h-3.5 w-3.5" /> All ({totalCount})
            </button>
            <button
              onClick={() => setActiveTypeTab('business')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTypeTab === 'business'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Store className="h-3.5 w-3.5" /> Businesses ({businessCount})
            </button>
            <button
              onClick={() => setActiveTypeTab('product')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTypeTab === 'product'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" /> Products ({productCount})
            </button>
            <button
              onClick={() => setActiveTypeTab('service')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTypeTab === 'service'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" /> Services ({serviceCount})
            </button>
          </div>

          {totalCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 px-2 font-bold shrink-0"
            >
              Clear All
            </Button>
          )}
        </div>

        {/* Clear Confirmation Banner */}
        {showClearConfirm && (
          <div className="bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900 p-3.5 flex items-center justify-between gap-2 shrink-0">
            <span className="text-xs text-rose-800 dark:text-rose-200 font-bold">
              Are you sure you want to remove all {totalCount} saved items?
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowClearConfirm(false)}
                className="h-7 text-xs px-2.5 font-bold rounded-lg"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  clearAllFavorites();
                  setShowClearConfirm(false);
                }}
                className="h-7 text-xs px-2.5 font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
              >
                Yes, Clear All
              </Button>
            </div>
          </div>
        )}

        {/* Scrollable Favorites List */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 min-h-[300px]">
          {filteredFavorites.length === 0 ? (
            <div className="text-center py-12 px-4 flex flex-col items-center justify-center space-y-3">
              <div className="h-16 w-16 rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center border border-rose-100 dark:border-rose-900/50 shadow-inner">
                <Heart className="h-8 w-8 text-rose-400" />
              </div>
              <div className="max-w-xs">
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                  {searchQuery ? 'No Matching Favorites' : 'Your Saved List is Empty'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {searchQuery
                    ? `No items found matching "${searchQuery}". Try a different keyword.`
                    : 'Save businesses, products, and services by clicking the heart icon while exploring.'}
                </p>
              </div>

              {!searchQuery && onNavigateTab && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onNavigateTab('directory');
                    }}
                    className="bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-sm"
                  >
                    <Store className="h-3.5 w-3.5 mr-1.5" />
                    Browse Directory
                  </Button>
                </div>
              )}
            </div>
          ) : (
            filteredFavorites.map((item) => {
              const formattedPrice = formatPrice(item.price);
              const isEditingThisNote = editingNoteId === item.id;

              return (
                <Card
                  key={item.id}
                  onClick={() => handleOpenItem(item)}
                  className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 hover:border-rose-300 dark:hover:border-rose-800/80 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Image / Thumbnail */}
                    <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : item.type === 'business' ? (
                        <Store className="h-8 w-8 text-slate-400" />
                      ) : item.type === 'service' ? (
                        <Briefcase className="h-8 w-8 text-slate-400" />
                      ) : (
                        <ShoppingBag className="h-8 w-8 text-slate-400" />
                      )}

                      <Badge
                        className={`absolute bottom-1 left-1 text-[9px] px-1.5 py-0 font-bold uppercase rounded-md shadow-xs ${
                          item.type === 'business'
                            ? 'bg-blue-600 text-white'
                            : item.type === 'service'
                            ? 'bg-purple-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {item.type}
                      </Badge>
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 group-hover:text-rose-600 transition-colors line-clamp-1">
                              {item.title}
                            </h4>
                            {item.verified && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            )}
                          </div>

                          {(item.subtitle || item.businessName || item.category) && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 font-medium">
                              {item.businessName ? `By ${item.businessName} · ` : ''}
                              {item.subtitle || item.category}
                            </p>
                          )}
                        </div>

                        {/* Top Right Action Icons */}
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleShare(item, e)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
                            title="Share or Copy link"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFavorite(item.targetId, item.type, item.title);
                            }}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 rounded-lg"
                            title="Remove from favorites"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Meta Pills: Location / Price / Rating */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
                        {formattedPrice && (
                          <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                            {formattedPrice}
                          </span>
                        )}

                        {item.location && (
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-[11px] font-medium">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {item.location}
                          </span>
                        )}

                        {item.businessPhone && (
                          <a
                            href={`https://wa.me/${item.businessPhone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline"
                          >
                            <Phone className="h-3 w-3" /> WhatsApp
                          </a>
                        )}
                      </div>

                      {/* Optional Notes Section */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80" onClick={(e) => e.stopPropagation()}>
                        {isEditingThisNote ? (
                          <div className="flex items-center gap-1.5">
                            <Input
                              value={noteDraft}
                              onChange={(e) => setNoteDraft(e.target.value)}
                              placeholder="Add a reminder note (e.g. Call for bulk order)..."
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
                              <span className="italic text-slate-600 dark:text-slate-300 flex items-center gap-1">
                                📝 Note: "{item.notes}"
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
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 px-6 flex flex-row items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-400 font-medium">
            Saved securely in your browser's local cache.
          </p>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs font-bold rounded-xl h-9 px-4"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
