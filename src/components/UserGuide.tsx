import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, ChevronDown, Wallet, CreditCard, Share2, Crown, 
  Megaphone, Store, Users, Gift, Star, Smartphone, BarChart3, Send
} from "lucide-react";

const sections = [
  {
    icon: <Wallet className="h-4 w-4 text-green-500" />,
    title: "Credits System",
    badge: "Earning",
    content: `Credits are your in-app currency. Here's how to earn and use them:\n\n**How to earn credits:**\n• **Daily Login** – You get free credits every day you log in\n• **Complete Tasks** – Share links and content to earn credits\n• **Referrals** – Invite friends using your referral code and earn bonus credits\n• **Buy Credits** – Purchase credits via Paystack\n\n**How to spend credits:**\n• Create ad campaigns\n• Subscribe to the Business Directory\n• Access premium marketing apps\n• Use AI tools (Blog, Ebook, Funnel generators)`
  },
  {
    icon: <Megaphone className="h-4 w-4 text-orange-500" />,
    title: "Creating Ad Campaigns",
    badge: "Ads",
    content: `Advertise your business or product across the GGD network:\n\n1. Go to **Home** tab and click **New Ad**\n2. Enter your ad **title**, **description**, and **target URL**\n3. Upload a **banner image** (recommended: 1200x628px)\n4. Set the **duration** (1-7 days free, 14-30 days for Premium)\n5. Click **Create** — your ad starts showing immediately!\n\n**Tips:**\n• Eye-catching banners get more clicks\n• Keep descriptions short and clear\n• Track impressions and clicks on your dashboard`
  },
  {
    icon: <CreditCard className="h-4 w-4 text-blue-500" />,
    title: "Buying & Transferring Credits",
    badge: "Credits",
    content: `**Buying Credits:**\n• Go to **Buy Credits** tab\n• Select a package or enter custom amount\n• Pay securely via Paystack (cards, bank transfer)\n• Credits are added instantly!\n\n**Transferring Credits:**\n• Go to **Transfer** tab\n• Enter the recipient's email\n• Enter the amount to send\n• Premium users get lower transfer fees!`
  },
  {
    icon: <Share2 className="h-4 w-4 text-pink-500" />,
    title: "Tasks & Earning",
    badge: "Tasks",
    content: `Complete simple tasks to earn credits:\n\n1. Go to **Tasks** from the bottom menu\n2. Browse available tasks (usually sharing a link)\n3. Click **Share** to share on your social media\n4. After sharing, click **Complete** to earn your reward\n\n**Note:** Each task can only be completed once. New tasks are added regularly!`
  },
  {
    icon: <Crown className="h-4 w-4 text-yellow-500" />,
    title: "Premium & Business Upgrades",
    badge: "Upgrade",
    content: `**Premium Benefits:**\n• Longer ad durations (up to 30 days)\n• API keys for website ad embeds\n• Lower transfer fees\n• Priority support\n\n**Business Benefits:**\n• Everything in Premium\n• Create syndicate tasks for social media promotion\n• Business storefront page\n• Business Directory listing\n• Task wallet for paying syndicates`
  },
  {
    icon: <Store className="h-4 w-4 text-teal-500" />,
    title: "Business Directory",
    badge: "Directory",
    content: `The Business Directory is a public listing of verified businesses:\n\n• Browse listed businesses for products and services\n• Business users can subscribe to appear in the directory\n• Subscription costs credits (set by admin)\n• Each subscription lasts 30 days\n• Great for discovering local businesses!`
  },
  {
    icon: <Gift className="h-4 w-4 text-purple-500" />,
    title: "Referral Program",
    badge: "Referrals",
    content: `Earn credits by inviting friends:\n\n1. Go to **Promote** tab\n2. Copy your unique **referral link**\n3. Share it on social media, WhatsApp, etc.\n4. When someone signs up using your link, you both earn credits!\n\nYou'll also find **ready-made promotional messages** you can copy and share.`
  },
  {
    icon: <Smartphone className="h-4 w-4 text-indigo-500" />,
    title: "Install the App",
    badge: "Mobile",
    content: `GGD works as a Progressive Web App (PWA):\n\n**On Android:**\n• Open the site in Chrome\n• Tap the install prompt or go to Menu → "Add to Home Screen"\n\n**On iPhone:**\n• Open in Safari\n• Tap Share → "Add to Home Screen"\n\nOnce installed, it works like a native app with offline support!`
  },
];

const UserGuide = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="h-5 w-5 text-orange-500" />
        <h2 className="text-lg font-bold text-foreground">User Guide</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Everything you need to know about using GGD Ad Network. Tap any section to learn more.
      </p>

      <div className="space-y-2">
        {sections.map((section, i) => (
          <Collapsible key={i}>
            <Card className="border-border/50">
              <CollapsibleTrigger className="w-full">
                <CardContent className="p-3 flex items-center gap-3">
                  {section.icon}
                  <span className="text-sm font-semibold text-foreground flex-1 text-left">{section.title}</span>
                  <Badge variant="secondary" className="text-[9px] mr-2">{section.badge}</Badge>
                  <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform" />
                </CardContent>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 pt-0">
                  <div className="bg-muted/50 rounded-lg p-3 text-xs text-foreground leading-relaxed whitespace-pre-line">
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
    </div>
  );
};

export default UserGuide;
