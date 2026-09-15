import React, { useState, useMemo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HelpCircle,
  Search,
  Sparkles,
  Megaphone,
  Users,
  Coins,
  ShieldCheck,
  Store,
  MessageCircle,
  ArrowRight,
  CheckCircle2,
  X,
  HelpCircle as QuestionIcon,
  BookOpen,
  Send,
  Zap,
} from "lucide-react";

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'General' | 'Advertisers' | 'Syndicate' | 'Payments' | 'Tools';
  tags?: string[];
  featured?: boolean;
}

export const DEFAULT_AD_NETWORK_FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'General',
    featured: true,
    question: 'What is GGD Ad Network and how does it work?',
    answer: 'GGD Ad Network is Nigeria\'s premier social distribution, banner advertising, and verified merchant platform. We bridge the gap between growing businesses seeking real customers and an active network of publishers, audience promoters (Syndicate), and verified buyers. Advertisers create high-impact banner or social campaigns, which are distributed across our partner websites, social channels, and WhatsApp communities.',
    tags: ['Overview', 'How It Works', 'Basics']
  },
  {
    id: 'faq-2',
    category: 'Advertisers',
    featured: true,
    question: 'How do businesses advertise and reach real customers on GGD?',
    answer: 'Businesses can run multiple campaign types: (1) High-visibility Banner Ads that rotate across our verified publisher network, (2) Paid Syndicate Social Campaigns where micro-promoters broadcast your offer to their WhatsApp statuses, Facebook groups, and TikTok pages with verifiable proof, and (3) Digital Storefront listings in our verified Accredited Business Directory that connect buyers directly to your WhatsApp.',
    tags: ['Advertising', 'Banner Ads', 'Storefront']
  },
  {
    id: 'faq-3',
    category: 'Syndicate',
    featured: true,
    question: 'What is the Syndicate Promoter Network and how do promoters earn?',
    answer: 'The Syndicate is a dedicated community of verified promoters who get paid to distribute promotional content. Promoters browse active paid campaigns, share the business graphics and links to their WhatsApp status, Instagram, Facebook, or TikTok, and submit screenshots as proof of posting. Once approved, cash rewards are paid directly into their Syndicate wallet, which can be withdrawn to any Nigerian bank account.',
    tags: ['Syndicate', 'Earn Money', 'Promoters']
  },
  {
    id: 'faq-4',
    category: 'General',
    question: 'What is the Accredited Business Directory & Digital Storefront?',
    answer: 'The GGD Business Directory is a search-indexed catalog of verified merchants across Nigeria. Every registered business receives a customized digital storefront featuring their logo, verified badge, product catalog, custom pricing, and direct WhatsApp contact buttons. It is SEO-optimized to help local and national buyers find and trust your brand.',
    tags: ['Directory', 'Storefront', 'Verification']
  },
  {
    id: 'faq-5',
    category: 'Payments',
    featured: true,
    question: 'What is the difference between Community Credits (GGG) and the Syndicate Wallet?',
    answer: 'Community Credits (GGG) are internal platform utility tokens used for daily platform activities, community task rewards, AI content generation, and ad boosts. The Syndicate Wallet holds real cash earnings (in Naira ₦) accumulated by verified promoters from completing paid business campaigns, which can be withdrawn directly to personal bank accounts.',
    tags: ['Credits', 'Wallet', 'Withdrawals']
  },
  {
    id: 'faq-6',
    category: 'Payments',
    question: 'How do I fund my wallet or withdraw earnings?',
    answer: 'You can fund your account securely using Paystack (debit cards, bank transfer, USSD, and instant EFT) or via direct platform bank transfers with instant verification. For Syndicate earnings, withdrawals are processed to all CBN-licensed Nigerian commercial banks, microfinance banks, and fintechs (Opay, Palmpay, Kuda) with minimal processing turnaround.',
    tags: ['Funding', 'Paystack', 'Bank Transfer']
  },
  {
    id: 'faq-7',
    category: 'Tools',
    question: 'What marketing and AI tools are included inside GGD?',
    answer: 'GGD includes a comprehensive suite of digital marketing tools: BlogMate AI (generates high-converting articles and sales copy), Sales Funnel Generator (builds landing pages and capture forms), Ebook Generator, Dynamic Link Shortener with analytics, and Web App Generator — all designed to accelerate customer acquisition.',
    tags: ['BlogMate AI', 'Sales Funnel', 'Tools']
  },
  {
    id: 'faq-8',
    category: 'General',
    question: 'Is GGD Ad Network safe, verified, and secure?',
    answer: 'Yes. GGD Ad Network employs bank-grade encryption, certified Paystack payment gateways, manual & AI-assisted advertiser verification, and strict anti-fraud tracking. Both businesses and promoters are protected with transparent escrow verification before funds are released.',
    tags: ['Security', 'Trust', 'Verification']
  },
  {
    id: 'faq-9',
    category: 'Advertisers',
    question: 'How do I get started as a business or advertiser?',
    answer: 'Simply create a free account, complete your Business Profile in the directory, and fund your wallet. You can then launch your first banner ad or paid promoter campaign in less than 5 minutes with real-time performance analytics.',
    tags: ['Get Started', 'Advertisers', 'Quickstart']
  },
  {
    id: 'faq-10',
    category: 'Syndicate',
    question: 'Are there requirements to become a Syndicate promoter?',
    answer: 'Anyone with an active social media following (such as active WhatsApp contacts, Facebook friends, Instagram followers, or TikTok audience) can apply to join the Syndicate. Once approved, you gain immediate access to claim paid business tasks and start earning.',
    tags: ['Syndicate Application', 'Requirements']
  }
];

