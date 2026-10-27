import React from 'react';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';

export type FeatureGroup =
  | 'Core System'
  | 'Syndicate & Channels'
  | 'Ads & Banners'
  | 'Credit & Tasks Economy'
  | 'Business & Storefronts'
  | 'Community & Messaging'
  | 'AI & Automation'
  | 'Marketplace & Growth';

export interface FeatureDefinition {
  key: string;
  label: string;
  group: FeatureGroup;
  defaultState: boolean;
  canDisable: boolean;
  description: string;
  navTabIds?: string[];
  routes?: string[];
  keywords: string[];
}

/**
 * Universal Master Feature Registry for GGD Ad Network.
 * Every platform capability is defined here with its nav tabs, routes, and scrub keywords.
 */
export const FEATURE_REGISTRY: FeatureDefinition[] = [
  // --- NON-TOGGLEABLE CORE (Never allowed to be switched off) ---
  {
    key: 'wallet_funding',
    label: 'Wallet Funding & Paystack',
    group: 'Core System',
    defaultState: true,
    canDisable: false,
    description: 'Deposit funds, Paystack gateway, and instant bank credit verification. Protected core.',
    navTabIds: ['wallet', 'fund-credits'],
    routes: [],
    keywords: [],
  },
  {
    key: 'escrow',
    label: 'Escrow Protection',
    group: 'Core System',
    defaultState: true,
    canDisable: false,
    description: 'Safe escrow verification for paid campaigns and promoter payouts. Protected core.',
    routes: [],
    keywords: [],
  },
  {
    key: 'syndicate_core',
    label: 'Syndicate Core Engine',
    group: 'Core System',
    defaultState: true,
    canDisable: false,
    description: 'Syndicate campaigns, proof submission, review, and bank payouts. Protected core.',
    navTabIds: ['syndicate', 'syndicate-join', 'syndicate-wallet', 'business-tasks', 'syndicate-payouts'],
    routes: ['/syndicate-register'],
    keywords: [],
  },
  {
    key: 'auth_system',
    label: 'Authentication & Profiles',
    group: 'Core System',
    defaultState: true,
    canDisable: false,
    description: 'User registration, sign-in, session management, and business profile. Protected core.',
    navTabIds: ['profile'],
    routes: ['/admin'],
    keywords: [],
  },
  {
    key: 'support_system',
    label: 'Help & Customer Support',
    group: 'Core System',
    defaultState: true,
    canDisable: false,
    description: 'Customer care, support tickets, and direct admin assistance. Protected core.',
    navTabIds: ['support'],
    routes: [],
    keywords: [],
  },

  // --- SYNDICATE CHANNELS ---
  {
    key: 'syndicate_non_whatsapp_channels',
    label: 'Syndicate Non-WhatsApp Channels',
    group: 'Syndicate & Channels',
    defaultState: true,
    canDisable: true,
    description: 'Allow social campaign distribution across Facebook, Telegram, TikTok, Instagram, and Twitter. When OFF, syndicate campaigns and filters are strictly limited to WhatsApp Status, Group, and Channel.',
    keywords: [
      'Facebook',
      'Telegram',
      'TikTok',
      'Instagram',
      'Twitter',
      'Twitter/X',
      'non-whatsapp',
    ],
  },
  {
    key: 'syndicate_portal',
    label: 'Syndicate Portal Button',
    group: 'Syndicate & Channels',
    defaultState: true,
    canDisable: true,
    description: 'Toggle on/off the "Syndicate Portal" button in sidebars, footers, and navigation menus across the platform.',
    navTabIds: ['syndicate', 'syndicate-join', 'business-tasks'],
    routes: ['/syndicate-register'],
    keywords: ['Syndicate Portal', 'Syndicate Hub', 'Syndicate Button', 'Join Syndicate'],
  },

  // --- ADS & BANNERS ---
  {
    key: 'banner_ads',
    label: 'Banner Advertisements',
    group: 'Ads & Banners',
    defaultState: true,
    canDisable: true,
    description: 'Display and commercial creation of banner ads, advertiser impressions, and click tracking across partner websites.',
    navTabIds: ['campaigns', 'ads-create', 'ads'],
    routes: ['/ads-create'],
    keywords: [
      'Banner Ad',
      'Banner Ads',
      'Banner Advert',
      'Banner Advertisement',
      'commercial Banner Ads',
      'Banner advertising',
      'banner campaign',
      'display campaign',
    ],
  },
  {
    key: 'action_center_banners',
    label: 'Action Center Banner Adverts',
    group: 'Ads & Banners',
    defaultState: true,
    canDisable: true,
    description: 'Display commercial banner advert rotators and promotional hero sliders on the Action Center (Home Dashboard).',
    keywords: [
      'Action Center Banner',
      'Action Center Ads',
      'Home Banner Ads',
      'Dashboard Banners',
      'Action Center Advert',
    ],
  },
  {
    key: 'featured_slider',
    label: 'Featured Hero Slider',
    group: 'Ads & Banners',
    defaultState: true,
    canDisable: true,
    description: 'Promotional carousel slider shown at the top of the dashboard and directory pages.',
    keywords: [
      'Featured Slider',
      'Hero Slider',
      'SlideCarousel',
      'promotional carousel',
    ],
  },
  {
    key: 'slide_manager',
    label: 'Slide Manager',
    group: 'Ads & Banners',
    defaultState: true,
    canDisable: true,
    description: 'Admin tool for managing featured banner slider slides and scheduling promotions.',
    keywords: [
      'Slide Manager',
      'Manage Slides',
    ],
  },

  // --- CREDIT & TASKS ECONOMY ---
  {
    key: 'credit_tasks',
    label: 'Credit Tasks Economy',
    group: 'Credit & Tasks Economy',
    defaultState: true,
    canDisable: true,
    description: 'Community social tasks where users earn and spend GGG Credits for engagement, follows, likes, and shares.',
    navTabIds: ['tasks'],
    routes: [],
    keywords: [
      'Credit Task',
      'Credit Tasks',
      'Social Task',
      'Social Tasks',
      'GGG Credits',
      'credit economy',
      'reward tasks',
      'Earn-Task',
    ],
  },
  {
    key: 'watch_and_earn',
    label: 'Watch & Earn Video Ads',
    group: 'Credit & Tasks Economy',
    defaultState: true,
    canDisable: true,
    description: 'Watch video ads to earn bonus credits on dashboard and task pages.',
    keywords: [
      'Watch & Earn',
      'Watch and Earn',
      'Watch Video Ads',
      'Watch YouTube Ads',
      'Watch & Earn YouTube',
    ],
  },
  {
    key: 'youtube_boost',
    label: 'YouTube Boost Campaigns',
    group: 'Credit & Tasks Economy',
    defaultState: true,
    canDisable: true,
    description: 'Pay credits to boost YouTube video views, watch hours, and subscriber engagement.',
    keywords: [
      'YouTube Boost',
      'YouTube Views',
      'Boost YouTube',
      'video boost',
    ],
  },
  {
    key: 'task_wallet',
    label: 'Task Credit Wallet UI',
    group: 'Credit & Tasks Economy',
    defaultState: true,
    canDisable: true,
    description: 'Display Credit Wallet balance, credit transactions, and credit funding options in dashboard headers and wallet hubs.',
    navTabIds: ['task-wallet', 'fund-credits'],
    keywords: [
      'Task Wallet',
      'Credit Wallet',
      'credits balance',
      'Credits Spent',
    ],
  },
  {
    key: 'credit_wallet',
    label: 'Credit Wallet UI',
    group: 'Credit & Tasks Economy',
    defaultState: true,
    canDisable: true,
    description: 'Display Credit Wallet balance, credit transactions, and credit funding options in headers and hubs.',
    navTabIds: ['task-wallet', 'fund-credits'],
    keywords: ['Credit Wallet', 'Task Wallet', 'credits balance'],
  },
  {
    key: 'wallet_transfer',
    label: 'Wallet & P2P Fund Transfer',
    group: 'Credit & Tasks Economy',
    defaultState: true,
    canDisable: true,
    description: 'Transfer funds or GGG Credits peer-to-peer between registered members using email or user ID.',
    navTabIds: ['transfer'],
    keywords: ['Wallet Transfer', 'Credit Transfer', 'Transfer Funds', 'P2P Transfer'],
  },
  {
    key: 'credit_transfer',
    label: 'P2P Credit Transfer',
    group: 'Credit & Tasks Economy',
    defaultState: true,
    canDisable: true,
    description: 'Transfer GGG Credits peer-to-peer between registered members using email or user ID.',
    navTabIds: ['transfer'],
    keywords: [
      'Credit Transfer',
      'Transfer Credits',
      'P2P Transfer',
    ],
  },
  {
    key: 'credit_airtime_redeem',
    label: 'Airtime & Data Redemption',
    group: 'Credit & Tasks Economy',
    defaultState: true,
    canDisable: true,
    description: 'Redeem accumulated credits for instant MTN, Airtel, Glo, and 9mobile airtime and data bundles.',
    navTabIds: ['redeem', 'redeem-airtime', 'airtime'],
    routes: ['/redeem', '/airtime'],
    keywords: [
      'Airtime & Data',
      'Redeem Airtime',
      'Airtime Marketplace',
      'Data Redeem',
      'Redeem Airtime & Data',
      'Airtime',
    ],
  },

  // --- BUSINESS & STOREFRONTS ---
  {
    key: 'business_directory',
    label: 'Accredited Business Directory',
    group: 'Business & Storefronts',
    defaultState: true,
    canDisable: true,
    description: 'Search-indexed public directory of verified merchants and local businesses.',
    navTabIds: ['directory'],
    routes: ['/industry/:slug'],
    keywords: [
      'Business Directory',
      'Accredited Business Directory',
      'directory listings',
      'directory',
    ],
  },
  {
    key: 'storefronts',
    label: 'Merchant Public Storefronts',
    group: 'Business & Storefronts',
    defaultState: true,
    canDisable: true,
    description: 'Custom public business storefront pages (/b/:slug and /user/:id) showing products and WhatsApp contact.',
    navTabIds: ['my-business', 'business-storefront', 'storefront'],
    routes: ['/b/:slug', '/user/:id', '/business/:id'],
    keywords: [
      'Storefront',
      'Storefronts',
      'Digital Storefront',
      'Digital Storefronts',
      'public storefront',
      'merchant storefront',
    ],
  },
  {
    key: 'featured_storefronts',
    label: 'Featured Storefront Spotlights',
    group: 'Business & Storefronts',
    defaultState: true,
    canDisable: true,
    description: 'Prominently display highlighted storefronts at the top of the directory and home explore tabs.',
    keywords: [
      'Featured Storefront',
      'Featured Storefronts',
      'Storefront Spotlight',
    ],
  },
  {
    key: 'products_services',
    label: 'Products & Services Catalog',
    group: 'Business & Storefronts',
    defaultState: true,
    canDisable: true,
    description: 'Add, edit, and display physical goods, digital products, and services with dedicated detail pages.',
    routes: ['/product/:id'],
    keywords: [
      'Products & Services',
      'Product Detail',
      'Product Catalog',
    ],
  },

  // --- COMMUNITY & MESSAGING ---
  {
    key: 'community_feed',
    label: 'Community Feed & Discussions',
    group: 'Community & Messaging',
    defaultState: true,
    canDisable: true,
    description: 'Social stream for business updates, blog articles, tips, comments, likes, and community discussions.',
    navTabIds: ['feed'],
    routes: [],
    keywords: [
      'Community Feed',
      'Social Feed',
      'Community Post',
      'Community Discussions',
    ],
  },
  {
    key: 'chat_and_calls',
    label: 'GGD Inbox, Chat & Audio Calls',
    group: 'Community & Messaging',
    defaultState: true,
    canDisable: true,
    description: 'Peer-to-peer user messaging, image attachments, and WebRTC voice calls.',
    navTabIds: ['inbox'],
    routes: [],
    keywords: [
      'GGD Inbox',
      'P2P Chat',
      'Voice Call',
      'Audio Calls',
      'WebRTC call',
    ],
  },
  {
    key: 'referral_chat',
    label: 'Referral Promoter Direct Chat',
    group: 'Community & Messaging',
    defaultState: true,
    canDisable: true,
    description: 'Direct messaging channel between referrers and their referred network members.',
    keywords: [
      'Referral Chat',
      'Promoter Chat',
    ],
  },
  {
    key: 'save_favorite',
    label: 'Saved Items & Favorites',
    group: 'Community & Messaging',
    defaultState: true,
    canDisable: true,
    description: 'Allow users to save ads, products, storefronts, and posts to their personal bookmarks and wishlist.',
    navTabIds: ['favorites', 'saved'],
    routes: ['/favorites'],
    keywords: [
      'Saved Items',
      'Favorites',
      'Save Favorite',
      'Bookmark',
      'Wishlist',
    ],
  },

  // --- AI & AUTOMATION ---
  {
    key: 'blogmate_ai',
    label: 'BlogMate AI Writer',
    group: 'AI & Automation',
    defaultState: true,
    canDisable: true,
    description: 'AI-powered editorial blog generator and article drafter for high-converting marketing posts.',
    keywords: [
      'BlogMate AI',
      'BlogMate',
      'AI Blog Writer',
      'AI Blog Generator',
      'Blog AI Drafter',
    ],
  },
  {
    key: 'vixora_ai_studio',
    label: 'Vixora AI Creator Studio',
    group: 'AI & Automation',
    defaultState: true,
    canDisable: true,
    description: 'Complete AI video creator, multi-scene timeline editor, scripts, voiceovers, and autopilot shorts generator.',
    navTabIds: ['vixora-creator', 'vixora', 'creator', 'studio'],
    routes: [
      '/vixora',
      '/vixora-creator',
      '/creator',
      '/studio',
      '/autopilot',
      '/voiceover',
      '/scripts',
      '/videos',
      '/bgmusic',
      '/tools',
      '/growth',
      '/coach',
      '/developer',
    ],
    keywords: [
      'Vixora AI Studio',
      'Vixora AI Creator',
      'Vixora AI',
      'Vixora',
      'AI Video Creator Studio',
      'Viral Video & Script Suite',
    ],
  },
  {
    key: 'ebook_generator',
    label: 'Ebook & Lead Magnet Generator',
    group: 'AI & Automation',
    defaultState: true,
    canDisable: true,
    description: 'AI tool to generate branded PDF guides, lead magnets, and customer acquisition ebooks.',
    keywords: [
      'Ebook Generator',
      'Lead Magnet Generator',
      'AI Ebook',
    ],
  },
  {
    key: 'web_app_generator',
    label: 'Web App & Tool Generator',
    group: 'AI & Automation',
    defaultState: true,
    canDisable: true,
    description: 'AI tool to scaffold responsive micro-web applications and interactive customer widgets.',
    keywords: [
      'Web App Generator',
      'App Builder',
      'Micro-tool Generator',
    ],
  },
  {
    key: 'sales_funnel',
    label: 'Sales Funnel Builder',
    group: 'AI & Automation',
    defaultState: true,
    canDisable: true,
    description: 'Interactive sales funnel generator, lead capture templates, and conversion pages.',
    keywords: [
      'Sales Funnel Generator',
      'Sales Funnel',
      'Funnel Builder',
    ],
  },
  {
    key: 'naija_script_writer',
    label: 'Naija Script Writer',
    group: 'AI & Automation',
    defaultState: true,
    canDisable: true,
    description: 'AI script generator tuned for Nigerian marketing styles, Pidgin, and local culture.',
    keywords: [
      'Naija Script Writer',
      'Naija Script',
      'Nigerian Ad Copywriter',
    ],
  },
  {
    key: 'link_shortener',
    label: 'Smart Link Shortener',
    group: 'AI & Automation',
    defaultState: true,
    canDisable: true,
    description: 'Branded short URLs (/r/:slug) with click tracking, device analytics, and geo targeting.',
    navTabIds: ['smart-links'],
    routes: ['/r/:slug', '/s/:slug'],
    keywords: [
      'Smart Links',
      'Link Shortener',
      'Short URL',
      'Branded Short Link',
    ],
  },
  {
    key: 'ggd_ai_chat',
    label: 'GGD AI Assistant & Live Copilot',
    group: 'AI & Automation',
    defaultState: true,
    canDisable: true,
    description: 'Floating AI copilot and assistant for platform navigation, tips, and copywriting.',
    keywords: [
      'GGD AI Chat',
      'AI Assistant',
      'AI Copilot',
      'Vixora Copilot',
    ],
  },
  {
    key: 'realtime_search',
    label: 'Realtime Global Search',
    group: 'AI & Automation',
    defaultState: true,
    canDisable: true,
    description: 'Interactive global search bar querying businesses, ads, tasks, and users in real time.',
    keywords: [
      'Global Search',
      'Realtime Search',
      'Search directory',
    ],
  },

  // --- MARKETPLACE & GROWTH ---
  {
    key: 'digital_products_store',
    label: 'Digital Products Storefront',
    group: 'Marketplace & Growth',
    defaultState: true,
    canDisable: true,
    description: 'Selling and downloading digital courses, ebooks, graphic packs, and software licenses.',
    keywords: [
      'Digital Products Store',
      'Digital Product',
      'Digital Goods',
      'Downloadable Products',
    ],
  },
  {
    key: 'marketing_apps_marketplace',
    label: 'Marketing Apps Marketplace',
    group: 'Marketplace & Growth',
    defaultState: true,
    canDisable: true,
    description: 'Curated marketplace for growth apps, automated tools, and business plugins.',
    navTabIds: ['marketplace'],
    keywords: [
      'Marketing Apps Marketplace',
      'Marketing Marketplace',
      'Marketing Tools',
      'Growth Apps',
    ],
  },
  {
    key: 'cpa_marketing',
    label: 'CPA Marketing Offers',
    group: 'Marketplace & Growth',
    defaultState: true,
    canDisable: true,
    description: 'Cost-per-action affiliate deals and conversion-based marketing offers.',
    keywords: [
      'CPA Marketing',
      'CPA Offers',
      'Cost Per Action',
    ],
  },
  {
    key: 'premium_vip_upgrade',
    label: 'VIP Membership & Premium Upgrade',
    group: 'Marketplace & Growth',
    defaultState: true,
    canDisable: true,
    description: 'VIP subscription tiers, verified badges, ad extension discounts, and zero fees.',
    navTabIds: ['premium'],
    keywords: [
      'VIP Membership',
      'VIP Upgrade',
      'Premium Upgrade',
      'VIP Member',
      'VIP',
    ],
  },
  {
    key: 'co_owner_upgrade',
    label: 'Platform Co-Owner Tier',
    group: 'Marketplace & Growth',
    defaultState: true,
    canDisable: true,
    description: 'Strategic co-owner membership tier offering profit share rights and master privileges.',
    navTabIds: ['upgrade'],
    keywords: [
      'Co-Owner Upgrade',
      'Co-Owner Tier',
      'Co-Owner Membership',
      'Platform Co-Owner',
    ],
  },
  {
    key: 'save_favorite',
    label: 'Save Favorite Feature',
    group: 'Marketplace & Growth',
    defaultState: true,
    canDisable: true,
    description: 'Enables saving and bookmarking favorite storefronts, ads, and listings. When OFF, the Save Favorite button is hidden everywhere.',
    navTabIds: ['favorites'],
    keywords: ['Save Favorite', 'Bookmark', 'Favorites', 'Saved Items'],
  },
  {
    key: 'wallet_transfer',
    label: 'Wallet & Credit Transfer',
    group: 'Core System',
    defaultState: true,
    canDisable: true,
    description: 'Allows users to transfer money or credits between wallets and users. When OFF, transfer buttons and backend transfer actions are blocked.',
    keywords: ['Wallet Transfer', 'Credit Transfer', 'Transfer Funds', 'Send Money'],
  },
  {
    key: 'credit_wallet',
    label: 'Credit Wallet Engine',
    group: 'Credit & Tasks Economy',
    defaultState: true,
    canDisable: true,
    description: 'Enables the Credit Wallet alongside Naira Wallet. When OFF, system operates strictly on ONE WALLET (Naira Wallet), hiding all Credit Wallet balances and options.',
    navTabIds: ['fund-credits', 'task_wallet'],
    keywords: ['Credit Wallet', 'Credit Balance', 'GGG Credits', 'Points Wallet'],
  },
];

