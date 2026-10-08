import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Globe,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Share2,
  Volume2,
  VolumeX,
  History,
  TrendingUp,
  Loader2,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Layers,
  DollarSign,
  Briefcase,
  Mic,
  MicOff,
  Clock,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  searchRealtimeGoogle,
  fetchTrendingSearchTopics,
  getSearchHistory,
  clearSearchHistory,
  RealtimeSearchResult,
  TrendingTopic,
  SearchHistoryItem,
} from '@/services/realtimeSearchService';

interface GoogleRealtimeSearchHubProps {
  initialQuery?: string;
  onNavigateTab?: (tab: string) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All Topics', icon: Globe },
  { id: 'forex', label: '💱 Naira & Forex', icon: DollarSign, query: 'Dollar to Naira black market and CBN exchange rate today' },
  { id: 'business', label: '🇳🇬 CAC & Business', icon: Briefcase, query: 'CAC business registration and compliance updates Nigeria' },
  { id: 'marketing', label: '🚀 Growth & Marketing', icon: TrendingUp, query: 'High ROI digital marketing strategies for Nigerian businesses' },
  { id: 'ecommerce', label: '🛍️ E-Commerce Trends', icon: Layers, query: 'Top trending fast selling products online Nigeria' },
  { id: 'energy', label: '⚡ Fuel & Economy', icon: RefreshCw, query: 'Current fuel price and electricity tariff updates Nigeria' },
];

