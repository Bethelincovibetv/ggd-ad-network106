import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SyndicateGuide from "@/components/SyndicateGuide";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, ChevronDown, Wallet, CreditCard, Share2, Crown,
  Megaphone, Store, Users, Gift, Smartphone, Sparkles, Image as ImageIcon,
  Bell, Hash, Heart, MessageCircle, Search, Briefcase, Building2, Palette, Link2,
  ShieldCheck, Send, BarChart3,
} from "lucide-react";
import guideHero from "@/assets/guide-hero.jpg";

interface Section {
  icon: React.ReactNode;
  title: string;
  badge: string;
  content: string;
  keywords: string;
}

const sections: Section[] = [
  {
    icon: <Megaphone className="h-5 w-5 text-orange-500" />,
    title: "Banner Ads — Create & Promote",
    badge: "Ads",
    keywords: "banner ad create new ad form duration credits cost upload image target url campaign promote",
    content:
`Banner ads run across the entire network. Anyone browsing the app sees them in rotation.

**Create a banner:**
1. Go to **Home** and tap **New Banner Ad** (cost shown on the button)
2. The page scrolls straight to the banner form — no need to scroll yourself
3. Enter a **Title**, **Description**, and **Target URL** (where clicks should go)
4. Pick a **Duration** (1, 3, 7, 14 or 30 days). Premium/Admin unlock longer durations.
5. Upload a **Banner Image** (recommended ratio: 16:9, max 2MB)
6. Toggle **Active** on, then tap **Create**

**How you're charged:**
• Standard rate is *X credits per day* shown on the New Ad button (admin sets this in Admin Settings)
• Total = duration × daily rate. Deducted from your credits the moment you tap Create.
• Admins create banner ads for free.`,
  },
  {
    icon: <Briefcase className="h-5 w-5 text-emerald-500" />,
    title: "Syndicate Campaigns — Manual vs Auto Approval",
    badge: "Business",
    keywords: "syndicate campaign business task approval manual auto approve proof screenshot review payout",
    content:
`As a business you pay syndicates to share your ads on WhatsApp, Facebook, Google reviews and more.

**Approval Mode (chosen when you create a campaign):**
• **Manual Review** — every proof screenshot lands in your queue. You review and approve before the syndicate gets paid. Best when you want to verify quality.
• **Auto Approve** — the moment a syndicate uploads a proof screenshot, they are paid automatically and stats update instantly. Best when you trust the network and want zero admin work.

**Tip:** Start in Manual for the first 2-3 campaigns to learn what good proof looks like. Switch to Auto once you're comfortable.

**Costs:** Each placement (WhatsApp, Facebook, Google Review, etc.) has its own ₦ rate per syndicate. Total cost = max syndicates × sum of placement rates. Funded from your Task Wallet.`,
  },
  {
    icon: <Users className="h-5 w-5 text-purple-500" />,
    title: "Earning as a Syndicate",
    badge: "Earn",
    keywords: "syndicate earn task wallet payout proof screenshot withdraw upload",
    content:
`Syndicates are paid per task they complete for businesses.

1. Open the **Syndicate** dashboard from the sidebar
2. Pick an available task → download the flyer & share link
3. Post it on the required platform exactly as instructed
4. Snap a **clear screenshot** showing your post is live
5. Tap **Upload Proof** on the task card

Depending on the task's mode you'll either be **paid instantly** (auto-approve) or wait for the business to review (usually within 24h). Earnings sit in your Syndicate Wallet — withdraw to your bank from the Wallet page.`,
  },
  {
    icon: <ShieldCheck className="h-5 w-5 text-rose-500" />,
    title: "Admin — Feature Toggles",
    badge: "Admin",
    keywords: "admin feature toggle enable disable switch on off control panel",
    content:
`Admins can switch every feature on or off in real time without code changes.

Open **Admin → Feature Toggles**. Each row is a feature (Banner Ads, Syndicate Network, Marketplace, Directory, Premium Upgrade, AI Chat, Blog Generator, Ebook Generator, etc.).

• **Switch ON** → the feature appears in the user navigation, side menu and pages.
• **Switch OFF** → the feature is hidden everywhere instantly. Anyone who lands on the page sees a friendly "feature is currently disabled" notice.

Useful for phased rollouts, maintenance windows, or A/B testing.`,
  },
  {
    icon: <Sparkles className="h-5 w-5 text-pink-500" />,
    title: "Community Feed",
    badge: "Social",
    keywords: "post community feed share comment react like emoji photo image video link hashtag template background",
    content:
`The Community Feed lets every user share posts, photos, links and videos with the whole network — like Facebook for businesses.

**Create a post:**
1. Tap **Community** in the sidebar (or **Feed** in the bottom bar)
2. Type your message in the composer
3. Add **#hashtags** to make it easier to find (e.g. #JollofRice #LagosVendor)
4. (Optional) Pick a colorful **background template** for text-only posts
5. (Optional) Tap **Photo** to attach an image, **Link** for a URL, or **Video** for a YouTube/Vimeo link
6. Tap **Post**

**Engaging with posts:**
• **Tap a photo** to view it full-screen
• **Double-tap a photo** to instantly Like it (Instagram-style)
• Hover/long-press the **Like** button to pick a reaction (👍 ❤️ 😂 😮 😢 😡)
• Tap **Comment** to leave a comment
• Tap any **#hashtag** to filter the feed by that tag
• Tap a creator's name or photo to open their business page`,
  },
  {
    icon: <Bell className="h-5 w-5 text-orange-500" />,
    title: "Notifications",
    badge: "Updates",
    keywords: "notification alert bell unread mark read inbox click open link",
    content:
`Stay on top of what's happening in your account.

• Open the **bell icon** in the top bar
• A red badge shows how many unread notifications you have
• **Tap any notification** to mark it as read
• If a notification has a link or destination, tapping it takes you straight there (a deep-link inside the app, or an external page)
• Use **Mark all read** to clear the badge in one tap
• Use the **trash icon** to permanently remove a notification you don't need`,
  },
  {
    icon: <Wallet className="h-5 w-5 text-green-500" />,
    title: "Credits System",
    badge: "Earn",
    keywords: "credit wallet earn money daily login bonus reward points",
    content:
`Credits are your in-app currency.

**How to earn:**
• Daily login bonus
• Complete tasks (sharing links/posts)
• Refer friends with your referral code
• Buy credits with Paystack

**How to spend:**
• Create ad campaigns
• Subscribe to the Business Directory
• Unlock premium marketing apps
• Use AI tools (Blog, Ebook, Funnel)`,
  },
  {
    icon: <Megaphone className="h-5 w-5 text-orange-500" />,
    title: "Creating Ads",
    badge: "Ads",
    keywords: "ad campaign banner advertise create new",
    content:
`Run ads across the GGD network.

1. Go to **Home** and tap **New Ad**
2. Enter title, description and target URL
3. Upload a banner (1200×628 recommended)
4. Set duration (1–7 days free, up to 30 days for Premium)
5. Tap **Create**

Watch impressions, clicks and CTR right on the ad card.`,
  },
  {
    icon: <Briefcase className="h-5 w-5 text-blue-500" />,
    title: "Business Tasks & Syndicate",
    badge: "Tasks",
    keywords: "task syndicate business creator share earn promote",
    content:
`Pay our syndicate of promoters to share your message everywhere.

1. Open **Syndicate Campaigns** in the sidebar
2. Create a task: title, description, share link, flyer
3. Pick the platforms and number of promoters
4. Fund your task wallet — credits are released as syndicates complete the work

Every shared link gets a rich preview with your business name + flyer image, so it looks great on WhatsApp, Facebook and X.`,
  },
  {
    icon: <ImageIcon className="h-5 w-5 text-purple-500" />,
    title: "Task Share Previews (OG Image)",
    badge: "Sharing",
    keywords: "og image preview whatsapp facebook share link flyer",
    content:
`Whenever you share a task link, GGD generates a special preview that:

• Shows your **flyer image** as the share thumbnail
• Shows your **business name** as the source
• Redirects real visitors to the in-app preview where they can complete the task

This means your post looks professional on every social platform — no plain blue links anymore.`,
  },
  {
    icon: <Hash className="h-5 w-5 text-cyan-500" />,
    title: "Hashtags & Discovery",
    badge: "Discover",
    keywords: "hashtag tag discover trend search find filter",
    content:
`Hashtags help people find your posts.

• Add a **#tag** to any community post (e.g. #FoodLagos)
• Tap any hashtag to filter the feed
• Use the **search bar** at the top of the Community Feed to filter posts by keyword or hashtag`,
  },
  {
    icon: <Palette className="h-5 w-5 text-fuchsia-500" />,
    title: "Post Background Templates",
    badge: "Design",
    keywords: "template background design theme color food beauty tech party",
    content:
`Make text-only posts pop with our background templates.

• In the composer, tap the **🎨 palette icon** to open the template picker
• Browse categories: Vibes, Food, Beauty, Tech, Events, Inspire
• Tap any template to apply — your text appears centered on the colorful background
• Pick **None** to go back to a plain post

Use templates for quick announcements, deals, or motivational quotes — no design skills needed.`,
  },
  {
    icon: <CreditCard className="h-5 w-5 text-blue-500" />,
    title: "Buy & Transfer Credits",
    badge: "Credits",
    keywords: "buy purchase paystack transfer send fund credit",
    content:
`**Buying:**
• Open **Buy Credits**, choose a package, pay with Paystack — credits arrive instantly.

**Transferring:**
• Open **Transfer**, enter the recipient's email and amount.
• Premium users enjoy lower transfer fees.`,
  },
  {
    icon: <Crown className="h-5 w-5 text-yellow-500" />,
    title: "Premium Upgrade",
    badge: "Premium",
    keywords: "premium upgrade pay monthly tier benefits subscription",
    content:
`Premium unlocks:

• Longer ad durations (up to 30 days)
• API keys to embed ads on your own website
• Lower transfer fees
• Priority support
• Higher promotion priority in the directory`,
  },
  {
    icon: <Building2 className="h-5 w-5 text-teal-500" />,
    title: "Business Directory",
    badge: "Directory",
    keywords: "directory business listing public discover store",
    content:
`The Directory is the public listing of all verified businesses.

• Browse by category to discover new vendors
• Subscribe to appear in the directory (30-day subscription)
• Listed businesses get a public storefront page that's perfect to share`,
  },
  {
    icon: <Store className="h-5 w-5 text-indigo-500" />,
    title: "Your Business Page",
    badge: "Storefront",
    keywords: "business profile storefront page my business website",
    content:
`Every account has a public business page (your "website").

• Open **My Business** to manage it
• Update logo, hero image, description, contact info, social links
• Anyone can visit your business page from your community posts or shared task links`,
  },
  {
    icon: <Gift className="h-5 w-5 text-purple-500" />,
    title: "Referrals",
    badge: "Refer",
    keywords: "referral invite friend code earn bonus link",
    content:
`Earn credits when friends sign up with your code.

1. Open **Referrals**
2. Copy your unique link
3. Share on WhatsApp, Facebook, X
4. You both earn when they join — and you keep earning a % of their credit purchases`,
  },
  {
    icon: <Link2 className="h-5 w-5 text-sky-500" />,
    title: "Smart Links",
    badge: "Tools",
    keywords: "short link smart shortener track click analytics",
    content:
`Turn any long URL into a short, trackable link.

• Open **Smart Links**, paste the URL
• Get a short ggd link you can share anywhere
• See clicks, devices, countries and referrers in one place`,
  },
  {
    icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />,
    title: "Security & Account",
    badge: "Account",
    keywords: "password security profile delete logout email",
    content:
`• Update your profile from the avatar menu (top right)
• Use a strong, unique password
• Logout from any device by signing out from the menu
• Contact support to delete your account`,
  },
  {
    icon: <Smartphone className="h-5 w-5 text-indigo-500" />,
    title: "Install as an App",
    badge: "Mobile",
    keywords: "install pwa android iphone home screen mobile app",
    content:
`GGD works as a Progressive Web App.

**Android:** Open in Chrome → tap install prompt or "Add to Home Screen".
**iPhone:** Open in Safari → tap Share → "Add to Home Screen".

Once installed, GGD behaves like a native app with offline support.`,
  },
  {
    icon: <BarChart3 className="h-5 w-5 text-orange-500" />,
    title: "Analytics",
    badge: "Insights",
    keywords: "analytics insight stats data impressions clicks ctr performance",
    content:
`See how your content is performing.

• Each ad card shows views, clicks, CTR and remaining days
• Smart Links show country, device and referrer breakdowns
• Community posts display total reactions and comments under each card`,
  },
  {
    icon: <Send className="h-5 w-5 text-pink-500" />,
    title: "Withdrawals",
    badge: "Payout",
    keywords: "withdraw cash bank account payout earnings money",
    content:
`Cash out earnings from the Wallet.

1. Open **Wallet** → request withdrawal
2. Provide bank name, account number and account name
3. Admin reviews and processes the payout`,
  },
];