export interface AdNetworkFAQProps {
  items?: FAQItem[];
  title?: string;
  subtitle?: string;
  badge?: string;
  allowSearch?: boolean;
  defaultCategory?: string;
  variant?: 'dark' | 'light' | 'card';
  showContactCta?: boolean;
  onGetStarted?: () => void;
  onContactSupport?: () => void;
  className?: string;
  id?: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'All': <HelpCircle className="h-3.5 w-3.5" />,
  'General': <Sparkles className="h-3.5 w-3.5 text-amber-400" />,
  'Advertisers': <Megaphone className="h-3.5 w-3.5 text-orange-400" />,
  'Syndicate': <Users className="h-3.5 w-3.5 text-purple-400" />,
  'Payments': <Coins className="h-3.5 w-3.5 text-emerald-400" />,
  'Tools': <Zap className="h-3.5 w-3.5 text-blue-400" />
};

export const AdNetworkFAQ: React.FC<AdNetworkFAQProps> = ({
  items = DEFAULT_AD_NETWORK_FAQS,
  title = "Frequently Asked Questions",
  subtitle = "Everything you need to know about promoting, earning, and scaling your business on GGD Ad Network.",
  badge = "HELP & ANSWERS",
  allowSearch = true,
  defaultCategory = 'All',
  variant = 'dark',
  showContactCta = true,
  onGetStarted,
  onContactSupport,
  className = "",
  id = "faq"
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory);

  const categories = useMemo(() => {
    const cats = ['All', ...Array.from(new Set(items.map(item => item.category)))];
    return cats;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const inQuestion = item.question.toLowerCase().includes(q);
      const inAnswer = item.answer.toLowerCase().includes(q);
      const inTags = item.tags?.some(t => t.toLowerCase().includes(q));

      return inQuestion || inAnswer || inTags;
    });
  }, [items, selectedCategory, searchQuery]);

  const isDark = variant === 'dark';

  return (
    <section
      id={id}
      className={`py-16 md:py-24 transition-colors ${
        isDark ? 'bg-[#0f0c14] text-white' : 'bg-slate-50 text-slate-900'
      } ${className}`}
    >
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header Section */}
        <div className="text-center space-y-3 mb-10 md:mb-14">
          {badge && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-orange-500/10 text-orange-500 border border-orange-500/20">
              <HelpCircle className="h-3.5 w-3.5" />
              {badge}
            </div>
          )}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className={`max-w-2xl mx-auto text-sm md:text-base leading-relaxed ${
              isDark ? 'text-gray-300' : 'text-slate-600'
            }`}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className="space-y-4 mb-8">
          {allowSearch && (
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search questions by keyword, topic, or feature..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-11 pr-10 h-12 rounded-xl text-sm transition-all ${
                  isDark
                    ? 'bg-[#1b1624] border-gray-800 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500/20'
                    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-white bg-gray-700/40 hover:bg-gray-700 transition"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20 scale-105'
                      : isDark
                      ? 'bg-[#1b1624] text-gray-400 hover:text-white hover:bg-[#261f33] border border-gray-800/80'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-sm'
                  }`}
                >
                  {CATEGORY_ICONS[cat] || <HelpCircle className="h-3.5 w-3.5" />}
                  {cat === 'All' ? 'All Questions' : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Counter if filtering */}
        {(searchQuery || selectedCategory !== 'All') && (
          <div className="flex items-center justify-between text-xs text-gray-400 mb-4 px-2">
            <span>
              Showing <strong className="text-orange-400">{filteredItems.length}</strong> {filteredItems.length === 1 ? 'question' : 'questions'}
              {searchQuery && ` for "${searchQuery}"`}
            </span>
            {(searchQuery || selectedCategory !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="text-orange-400 hover:underline font-semibold"
              >
                Reset filters
              </button>
            )}
          </div>
        )}

        {/* Accordion List */}
        {filteredItems.length === 0 ? (
          <div className={`text-center py-12 px-4 rounded-2xl border ${
            isDark ? 'bg-[#171220] border-gray-800 text-gray-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            <QuestionIcon className="h-10 w-10 mx-auto text-orange-400 mb-3 opacity-80" />
            <h4 className="font-bold text-base text-foreground mb-1">No matching questions found</h4>
            <p className="text-xs max-w-md mx-auto">
              We couldn't find an answer matching your search. Try different keywords or reach out directly to our support team.
            </p>
            {onContactSupport && (
              <Button
                onClick={onContactSupport}
                size="sm"
                className="mt-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl"
              >
                <MessageCircle className="h-4 w-4 mr-1.5" /> Contact Support Team
              </Button>
            )}
          </div>
        ) : (
          <Accordion
            type="single"
            collapsible
            defaultValue={filteredItems[0]?.id}
            className="space-y-3"
          >
            {filteredItems.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isDark
                    ? 'bg-gradient-to-b from-[#1b1527] to-[#140e1f] border-gray-800/80 hover:border-orange-500/40 data-[state=open]:border-orange-500/60 data-[state=open]:shadow-lg data-[state=open]:shadow-orange-500/5'
                    : 'bg-white border-slate-200/90 hover:border-orange-400/50 data-[state=open]:border-orange-500 shadow-sm'
                }`}
              >
                <AccordionTrigger className="px-5 py-4.5 hover:no-underline text-left text-sm md:text-base font-bold group">
                  <div className="flex items-start md:items-center gap-3 pr-4 flex-1">
                    <span className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 md:mt-0 ${
                      isDark ? 'bg-orange-500/10 text-orange-400 group-hover:bg-orange-500/20' : 'bg-orange-50 text-orange-600'
                    }`}>
                      {CATEGORY_ICONS[item.category] || <HelpCircle className="h-4 w-4" />}
                    </span>
                    <span className="flex-1 group-hover:text-orange-400 transition-colors">
                      {item.question}
                    </span>
                    {item.featured && (
                      <span className="hidden sm:inline-flex items-center text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">
                        Popular
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 pt-1 text-xs md:text-sm leading-relaxed text-gray-300">
                  <div className={`p-4 rounded-xl border ${
                    isDark ? 'bg-[#0f0a17]/70 border-gray-800/60 text-gray-300' : 'bg-slate-50 border-slate-100 text-slate-700'
                  }`}>
                    <p className="whitespace-pre-line">{item.answer}</p>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-800/50">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                              isDark ? 'bg-gray-800/80 text-gray-400' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* Still Have Questions CTA */}
        {showContactCta && (
          <div className={`mt-12 p-6 md:p-8 rounded-2xl border text-center relative overflow-hidden ${
            isDark
              ? 'bg-gradient-to-r from-[#1d142b] via-[#241738] to-[#1b1228] border-orange-500/20'
              : 'bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border-orange-200'
          }`}>
            <div className="max-w-xl mx-auto space-y-3 relative z-10">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-orange-500/20 text-orange-400 mx-auto">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h3 className="text-lg md:text-xl font-black">
                Still have questions or need personalized guidance?
              </h3>
              <p className={`text-xs md:text-sm leading-relaxed ${
                isDark ? 'text-gray-300' : 'text-slate-600'
              }`}>
                Our support specialists and community managers are available 24/7 on WhatsApp and Live Chat to assist with onboarding, campaign setup, and payouts.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {onGetStarted && (
                  <Button
                    onClick={onGetStarted}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl px-5 h-10 text-xs shadow-lg shadow-orange-500/20"
                  >
                    Get Started Free <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    if (onContactSupport) {
                      onContactSupport();
                    } else {
                      window.open('https://wa.me/2348131107416?text=' + encodeURIComponent('Hello GGD Ad Network Team, I have a question about the platform.'), '_blank');
                    }
                  }}
                  className={`font-bold rounded-xl px-5 h-10 text-xs border ${
                    isDark
                      ? 'border-gray-700 bg-[#160f21] hover:bg-[#201630] text-white'
                      : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                  Chat on WhatsApp
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default AdNetworkFAQ;
