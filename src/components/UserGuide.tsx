import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search, ChevronDown, Megaphone, Building2, Store, Users,
  Sparkles, Wallet, BarChart3, MessageCircle, CreditCard, BookOpen,
  CheckCircle2, Image as ImageIcon, ArrowRight,
} from 'lucide-react';
import guideHero from '@/assets/guide-hero.jpg';

interface GuideSection {
  title: string;
  badge: string;
  icon: React.ReactNode;
  keywords: string;
  actionTab?: string;
  actionLabel?: string;
  content: React.ReactNode;
}

const sections: GuideSection[] = [
  {
    title: 'Start Here — How GGD Helps You Grow',
    badge: 'Getting Started',
    icon: <Sparkles className="h-5 w-5" />,
    keywords: 'welcome ggd ad network business growth marketing customers visibility discover get started',
    actionTab: 'directory',
    actionLabel: 'Explore Business Directory',
    content: (
      <div className="space-y-3">
        <p><strong>GGD Ad Network</strong> is a digital business-growth and marketing platform that helps businesses get discovered, reach more customers, promote their products and services, and grow.</p>
        <p>The platform brings several growth channels together:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Get discovered:</strong> create a business presence in the Business Directory.</li>
          <li><strong>Sell:</strong> showcase products and services.</li>
          <li><strong>Get visibility:</strong> use GGD Banner Ads and eligible featured placements.</li>
          <li><strong>Promote:</strong> use Credit Tasks for community promotion or verified Syndicate promoters for paid promotion.</li>
          <li><strong>Create:</strong> use marketing tools such as BlogMate AI.</li>
          <li><strong>Connect:</strong> use Community to build awareness and relationships.</li>
          <li><strong>Measure:</strong> use available analytics to understand results.</li>
        </ul>
        <div className="rounded-xl bg-orange-50 p-4 dark:bg-orange-950/20">
          <p className="font-semibold text-orange-950 dark:text-orange-200">Simple growth path</p>
          <p className="mt-1 text-orange-900 dark:text-orange-300">Get discovered → Create and promote → Reach customers → Grow</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Business Directory — Get Discovered',
    badge: 'Discovery',
    icon: <Building2 className="h-5 w-5" />,
    keywords: 'business directory listing discover profile storefront business page location contact',
    actionTab: 'directory',
    actionLabel: 'Open Business Directory',
    content: (
      <div className="space-y-3">
        <p>The <strong>Business Directory</strong> is GGD's discovery layer. It helps people find businesses, products and services.</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Create and maintain your public business profile.</li>
          <li>Add your logo, description, location, contact details, WhatsApp and relevant links.</li>
          <li>Use your public business page as a destination you can share with customers.</li>
          <li>Keep business information accurate so people understand what you offer and how to reach you.</li>
        </ul>
        <p><strong>Think of it as your GGD business presence:</strong> people discover you first, then move to your products, services or contact options.</p>
      </div>
    ),
  },
  {
    title: 'Products & Services — Show What You Sell',
    badge: 'Business',
    icon: <Store className="h-5 w-5" />,
    keywords: 'products marketplace services sell listing product service shop business',
    actionTab: 'my-business',
    actionLabel: 'Manage Products & Storefront',
    content: (
      <div className="space-y-3">
        <p>Your business presence can showcase what you actually sell or provide.</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Products:</strong> list products with useful details so customers can discover and evaluate them.</li>
          <li><strong>Services:</strong> present the services your business offers and how customers can contact you.</li>
          <li>Keep listings connected to the correct business profile so discovery leads back to your business.</li>
        </ul>
        <p>The goal is simple: <strong>visibility should lead somewhere useful.</strong></p>
      </div>
    ),
  },
  {
    title: 'Banner Ads — Buy Visibility Across GGD',
    badge: 'Advertising',
    icon: <Megaphone className="h-5 w-5" />,
    keywords: 'banner ads advertising campaign impressions clicks ctr target url promote paid visibility',
    actionTab: 'campaigns',
    actionLabel: 'Launch a Banner Campaign',
    content: (
      <div className="space-y-3">
        <p><strong>GGD Banner Ads</strong> are the platform's commercial display advertising system. They are separate from the Featured Slider.</p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Create your campaign with the required creative, message and destination.</li>
          <li>Choose the available duration and placement options.</li>
          <li>Fund the campaign according to the platform's current pricing.</li>
          <li>Monitor available impressions, clicks and performance information.</li>
        </ol>
        <div className="rounded-xl border p-4 bg-muted/30">
          <p className="font-semibold text-foreground">Banner Ads ≠ Featured Slider</p>
          <p className="mt-1 text-sm text-muted-foreground">Banner Ads are paid advertising. The Featured Slider is an admin-managed featured-content, featured-business or announcement presentation system.</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Featured Slider — Featured, Not Banner Advertising',
    badge: 'Featured',
    icon: <ImageIcon className="h-5 w-5" />,
    keywords: 'slider featured business update announcement placement slides admin',
    content: (
      <div className="space-y-3">
        <p>The <strong>Featured Slider</strong> is a separate presentation layer for featured updates, businesses, features or announcements selected by the platform.</p>
        <p>It should not be confused with buying a Banner Ad. Featured exposure follows the platform's applicable admin rules.</p>
      </div>
    ),
  },
  {
    title: 'Credit Tasks — Community Promotion & Earn-and-Spend',
    badge: 'Credits',
    icon: <CreditCard className="h-5 w-5" />,
    keywords: 'credit task youtube views watch time likes comments subscribers website visits shares reward credits earn promote',
    actionTab: 'tasks',
    actionLabel: 'Open Credit Tasks',
    content: (
      <div className="space-y-3">
        <p><strong>Credit Tasks</strong> let a user or business fund a community promotion task using GGD credits. Other users complete the task and receive GGD credits as their reward.</p>
        <p>Task goals can include YouTube views, watch time, likes, comments, subscribers, website visits and social shares.</p>
        <div className="rounded-xl bg-muted/60 p-4">
          <p className="font-semibold text-foreground">The GGD credit loop</p>
          <p className="mt-1 text-sm text-muted-foreground">User A spends GGD credits → creates a promotion task → User B completes it → User B earns GGD credits → User B can use those credits for eligible GGD activities.</p>
        </div>
        <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Important: Credit Tasks are not the Syndicate system.</p>
      </div>
    ),
  },
  {
    title: 'Syndicate — Verified Paid Promotion Network',
    badge: 'Promoters',
    icon: <Users className="h-5 w-5" />,
    keywords: 'syndicate verified promoter paid promotion whatsapp facebook instagram tiktok telegram proof earnings wallet payout',
    actionTab: 'syndicate',
    actionLabel: 'Open Syndicate Hub',
    content: (
      <div className="space-y-3">
        <p><strong>Syndicate</strong> is GGD's verified professional promotion network. Businesses fund paid campaigns and verified Syndicate promoters complete promotional work.</p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>A business creates and funds a Syndicate campaign.</li>
          <li>A verified promoter accepts an available campaign.</li>
          <li>The promoter carries out the required promotion on the specified channel.</li>
          <li>The promoter submits proof/results when required.</li>
          <li>The campaign is reviewed according to its approval mode and eligible earnings are paid.</li>
        </ol>
        <div className="rounded-xl border p-4 bg-muted/30">
          <p className="font-semibold text-foreground">Two separate economies</p>
          <p className="mt-1 text-sm text-muted-foreground">A Syndicate member keeps their normal GGD Credit Wallet and also has a separate Syndicate paid-earnings wallet. They are not the same balance.</p>
        </div>
      </div>
    ),
  },
  {
    title: 'BlogMate AI — Create Marketing Content',
    badge: 'Marketing Tools',
    icon: <BookOpen className="h-5 w-5" />,
    keywords: 'blogmate ai blog article content writing advertisement marketing funnel create edit save publish',
    actionTab: 'blogmate',
    actionLabel: 'Open BlogMate AI',
    content: (
      <div className="space-y-3">
        <p><strong>BlogMate AI</strong> is one of GGD's marketing/content tools. It helps turn a business idea into useful marketing content.</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Generate blog posts and articles.</li>
          <li>Create marketing and advertising copy.</li>
          <li>Prepare content that supports campaigns, products or promotions.</li>
          <li>Edit generated content before using it.</li>
        </ul>
        <p><strong>BlogMate is a tool inside GGD</strong>, not the identity of the whole platform.</p>
        <p>Intended content journey: <strong>Generate → Edit → Save → Publish → Discover → Promote → Track.</strong></p>
      </div>
    ),
  },
  {
    title: 'Community — Build Awareness & Relationships',
    badge: 'Community',
    icon: <MessageCircle className="h-5 w-5" />,
    keywords: 'community feed posts comments reactions hashtags share photos video businesses social',
    actionTab: 'feed',
    actionLabel: 'Open Community Feed',
    content: (
      <div className="space-y-3">
        <p>The <strong>Community</strong> is GGD's social and distribution layer.</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Create posts and share relevant links, images and supported video content.</li>
          <li>Use hashtags to improve discovery.</li>
          <li>React, comment and engage with other posts.</li>
          <li>Use community participation to build awareness around a business or offer.</li>
        </ul>
      </div>
    ),
  },
  {
    title: 'GGG Credits — Your Internal Platform Currency',
    badge: 'Wallet',
    icon: <Wallet className="h-5 w-5" />,
    keywords: 'ggg credits wallet earn spend buy transfer tasks promotion internal currency',
    actionTab: 'wallet',
    actionLabel: 'Open Wallet Hub',
    content: (
      <div className="space-y-3">
        <p><strong>GGG credits</strong> are the internal platform currency used for eligible GGD activities.</p>
        <p>Users may earn or obtain credits and spend them on eligible promotion, advertising or marketing features according to active platform rules.</p>
        <p>Credit balances are separate from the <strong>Syndicate paid-earnings wallet</strong>.</p>
      </div>
    ),
  },
  {
    title: 'Analytics — Understand Your Results',
    badge: 'Insights',
    icon: <BarChart3 className="h-5 w-5" />,
    keywords: 'analytics impressions clicks ctr performance campaign results tracking insights',
    actionTab: 'growth',
    actionLabel: 'View Business Growth Score',
    content: (
      <div className="space-y-3">
        <p>Marketing is more useful when you can see what happened after you promoted something.</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Review available ad impressions and clicks.</li>
          <li>Use CTR and other campaign information where available.</li>
          <li>Review relevant promotion/content activity and results.</li>
          <li>Use what you learn to improve the next campaign or piece of content.</li>
        </ul>
      </div>
    ),
  },
  {
    title: 'Account & Getting Help',
    badge: 'Support',
    icon: <CheckCircle2 className="h-5 w-5" />,
    keywords: 'account profile notifications security support help guide password mobile app install',
    actionTab: 'support',
    actionLabel: 'Contact Support',
    content: (
      <div className="space-y-3">
        <ul className="list-disc space-y-2 pl-5">
          <li>Keep your business/profile information accurate.</li>
          <li>Watch notifications for account and campaign updates.</li>
          <li>Use a strong password and protect your credentials.</li>
          <li>Use the platform's support/help options when you need assistance.</li>
          <li>GGD is designed for mobile use and can be installed as a Progressive Web App when available.</li>
        </ul>
      </div>
    ),
  },
];

const UserGuide = () => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(0);

  const handleNavigate = (tab: string) => {
    window.dispatchEvent(new CustomEvent('ggd-nav', { detail: tab }));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter(s => `${s.title} ${s.badge} ${s.keywords}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-8">
      <Card className="overflow-hidden border-0 shadow-sm">
        <div className="relative min-h-[230px] overflow-hidden">
          <img src={guideHero} alt="GGD Ad Network Guide" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative flex min-h-[230px] flex-col justify-end p-5 text-white sm:p-8">
            <Badge className="mb-3 w-fit bg-white/15 text-white hover:bg-white/20">GGD Ad Network</Badge>
            <h1 className="text-2xl font-black sm:text-4xl">Welcome to GGD Ad Network</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">Your guide to getting discovered, promoting your business, reaching customers and growing with GGD.</p>
          </div>
        </div>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Get Discovered', 'Directory, products & services'],
              ['Get Visibility', 'Banner Ads & featured exposure'],
              ['Promote & Grow', 'Credit Tasks, Syndicate & tools'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-xl bg-muted/50 p-4">
                <p className="font-bold">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search the GGD Guide..." className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filtered.map((section, index) => {
          const isOpen = open === index;
          return (
            <Card key={section.title} className="overflow-hidden">
              <button
                type="button"
                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40 sm:p-5"
                onClick={() => setOpen(isOpen ? -1 : index)}
                aria-expanded={isOpen}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400">
                  {section.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold">{section.title}</h2>
                    <Badge variant="secondary">{section.badge}</Badge>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <CardContent className="border-t pt-4 text-sm leading-6 text-muted-foreground sm:px-5 sm:pt-5 space-y-4">
                  {section.content}
                  {section.actionTab && section.actionLabel && (
                    <div className="pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleNavigate(section.actionTab!)}
                        className="bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-xs h-9 rounded-xl shadow-sm"
                      >
                        {section.actionLabel}
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-semibold">No guide section found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try ads, directory, credits, syndicate or BlogMate.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserGuide;
