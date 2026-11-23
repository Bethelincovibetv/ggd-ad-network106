import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, X, ArrowRight, CornerDownLeft, BookOpen, TrendingUp, Briefcase, 
  Video, Sparkles, Megaphone, Mail, ClipboardList, Image, Shield, Users, 
  MessageSquare, Bell, Crown, Smartphone, Settings, Settings2, Key, 
  ExternalLink, CheckCircle2, User, Flame, Package, Store, Menu, Layers, ShieldCheck
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FEATURE_REGISTRY, MENU_TOGGLE_REGISTRY } from "@/lib/featureRegistry";

export interface SearchEntry {
  id: string;
  sectionId: string;
  title: string;
  category: string;
  description: string;
  keywords: string[];
  icon: any;
  color: string;
  extraProps?: any;
}

const STATIC_ADMIN_ENTRIES: SearchEntry[] = [
  // CORE & ANALYTICS
  {
    id: 'admin-alerts',
    sectionId: 'admin-alerts',
    title: 'System Alerts & Support Tickets',
    category: 'CORE & ANALYTICS',
    description: 'Live admin notifications for support tickets, payouts, ad approvals & reviews',
    keywords: ['alerts', 'notifications', 'support tickets', 'tickets', 'inbox', 'updates', 'unread'],
    icon: Bell,
    color: 'from-orange-500 to-red-600'
  },
  {
    id: 'guide',
    sectionId: 'guide',
    title: 'Admin Guide & Documentation',
    category: 'CORE & ANALYTICS',
    description: 'Platform workflows, system rules, and help documentation',
    keywords: ['help', 'manual', 'docs', 'guide', 'instructions', 'walkthrough'],
    icon: BookOpen,
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'analytics',
    sectionId: 'analytics',
    title: 'Platform Analytics & Metrics',
    category: 'CORE & ANALYTICS',
    description: 'Revenue, impressions served, user registrations, and growth data',
    keywords: ['metrics', 'growth', 'stats', 'analytics', 'revenue', 'impressions', 'charts'],
    icon: TrendingUp,
    color: 'from-blue-500 to-indigo-600'
  },

  // DIRECT TEAM / SYNDICATE
  {
    id: 'syndicate-members',
    sectionId: 'syndicate',
    title: 'Syndicate: Members & Promoters',
    category: 'DIRECT TEAM / SYNDICATE',
    description: 'View active promoters, states, performance tiers, and assignments',
    keywords: ['syndicate', 'members', 'promoters', 'direct team', 'whatsapp promoters'],
    icon: Briefcase,
    color: 'from-purple-600 to-indigo-700',
    extraProps: { initialTab: 'members' }
  },
  {
    id: 'syndicate-campaigns',
    sectionId: 'syndicate',
    title: 'Syndicate: Paid Social Campaigns',
    category: 'DIRECT TEAM / SYNDICATE',
    description: 'Manage paid business campaigns deployed across WhatsApp, IG, and TikTok',
    keywords: ['syndicate campaigns', 'social tasks', 'campaigns', 'tasks', 'whatsapp status'],
    icon: Briefcase,
    color: 'from-purple-600 to-indigo-700',
    extraProps: { initialTab: 'campaigns' }
  },
  {
    id: 'syndicate-verifications',
    sectionId: 'syndicate',
    title: 'Syndicate: Proof Verifications',
    category: 'DIRECT TEAM / SYNDICATE',
    description: 'Review screenshot proofs submitted by promoters for payout approval',
    keywords: ['proofs', 'verification', 'approvals', 'screenshots', 'syndicate submissions'],
    icon: Briefcase,
    color: 'from-purple-600 to-indigo-700',
    extraProps: { initialTab: 'verification' }
  },
  {
    id: 'syndicate-payouts',
    sectionId: 'syndicate',
    title: 'Syndicate: Promoter Payouts & Wallets',
    category: 'DIRECT TEAM / SYNDICATE',
    description: 'Process manual or automatic promoter bank withdrawals and payouts',
    keywords: ['payouts', 'withdrawals', 'wallet', 'bank transfers', 'paystack payouts'],
    icon: Briefcase,
    color: 'from-purple-600 to-indigo-700',
    extraProps: { initialTab: 'payouts' }
  },

  // ADVERTISING & AI
  {
    id: 'vixora-admin',
    sectionId: 'vixora-admin',
    title: 'Vixora AI Creator Studio & Video Engine',
    category: 'ADVERTISING & CAMPAIGNS',
    description: 'AI video generation, TTS voices, stock assets, and render queue',
    keywords: ['vixora', 'video', 'ai video', 'creator studio', 'autopilot', 'tts'],
    icon: Video,
    color: 'from-orange-500 via-purple-600 to-indigo-700'
  },
  {
    id: 'business-agent',
    sectionId: 'business-agent',
    title: 'Vixora Business AI Agent Management',
    category: 'ADVERTISING & CAMPAIGNS',
    description: 'Autonomous merchant copilot: create products, update prices, profile sync',
    keywords: ['agent', 'business ai', 'copilot', 'products', 'services', 'vixora agent', 'merchant ai', 'autonomous'],
    icon: Sparkles,
    color: 'from-violet-600 via-purple-600 to-fuchsia-600'
  },
  {
    id: 'ads-manager',
    sectionId: 'ads',
    title: 'Ad Manager (Banner Ad Approvals)',
    category: 'ADVERTISING & CAMPAIGNS',
    description: 'Moderate banner advertisements, impressions allocation, and approvals',
    keywords: ['ads', 'banners', 'ad manager', 'advertisements', 'banner approvals', 'commercial ads'],
    icon: Megaphone,
    color: 'from-amber-500 to-orange-600'
  },
  {
    id: 'email-studio',
    sectionId: 'email-studio',
    title: 'Email & Ad Studio',
    category: 'ADVERTISING & CAMPAIGNS',
    description: 'Newsletter templates, SMTP sender gateways, and sponsor ads',
    keywords: ['email', 'email studio', 'newsletter', 'sponsor ads', 'smtp'],
    icon: Mail,
    color: 'from-orange-500 to-amber-600'
  },
  {
    id: 'marketing-apps',
    sectionId: 'apps',
    title: 'Marketing Apps Showcase',
    category: 'ADVERTISING & CAMPAIGNS',
    description: 'Curated marketing applications, tools catalog, and promotional widgets',
    keywords: ['apps', 'marketing apps', 'tools', 'showcase'],
    icon: Megaphone,
    color: 'from-fuchsia-500 to-pink-600'
  },
  {
    id: 'video-manager',
    sectionId: 'videos',
    title: 'Video Manager (Watch-to-Earn)',
    category: 'ADVERTISING & CAMPAIGNS',
    description: 'Upload and moderate watch-to-earn YouTube video tasks',
    keywords: ['videos', 'youtube', 'watch to earn', 'video tasks'],
    icon: Video,
    color: 'from-red-500 to-rose-600'
  },
  {
    id: 'task-manager',
    sectionId: 'tasks',
    title: 'Credit Task Manager',
    category: 'ADVERTISING & CAMPAIGNS',
    description: 'Manage community credit tasks, requirements, and reward quotas',
    keywords: ['tasks', 'credit tasks', 'task manager', 'completions'],
    icon: ClipboardList,
    color: 'from-green-500 to-emerald-600'
  },
  {
    id: 'slide-manager',
    sectionId: 'slides',
    title: 'Slide Manager (Hero Banners)',
    category: 'ADVERTISING & CAMPAIGNS',
    description: 'Homepage top carousel banners, call-to-actions, and landing hero images',
    keywords: ['slides', 'banners', 'hero slider', 'carousel', 'homepage banners'],
    icon: Image,
    color: 'from-violet-500 to-purple-600'
  },

  // USERS & COMMUNITY
  {
    id: 'business-verification',
    sectionId: 'verification',
    title: 'Business Verification Engine (NIN & CAC)',
    category: 'USERS & COMMUNITY',
    description: 'Automated Nigerian Identity & CAC business registration verification',
    keywords: ['verification', 'nin', 'cac', 'business verification', 'identity', 'kyc'],
    icon: Shield,
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'activation-fee',
    sectionId: 'activation-fee',
    title: 'Activation Fee & Starter Pack',
    category: 'USERS & COMMUNITY',
    description: 'Configure onboarding fee, starter bonus credits, revenue metrics & manual user overrides',
    keywords: ['activation', 'activation fee', 'onboarding', 'starter pack', 'mark activated', '1000', '200'],
    icon: ShieldCheck,
    color: 'from-orange-500 to-amber-600'
  },
  {
    id: 'user-management',
    sectionId: 'users',
    title: 'User Management & Roles',
    category: 'USERS & COMMUNITY',
    description: 'Search user profiles, manage admin/promoter roles, and credit balances',
    keywords: ['users', 'roles', 'credits', 'profiles', 'accounts', 'user management', 'ban'],
    icon: Users,
    color: 'from-orange-500 to-red-600'
  },
  {
    id: 'contact-gain',
    sectionId: 'contact-gain',
    title: 'Contact Gain System (VCF Drops)',
    category: 'USERS & COMMUNITY',
    description: 'Daily WhatsApp phonebook compilation, downloads, and contact tasks',
    keywords: ['contact gain', 'vcf', 'contacts', 'phonebook', 'whatsapp contacts'],
    icon: Users,
    color: 'from-orange-500 to-amber-600'
  },
  {
    id: 'user-chat',
    sectionId: 'chat',
    title: 'Direct User Support Chat',
    category: 'USERS & COMMUNITY',
    description: 'Direct messaging and live customer support conversations',
    keywords: ['chat', 'support', 'messages', 'live chat', 'inbox'],
    icon: MessageSquare,
    color: 'from-lime-500 to-green-600'
  },
  {
    id: 'notifications',
    sectionId: 'notifications',
    title: 'Broadcast Notifications Sender',
    category: 'USERS & COMMUNITY',
    description: 'Push notification alerts, system broadcasts, and user announcements',
    keywords: ['notifications', 'broadcast', 'alerts', 'announcements', 'push'],
    icon: Bell,
    color: 'from-yellow-400 to-orange-500'
  },
  {
    id: 'coowners',
    sectionId: 'coowners',
    title: 'Co-Owners & Equity Sharing',
    category: 'USERS & COMMUNITY',
    description: 'Platform co-owners, revenue split percentage, and partner equity',
    keywords: ['co-owners', 'equity', 'revenue share', 'partners', 'coowner percentage'],
    icon: Crown,
    color: 'from-amber-400 to-yellow-600'
  },

  // PLATFORM & CONFIG
  {
    id: 'digital-products',
    sectionId: 'digital-products',
    title: 'Digital Products Store Manager',
    category: 'ADVERTISING & CAMPAIGNS',
    description: 'Manage direct purchase digital listings, downloads, and seller approvals',
    keywords: ['digital products', 'ebooks', 'courses', 'downloads', 'direct buy'],
    icon: Package,
    color: 'from-orange-500 to-amber-600'
  },
  {
    id: 'airtime-marketplace',
    sectionId: 'airtime',
    title: 'Redeem Hub',
    category: 'PLATFORM & CONFIG',
    description: 'Create and manage redeemable airtime, data bundles, and seed offers',
    keywords: ['redeem hub', 'airtime', 'data', 'redeem', 'redeem airtime', 'mtn', 'airtel', 'glo', '9mobile', 'gift cards'],
    icon: Smartphone,
    color: 'from-orange-500 via-amber-500 to-red-600'
  },
  {
    id: 'settings-general',
    sectionId: 'settings',
    title: 'Platform Settings (Paystack & Config)',
    category: 'PLATFORM & CONFIG',
    description: 'Paystack keys, credit exchange rate, WhatsApp links, and fees',
    keywords: ['settings', 'paystack', 'exchange rate', 'naira rate', 'wallet bonus', 'config'],
    icon: Settings,
    color: 'from-pink-500 to-rose-600'
  },
  {
    id: 'settings-ceo-toggle',
    sectionId: 'settings',
    title: 'Founder & CEO About Page Toggle',
    category: 'PLATFORM & CONFIG',
    description: 'Switch ON or OFF CEO profile, executive keynote speech, and flyer banner on About Page',
    keywords: ['ceo', 'bethel', 'founder', 'about page', 'ceo toggle', 'hide ceo', 'show ceo'],
    icon: Settings,
    color: 'from-orange-500 to-red-600'
  },
  {
    id: 'feature-toggles',
    sectionId: 'features',
    title: 'Feature Toggles (Module Controller)',
    category: 'PLATFORM & CONFIG',
    description: 'Enable or disable platform features: Community, Tasks, Redeem Hub, Vixora AI, Syndicate',
    keywords: ['feature toggles', 'toggles', 'modules', 'disable', 'enable', 'switch off', 'community', 'tasks', 'redeem hub', 'redeem airtime'],
    icon: Settings2,
    color: 'from-cyan-500 to-blue-600'
  },
  {
    id: 'api-keys',
    sectionId: 'api',
    title: 'API Keys & Secrets Management',
    category: 'PLATFORM & CONFIG',
    description: 'Gemini AI API keys, Paystack integration secrets, and Webhook tokens',
    keywords: ['api keys', 'gemini api key', 'secrets', 'credentials', 'tokens'],
    icon: Key,
    color: 'from-yellow-500 to-amber-600'
  }
];