export const GoogleRealtimeSearchHub: React.FC<GoogleRealtimeSearchHubProps> = ({
  initialQuery = '',
  onNavigateTab,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RealtimeSearchResult | null>(null);
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    loadTrending();
    setHistory(getSearchHistory());

    // Auto-search if initialQuery provided
    if (initialQuery && initialQuery.trim()) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const loadTrending = async () => {
    const data = await fetchTrendingSearchTopics();
    setTrending(data);
  };

  const handleSearch = async (searchQuery?: string, catId?: string) => {
    const q = (searchQuery || query).trim();
    if (!q) {
      toast.error('Please enter a search query');
      return;
    }

    setLoading(true);
    if (searchQuery) {
      setQuery(searchQuery);
    }
    stopSpeaking();

    try {
      const selectedCat = catId || activeCategory;
      const res = await searchRealtimeGoogle(q, {
        category: selectedCat !== 'all' ? selectedCat : undefined,
        location: 'Nigeria & Global Markets',
      });
      setResult(res);
      setHistory(getSearchHistory());
      toast.success('Real-time Google Search completed!');
    } catch (err: any) {
      toast.error(err.message || 'Search failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResult = () => {
    if (!result?.content) return;
    navigator.clipboard.writeText(`${result.query}\n\n${result.content}\n\nSource: Google Real-Time Search on GGD Network`);
    setCopied(true);
    toast.success('Summary copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeechToggle = () => {
    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-speech is not supported on this browser');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!result?.content) return;

    // Strip markdown formatting for voice playback
    const cleanSpeech = result.content
      .replace(/###/g, '')
      .replace(/##/g, '')
      .replace(/#/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/- /g, '. ');

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const toggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice dictation is not supported in this browser.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info('🎙️ Listening... speak your search query.');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
        handleSearch(transcript);
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsListening(false);
        toast.error('Voice input error. Please try again.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn(err);
      setIsListening(false);
    }
  };

  const handleShareToFeed = () => {
    if (!result) return;
    try {
      // Store in localStorage draft for community composer
      const draft = {
        title: `🔍 Real-Time Market Update: ${result.query}`,
        content: result.content,
        sources: result.sources,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem('ggd_share_search_draft', JSON.stringify(draft));
      toast.success('Search result ready to share in Community Feed!');
      if (onNavigateTab) {
        onNavigateTab('feed');
      }
    } catch {
      toast.info('Draft prepared.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-orange-950 p-6 sm:p-8 text-white shadow-xl border border-white/10">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-orange-300">
              <Sparkles className="h-3.5 w-3.5 text-orange-400" />
              Live Web Grounding with Google Search
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Google Real-Time <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">Market Search</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Instantly search live web data, Naira exchange rates, CAC regulatory updates, trending commodities, and market intelligence directly within GGD Ad Network.
            </p>
          </div>

          <div className="flex flex-row md:flex-col gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white backdrop-blur-md rounded-xl text-xs gap-1.5"
            >
              <History className="h-4 w-4 text-orange-400" />
              {showHistory ? 'Hide History' : 'Search History'}
            </Button>
            {onNavigateTab && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateTab('feed')}
                className="text-slate-300 hover:text-white hover:bg-white/10 rounded-xl text-xs gap-1.5"
              >
                <BookOpen className="h-4 w-4 text-blue-400" />
                Community Feed
              </Button>
            )}
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="mt-6 relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-1.5 shadow-2xl border border-white/20"
          >
            <div className="pl-3 text-slate-400">
              <Search className="h-5 w-5 text-orange-500" />
            </div>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search live prices, Naira FX rates, CAC rules, marketing trends..."
              className="border-0 shadow-none bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-0 text-sm sm:text-base h-11"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                ✕
              </button>
            )}
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`p-2.5 rounded-xl transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-slate-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-slate-800'
              }`}
              title={isListening ? 'Stop listening' : 'Voice search'}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <Button
              type="submit"
              disabled={loading || !query.trim()}
              className="h-11 px-5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold shadow-md gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Searching...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Search</span>
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Category Pills */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                if (cat.query) {
                  setQuery(cat.query);
                  handleSearch(cat.query, cat.id);
                }
              }}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200 backdrop-blur-sm'
              }`}
            >
              <cat.icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* History Drawer / Panel */}
      {showHistory && (
        <Card className="border-orange-500/20 bg-card shadow-sm rounded-2xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-orange-500" />
              <CardTitle className="text-base font-bold">Recent Real-Time Searches</CardTitle>
            </div>
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearSearchHistory();
                  setHistory([]);
                  toast.info('Search history cleared');
                }}
                className="text-xs text-muted-foreground hover:text-red-500 h-8 gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No recent searches saved yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setQuery(item.query);
                      handleSearch(item.query);
                    }}
                    className="p-3 rounded-xl border bg-muted/40 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 hover:border-orange-500/30 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground truncate group-hover:text-orange-600">
                        {item.query}
                      </p>
                      <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-orange-600 transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(item.timestamp).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <Card className="rounded-2xl border-orange-500/30 shadow-lg bg-card overflow-hidden animate-pulse">
          <CardHeader className="bg-orange-500/5 pb-4">
            <div className="flex items-center justify-between">
              <div className="h-5 w-48 bg-orange-200 dark:bg-orange-900/40 rounded-md" />
              <div className="h-5 w-24 bg-orange-200 dark:bg-orange-900/40 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-5/6 bg-muted rounded" />
              <div className="h-4 w-4/6 bg-muted rounded" />
            </div>
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="h-16 bg-muted rounded-xl" />
              <div className="h-16 bg-muted rounded-xl" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Search Result */}
      {!loading && result && (
        <div className="space-y-6">
          <Card className="rounded-3xl border-orange-500/30 shadow-xl bg-card overflow-hidden">
            {/* Result Header */}
            <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30 font-bold text-xs gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Google Search Grounded
                  </Badge>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Live snapshot: {new Date(result.searchedAt).toLocaleTimeString()}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-foreground">
                  {result.query}
                </h2>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyResult}
                  className="h-8 text-xs rounded-xl gap-1.5"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSpeechToggle}
                  className={`h-8 text-xs rounded-xl gap-1.5 ${isSpeaking ? 'bg-orange-500 text-white' : ''}`}
                >
                  {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  {isSpeaking ? 'Stop Audio' : 'Listen'}
                </Button>

                <Button
                  size="sm"
                  onClick={handleShareToFeed}
                  className="h-8 text-xs rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white gap-1.5 shadow-sm"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share to Community
                </Button>
              </div>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Formatted Content */}
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed">
                {result.content.split('\n').map((line, idx) => {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('### ')) {
                    return (
                      <h3 key={idx} className="text-base font-black text-foreground mt-4 mb-2 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        {trimmed.replace('### ', '')}
                      </h3>
                    );
                  }
                  if (trimmed.startsWith('#### ')) {
                    return (
                      <h4 key={idx} className="text-sm font-bold text-foreground mt-3 mb-1">
                        {trimmed.replace('#### ', '')}
                      </h4>
                    );
                  }
                  if (trimmed.startsWith('- ')) {
                    return (
                      <div key={idx} className="flex items-start gap-2 my-1 pl-2">
                        <span className="text-orange-500 font-bold">•</span>
                        <p className="text-xs sm:text-sm text-foreground/90 m-0">
                          {trimmed.replace('- ', '')}
                        </p>
                      </div>
                    );
                  }
                  if (trimmed.startsWith('1. ') || trimmed.startsWith('2. ') || trimmed.startsWith('3. ') || trimmed.startsWith('4. ')) {
                    return (
                      <div key={idx} className="flex items-start gap-2 my-1 pl-2">
                        <span className="text-orange-600 dark:text-orange-400 font-bold text-xs">{trimmed.slice(0, 3)}</span>
                        <p className="text-xs sm:text-sm text-foreground/90 m-0">
                          {trimmed.slice(3)}
                        </p>
                      </div>
                    );
                  }
                  if (!trimmed) {
                    return <div key={idx} className="h-2" />;
                  }
                  return (
                    <p key={idx} className="text-xs sm:text-sm text-foreground/90 my-2 leading-relaxed">
                      {trimmed}
                    </p>
                  );
                })}
              </div>

              {/* Google Web Search Grounding Queries */}
              {result.webSearchQueries && result.webSearchQueries.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-muted/50 border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="text-xs font-bold text-foreground">Google Search Queries Executed:</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {result.webSearchQueries.map((sq, sidx) => (
                      <Badge key={sidx} variant="secondary" className="text-[11px] font-medium">
                        "{sq}"
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Citations & Web Sources */}
              {result.sources && result.sources.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5 text-orange-500" />
                      Live Web Grounding Sources & Citations ({result.sources.length})
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {result.sources.map((src, sidx) => (
                      <a
                        key={sidx}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        referrerPolicy="no-referrer"
                        className="p-3 rounded-2xl border bg-card hover:bg-orange-50/50 dark:hover:bg-orange-950/20 hover:border-orange-500/40 transition-all flex flex-col justify-between group shadow-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider truncate">
                              {src.domain || 'web'}
                            </span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-orange-500 transition-colors shrink-0" />
                          </div>
                          <p className="text-xs font-semibold text-foreground line-clamp-2 group-hover:text-orange-600 transition-colors">
                            {src.title}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground truncate mt-2 pt-2 border-t group-hover:underline">
                          {src.url}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trending Real-Time Search Topics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              Trending Real-Time Business Queries
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadTrending}
            className="text-xs text-muted-foreground hover:text-foreground h-8 gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {trending.map((t) => (
            <Card
              key={t.id}
              onClick={() => {
                setQuery(t.query);
                handleSearch(t.query);
              }}
              className="cursor-pointer hover:border-orange-500/50 hover:shadow-md transition-all rounded-2xl bg-card group border"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 text-[10px] font-bold">
                    {t.badge}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">{t.category}</span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-orange-600 transition-colors line-clamp-2">
                  {t.topic}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-orange-600 dark:text-orange-400 font-semibold pt-1">
                  <span>Search live update</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GoogleRealtimeSearchHub;