/**
 * Quick lookup dictionary by feature key
 */
export const FEATURE_REGISTRY_MAP: Record<string, FeatureDefinition> = {};
FEATURE_REGISTRY.forEach(f => {
  FEATURE_REGISTRY_MAP[f.key] = f;
});

export type MenuSection = 'Main Navigation' | 'Work & Growth' | 'Discover & Market' | 'Help & Account';

export interface MenuToggleDefinition {
  key: string;
  label: string;
  section: MenuSection;
  defaultState: boolean;
  description: string;
  navTabId: string;
}

export const MENU_TOGGLE_REGISTRY: MenuToggleDefinition[] = [
  {
    key: 'nav_home',
    label: 'Home Dashboard',
    section: 'Main Navigation',
    defaultState: true,
    description: 'Main navigation item for Home overview',
    navTabId: 'ads',
  },
  {
    key: 'nav_vixora_ai',
    label: 'Vixora AI Creator',
    section: 'Main Navigation',
    defaultState: true,
    description: 'Main navigation item for Vixora AI Video Creator Suite',
    navTabId: 'vixora-creator',
  },
  {
    key: 'nav_feed',
    label: 'Community Feed',
    section: 'Main Navigation',
    defaultState: true,
    description: 'Main navigation item for Social Community Discussions',
    navTabId: 'feed',
  },
  {
    key: 'nav_credit_tasks',
    label: 'Credit Tasks',
    section: 'Main Navigation',
    defaultState: true,
    description: 'Main navigation item for Social Credit Earn Tasks',
    navTabId: 'tasks',
  },
  {
    key: 'nav_campaigns',
    label: 'Banner Ads',
    section: 'Main Navigation',
    defaultState: true,
    description: 'Main navigation item for Commercial Banner Ad Campaigns',
    navTabId: 'campaigns',
  },
  {
    key: 'nav_airtime_redeem',
    label: 'Redeem Airtime & Data',
    section: 'Main Navigation',
    defaultState: true,
    description: 'Main navigation item for Instant Airtime & Data Redemption',
    navTabId: 'redeem-airtime',
  },
  {
    key: 'nav_wallet',
    label: 'Wallet Hub',
    section: 'Main Navigation',
    defaultState: true,
    description: 'Main navigation item for Cash & Credit Wallet Management',
    navTabId: 'wallet',
  },
  {
    key: 'nav_inbox',
    label: 'GGD Inbox',
    section: 'Main Navigation',
    defaultState: true,
    description: 'Main navigation item for Direct Messaging & Audio Calls',
    navTabId: 'inbox',
  },
  {
    key: 'nav_profile',
    label: 'My Profile',
    section: 'Main Navigation',
    defaultState: true,
    description: 'Main navigation item for User Profile & Account Settings',
    navTabId: 'profile',
  },
  {
    key: 'nav_my_business',
    label: 'My Business',
    section: 'Work & Growth',
    defaultState: true,
    description: 'Work navigation item for Merchant Storefront & Business Workspace',
    navTabId: 'my-business',
  },
  {
    key: 'nav_growth',
    label: 'Business Growth',
    section: 'Work & Growth',
    defaultState: true,
    description: 'Work navigation item for Business Analytics & Revenue Growth',
    navTabId: 'growth',
  },
  {
    key: 'syndicate_portal',
    label: 'Syndicate Portal',
    section: 'Work & Growth',
    defaultState: true,
    description: 'Toggle on/off the Syndicate Portal button in navigation menus across the platform.',
    navTabId: 'syndicate',
  },
  {
    key: 'nav_syndicate',
    label: 'Syndicate Hub / Campaigns',
    section: 'Work & Growth',
    defaultState: true,
    description: 'Work navigation item for Syndicate Campaigns & Promoter Hub',
    navTabId: 'syndicate',
  },
  {
    key: 'nav_favorites',
    label: 'Saved & Favorites',
    section: 'Discover & Market',
    defaultState: true,
    description: 'Discover navigation item for Bookmarked Ads, Storefronts & Posts',
    navTabId: 'favorites',
  },
  {
    key: 'nav_contact_gain',
    label: 'Contact Gain Hub',
    section: 'Discover & Market',
    defaultState: true,
    description: 'Discover navigation item for Contact Exchange & WhatsApp Audience Growth',
    navTabId: 'contact-gain',
  },
  {
    key: 'nav_share_earn',
    label: 'Share & Earn',
    section: 'Discover & Market',
    defaultState: true,
    description: 'Discover navigation item for Referral Network & Viral Promotion',
    navTabId: 'share-earn',
  },
  {
    key: 'nav_marketplace',
    label: 'Marketing Tools Marketplace',
    section: 'Discover & Market',
    defaultState: true,
    description: 'Discover navigation item for Growth Apps & Marketing Plugins',
    navTabId: 'marketplace',
  },
  {
    key: 'nav_directory',
    label: 'Business Directory',
    section: 'Discover & Market',
    defaultState: true,
    description: 'Discover navigation item for Accredited Business Listings',
    navTabId: 'directory',
  },
  {
    key: 'nav_api_keys',
    label: 'API Keys',
    section: 'Discover & Market',
    defaultState: true,
    description: 'Discover navigation item for Developer Integration API Keys',
    navTabId: 'api-keys',
  },
  {
    key: 'nav_guide',
    label: 'GGD User Guide',
    section: 'Help & Account',
    defaultState: true,
    description: 'Help navigation item for Step-by-Step Guides & Manuals',
    navTabId: 'guide',
  },
  {
    key: 'nav_support',
    label: 'Support & Live Chat',
    section: 'Help & Account',
    defaultState: true,
    description: 'Help navigation item for Customer Care & Live Support',
    navTabId: 'support',
  },
  {
    key: 'nav_about',
    label: 'About GGD',
    section: 'Help & Account',
    defaultState: true,
    description: 'Help navigation item for Platform Info & Legal Terms',
    navTabId: 'about',
  },
  {
    key: 'create_fab',
    label: 'Create Quick FAB Button',
    section: 'Main Navigation',
    defaultState: true,
    description: 'Floating action create button shown in lower navigation bar',
    navTabId: 'create-fab',
  },
];