const FEATURE_TOGGLE_ENTRIES: SearchEntry[] = [
  ...FEATURE_REGISTRY.map(f => ({
    id: `feature_toggle_${f.key}`,
    sectionId: 'features',
    title: `Feature Toggle: ${f.label}`,
    category: 'FEATURE TOGGLE',
    description: `${f.group} • ${f.description}`,
    keywords: [
      f.key.toLowerCase(),
      f.group.toLowerCase(),
      'toggle',
      'feature',
      ...(f.routes || []).map(r => r.toLowerCase()),
      ...(f.keywords || []).map(k => k.toLowerCase()),
    ],
    icon: Layers,
    color: 'from-cyan-500 to-blue-600',
    extraProps: { featureSearch: f.key, featureTab: 'features' as const },
  })),
  ...MENU_TOGGLE_REGISTRY.map(m => ({
    id: `menu_toggle_${m.key}`,
    sectionId: 'features',
    title: `Menu Toggle: ${m.label}`,
    category: 'MENU TOGGLE',
    description: `${m.section} (${m.navTabId}) • ${m.description}`,
    keywords: [
      m.key.toLowerCase(),
      m.section.toLowerCase(),
      m.navTabId.toLowerCase(),
      'menu',
      'navigation',
      'toggle',
    ],
    icon: Menu,
    color: 'from-orange-500 to-amber-600',
    extraProps: { featureSearch: m.key, featureTab: 'menus' as const },
  })),
];