const UserGuide = () => {
  const [query, setQuery] = useState('');
  const [isSyndicate, setIsSyndicate] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      if ((data || []).some((r: any) => r.role === 'syndicate')) setIsSyndicate(true);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.badge.toLowerCase().includes(q) ||
      s.keywords.toLowerCase().includes(q) ||
      s.content.toLowerCase().includes(q)
    );
  }, [query]);

  const generalGuide = (
    <div className="space-y-4">
      <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-xl">
        <img src={guideHero} alt="GGD Ad Network Guide" className="w-full h-40 object-cover" loading="lazy" />
        <div className="p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <h2 className="text-lg font-black">App Guide</h2>
          </div>
          <p className="text-xs opacity-90 mt-1">
            Everything you need to grow on GGD Ad Network. Tap a section to learn.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search the guide… (e.g. hashtag, withdraw, referral)"
          className="pl-9 h-11 rounded-xl"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No matches for "{query}". Try a different keyword.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((section, i) => (
            <Collapsible key={i} defaultOpen={!!query}>
              <Card className="border-border/50">
                <CollapsibleTrigger className="w-full text-left">
                  <CardContent className="p-3 flex items-center gap-3">
                    {section.icon}
                    <span className="text-sm font-bold text-foreground flex-1">{section.title}</span>
                    <Badge variant="secondary" className="text-[10px]">{section.badge}</Badge>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    <div className="bg-muted/40 rounded-xl p-3.5 text-[13px] text-foreground leading-relaxed whitespace-pre-line">
                      {section.content.split('**').map((part, j) =>
                        j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );

  if (!isSyndicate) return generalGuide;

  return (
    <Tabs defaultValue="general" className="space-y-4">
      <TabsList className="grid grid-cols-2 w-full h-12 rounded-xl">
        <TabsTrigger value="general" className="text-sm font-bold">General Guide</TabsTrigger>
        <TabsTrigger value="syndicate" className="text-sm font-bold">Syndicate Guide</TabsTrigger>
      </TabsList>
      <TabsContent value="general">{generalGuide}</TabsContent>
      <TabsContent value="syndicate"><SyndicateGuide /></TabsContent>
    </Tabs>
  );
};

export default UserGuide;