export const MENU_TOGGLE_MAP: Record<string, MenuToggleDefinition> = {};
MENU_TOGGLE_REGISTRY.forEach(m => {
  MENU_TOGGLE_MAP[m.key] = m;
});

/**
 * WhatsApp Syndicate Focus Preset:
 * Turns OFF everything EXCEPT:
 * - Syndicate Core & WhatsApp channels (Status, Group, Channel)
 * - Business profile & verification
 * - Wallet funding & Paystack
 * - Escrow
 * - Referrals
 * - Notifications
 * - Support
 */
export const WHATSAPP_SYNDICATE_FOCUS_PRESET: Record<string, boolean> = {
  // WhatsApp only for syndicate
  syndicate_non_whatsapp_channels: false,

  // Turn off all other non-core features
  banner_ads: false,
  action_center_banners: false,
  featured_slider: false,
  slide_manager: false,
  credit_tasks: false,
  watch_and_earn: false,
  youtube_boost: false,
  task_wallet: false,
  credit_wallet: false,
  wallet_transfer: false,
  credit_transfer: false,
  credit_airtime_redeem: false,
  business_directory: false,
  storefronts: false,
  featured_storefronts: false,
  products_services: false,
  community_feed: false,
  chat_and_calls: false,
  referral_chat: false,
  save_favorite: false,
  blogmate_ai: false,
  vixora_ai_studio: false,
  ebook_generator: false,
  web_app_generator: false,
  sales_funnel: false,
  naija_script_writer: false,
  link_shortener: false,
  ggd_ai_chat: false,
  realtime_search: false,
  digital_products_store: false,
  marketing_apps_marketplace: false,
  cpa_marketing: false,
  premium_vip_upgrade: false,
  co_owner_upgrade: false,

  // Keep these strictly ON
  wallet_funding: true,
  escrow: true,
  syndicate_core: true,
  auth_system: true,
  support_system: true,
  referral_system: true,
};