const ALL_ADMIN_ENTRIES: SearchEntry[] = [
  ...STATIC_ADMIN_ENTRIES,
  ...FEATURE_TOGGLE_ENTRIES,
];

interface AdminRealtimeSearchBarProps {
  onNavigate: (sectionId: string, extraProps?: any) => void;
  className?: string;
}

export const AdminRealtimeSearchBar: React.FC<AdminRealtimeSearchBarProps> = ({
  onNavigate,
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [liveEntities, setLiveEntities] = useState<SearchEntry[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Live entity search for Users and Ads when query is >= 2 chars
  useEffect(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length < 2) {
      setLiveEntities([]);
      setIsSearchingLive(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLive(true);
      try {
        const [usersRes, adsRes, listingsRes, campaignsRes] = await Promise.all([
          supabase.from('profiles').select('user_id, display_name, email, credits').or(`display_name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`).limit(3),
          supabase.from('ads').select('id, title, impressions, is_active').ilike('title', `%${trimmed}%`).limit(3),
          (supabase.from('business_listings') as any).select('id, title, price, listing_type').ilike('title', `%${trimmed}%`).limit(3),
          supabase.from('syndicate_campaigns' as any).select('id, title, status, budget').ilike('title', `%${trimmed}%`).limit(3)
        ]);

        const dynamicEntries: SearchEntry[] = [];

        (usersRes.data || []).forEach(u => {
          dynamicEntries.push({
            id: `user_${u.user_id}`,
            sectionId: 'users',
            title: `User: ${u.display_name || u.email || 'Member'}`,
            category: 'LIVE USERS',
            description: `${u.email || 'No email'} • ${u.credits || 0} Credits`,
            keywords: [u.display_name?.toLowerCase() || '', u.email?.toLowerCase() || ''],
            icon: User,
            color: 'from-orange-500 to-amber-600'
          });
        });

        (adsRes.data || []).forEach(a => {
          dynamicEntries.push({
            id: `ad_${a.id}`,
            sectionId: 'ads',
            title: `Campaign: ${a.title}`,
            category: 'LIVE ADS',
            description: `${a.impressions || 0} Impressions • ${a.is_active ? 'Active' : 'Inactive'}`,
            keywords: [a.title.toLowerCase()],
            icon: Megaphone,
            color: 'from-amber-500 to-orange-600'
          });
        });

        ((listingsRes as any)?.data || []).forEach((item: any) => {
          dynamicEntries.push({
            id: `listing_${item.id}`,
            sectionId: 'business-agent',
            title: `${item.listing_type === 'service' ? 'Service' : 'Product'}: ${item.title}`,
            category: 'LIVE PRODUCTS & SERVICES',
            description: `₦${Number(item.price || 0).toLocaleString()} • Managed via Vixora Business Agent`,
            keywords: [item.title.toLowerCase(), item.listing_type],
            icon: item.listing_type === 'service' ? Store : Package,
            color: 'from-violet-600 to-purple-600'
          });
        });

        ((campaignsRes as any)?.data || []).forEach((c: any) => {
          dynamicEntries.push({
            id: `syn_${c.id}`,
            sectionId: 'syndicate',
            title: `Syndicate: ${c.title}`,
            category: 'LIVE SYNDICATE',
            description: `Budget: ₦${Number(c.budget || 0).toLocaleString()} • ${c.status || 'Active'}`,
            keywords: [c.title.toLowerCase(), 'syndicate'],
            icon: Briefcase,
            color: 'from-purple-600 to-indigo-700',
            extraProps: { initialTab: 'campaigns', initialCampaignId: c.id }
          });
        });

        setLiveEntities(dynamicEntries);
      } catch {
        // non-fatal
      } finally {
        setIsSearchingLive(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Filter static entries & all feature/menu toggles
  const filteredEntries = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return STATIC_ADMIN_ENTRIES.slice(0, 8);

    return ALL_ADMIN_ENTRIES.filter(item => {
      if (item.title.toLowerCase().includes(trimmed)) return true;
      if (item.description.toLowerCase().includes(trimmed)) return true;
      if (item.category.toLowerCase().includes(trimmed)) return true;
      return item.keywords.some(k => k.includes(trimmed));
    });
  }, [query]);

  // Combined Results (Static + Live)
  const allResults = useMemo(() => {
    return [...filteredEntries, ...liveEntities];
  }, [filteredEntries, liveEntities]);

  const handleSelect = (entry: SearchEntry) => {
    onNavigate(entry.sectionId, entry.extraProps);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, allResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allResults.length) % Math.max(1, allResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allResults[selectedIndex]) {
        handleSelect(allResults[selectedIndex]);
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full max-w-xl ${className}`}>
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 flex items-center pointer-events-none text-muted-foreground">
          <Search className="h-4 w-4" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search any feature, toggle, section, user, or campaign..."
          className="w-full h-10 sm:h-11 pl-10 pr-10 text-xs sm:text-sm font-medium rounded-2xl bg-card hover:bg-muted/30 focus:bg-background border border-border focus:border-foreground/40 focus:ring-1 focus:ring-border transition-all outline-none placeholder:text-muted-foreground/80 shadow-xs"
        />

        {query && (
          <div className="absolute right-3 flex items-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setQuery('');
                setIsOpen(false);
              }}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear admin search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Real-time Results Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="p-2 border-b border-border/60 bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground px-3">
            <span className="font-semibold flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              {query ? `Search results for "${query}"` : 'Admin Sections & Feature Toggles'}
            </span>
            <span className="text-[10px]">
              {allResults.length} {allResults.length === 1 ? 'result' : 'results'} found
            </span>
          </div>

          <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
            {allResults.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <Search className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-semibold text-muted-foreground">
                  No matching feature or admin destination for "{query}"
                </p>
                <p className="text-[11px] text-muted-foreground/70">
                  Try searching "community", "tasks", "redeem hub", "syndicate", "ads", "settings", or "users"
                </p>
              </div>
            ) : (
              allResults.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const IconComponent = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 text-primary border border-primary/20 shadow-xs'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span className={`inline-grid place-items-center h-8 w-8 rounded-xl bg-gradient-to-br ${item.color} text-white shrink-0 shadow-xs`}>
                      <IconComponent className="h-4 w-4" />
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate">
                          {item.title}
                        </span>
                        <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 border-border/60">
                          {item.category}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {item.description}
                      </p>
                    </div>

                    <div className="shrink-0 text-muted-foreground opacity-60">
                      <CornerDownLeft className="h-3.5 w-3.5" />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[10px] text-muted-foreground px-3">
            <span>Use ↑↓ arrows to select • Press Enter to navigate</span>
            <span>Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRealtimeSearchBar;