/**
 * Helper to check if a feature is enabled
 */
export const isFeatureEnabled = (
  key: string,
  toggles: Record<string, boolean>
): boolean => {
  const def = FEATURE_REGISTRY_MAP[key];
  if (def && !def.canDisable) {
    return true; // Protected core features cannot be disabled
  }
  if (toggles[key] !== undefined) {
    return Boolean(toggles[key]);
  }

  // Check menu toggles
  const menuDef = MENU_TOGGLE_MAP[key];
  if (menuDef && toggles[key] !== undefined) {
    return Boolean(toggles[key]);
  }

  // Check backward compatible aliases
  if ((key === 'syndicate_portal' || key === 'nav_syndicate' || key === 'syndicate') && toggles['syndicate_portal'] !== undefined) {
    return Boolean(toggles['syndicate_portal']);
  }
  if ((key === 'syndicate_portal' || key === 'nav_syndicate') && toggles['nav_syndicate'] !== undefined) {
    return Boolean(toggles['nav_syndicate']);
  }
  if (key === 'banner_ads' && toggles['ads'] !== undefined) return Boolean(toggles['ads']);
  if (key === 'credit_tasks' && toggles['tasks'] !== undefined) return Boolean(toggles['tasks']);
  if (key === 'community_feed' && toggles['community'] !== undefined) return Boolean(toggles['community']);
  if (key === 'business_directory' && toggles['directory'] !== undefined) return Boolean(toggles['directory']);
  if (key === 'marketing_apps_marketplace' && toggles['marketplace'] !== undefined) return Boolean(toggles['marketplace']);
  if (key === 'credit_airtime_redeem' && toggles['airtime_redeem'] !== undefined) return Boolean(toggles['airtime_redeem']);
  if (key === 'vixora_ai_studio' && toggles['vixora_ai'] !== undefined) return Boolean(toggles['vixora_ai']);
  if (key === 'chat_and_calls' && toggles['p2p_chat'] !== undefined) return Boolean(toggles['p2p_chat']);
  if (key === 'premium_vip_upgrade' && toggles['premium_upgrade'] !== undefined) return Boolean(toggles['premium_upgrade']);
  if ((key === 'save_favorite' || key === 'favorites') && toggles['save_favorite'] !== undefined) return Boolean(toggles['save_favorite']);
  if ((key === 'save_favorite' || key === 'favorites') && toggles['favorites'] !== undefined) return Boolean(toggles['favorites']);
  if ((key === 'wallet_transfer' || key === 'credit_transfer') && toggles['wallet_transfer'] !== undefined) return Boolean(toggles['wallet_transfer']);
  if ((key === 'wallet_transfer' || key === 'credit_transfer') && toggles['credit_transfer'] !== undefined) return Boolean(toggles['credit_transfer']);
  if ((key === 'credit_wallet' || key === 'task_wallet') && toggles['credit_wallet'] !== undefined) return Boolean(toggles['credit_wallet']);
  if ((key === 'credit_wallet' || key === 'task_wallet') && toggles['task_wallet'] !== undefined) return Boolean(toggles['task_wallet']);

  if (menuDef) return menuDef.defaultState;
  return def ? def.defaultState : true;
};

/**
 * Filter an array of items by feature toggle
 */
export function filterByFeature<T>(
  items: T[],
  featureKeyGetter: (item: T) => string | undefined,
  isEnabled: (key: string) => boolean
): T[] {
  return items.filter(item => {
    const key = featureKeyGetter(item);
    if (!key) return true;
    return isEnabled(key);
  });
}

/**
 * Scrub copy of any disabled feature keywords and clean grammar
 */
export function scrubFeatureCopy(
  text: string,
  isEnabled: (key: string) => boolean
): string {
  if (!text) return '';
  let result = text;

  for (const def of FEATURE_REGISTRY) {
    if (!isEnabled(def.key)) {
      for (const kw of def.keywords) {
        if (!kw) continue;
        // Case-insensitive replacement
        const regex = new RegExp(`\\b${kw}\\b`, 'gi');
        result = result.replace(regex, '');
      }
    }
  }

  // Clean double commas, leading/trailing whitespace and punctuation anomalies
  result = result
    .replace(/\s*,\s*,\s*/g, ', ')
    .replace(/\s*,\s*\./g, '.')
    .replace(/,\s*and\s*,/g, ' and ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return result;
}

/**
 * React Component to conditionally render content based on a feature toggle
 */
export const Feature: React.FC<{
  name: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ name, fallback = null, children }) => {
  const { isEnabled, loading } = useFeatureToggles();
  // While loading, do not flash content for gated features
  if (loading) return null;
  if (!isEnabled(name)) return React.createElement(React.Fragment, null, fallback);
  return React.createElement(React.Fragment, null, children);
};

/**
 * Custom React Hook to check a single feature toggle
 */
export const useFeature = (key: string): boolean => {
  const { isEnabled } = useFeatureToggles();
  return isEnabled(key);
};
