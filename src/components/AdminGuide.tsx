import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, ChevronDown, Users, Briefcase, CreditCard, ClipboardList, 
  Store, Settings, TrendingUp, Shield, Image, Megaphone, Key, ToggleLeft,
  Wallet, Star, Globe, Bell
} from "lucide-react";

const sections = [
  {
    icon: <TrendingUp className="h-4 w-4 text-blue-500" />,
    title: "Analytics Dashboard",
    badge: "Overview",
    content: `The Analytics tab gives you a bird's-eye view of the entire platform:\n\n• **Total Users** – Number of registered users\n• **Total Credits** – Sum of all user credits in circulation\n• **Revenue** – Total Paystack payments received\n• **Active Ads** – Ads currently running on the network\n\nUse this to monitor platform health and growth daily.`
  },
  {
    icon: <Users className="h-4 w-4 text-green-500" />,
    title: "User Management",
    badge: "Users Tab",
    content: `Manage every user on the platform:\n\n• **View all users** with their email, credits, and roles\n• **Add/Remove credits** – Manually credit or debit a user's credit balance\n• **Fund/Debit task wallet** – Adjust a business user's ₦ task wallet (used for syndicate tasks)\n• **Ban/Unban users** – Block abusive accounts\n• **Assign roles** – Give users roles like admin, premium, business, syndicate, or moderator\n\n**Credit Wallet** = credits used for in-app features (ebook gen, ads, etc.)\n**Task Wallet (₦)** = Naira balance businesses use to pay syndicates for tasks`
  },
  {
    icon: <CreditCard className="h-4 w-4 text-orange-500" />,
    title: "Credit & Wallet System",
    badge: "Economy",
    content: `The platform has TWO economies:\n\n**1. Credits (for users)**\n• Users earn credits by completing tasks, referrals, or daily login\n• Credits are spent on: AI tools (ebook, blog, funnel generators), marketing apps, directory listing\n• Admin can manually add/remove credits from any user\n\n**2. Task Wallet ₦ (for businesses)**\n• Businesses fund their task wallet via Paystack\n• When they create syndicate tasks, the cost is deducted from this wallet\n• Syndicates get paid from this pool when their task proofs are approved\n• Admin can manually fund or debit any business wallet\n\n**Vendor Wallet Bonus**: Set in Settings – bonus ₦ added to a business wallet when they upgrade to "business" role.`
  },
  {
    icon: <Briefcase className="h-4 w-4 text-purple-500" />,
    title: "Syndicate System",
    badge: "Syndicates",
    content: `Syndicates are social media influencers who promote business tasks:\n\n**How it works:**\n1. Users apply to become syndicates (Syndicate Application Form)\n2. Admin reviews and approves/rejects applications in the Syndicate Manager\n3. Approved syndicates see available business tasks\n4. They accept tasks, share content on their platforms, then submit proof screenshots\n5. Business owners review proofs and approve/reject\n6. Approved submissions credit the syndicate's wallet\n\n**Admin responsibilities:**\n• Review syndicate applications\n• Monitor task completion quality\n• Resolve disputes between businesses and syndicates\n• Process withdrawal requests from syndicates`
  },
  {
    icon: <ClipboardList className="h-4 w-4 text-yellow-500" />,
    title: "Task System (Admin Tasks)",
    badge: "Tasks",
    content: `There are TWO types of tasks:\n\n**1. Admin Tasks (Tasks tab)**\n• Created by admin for ALL users\n• Simple share-based tasks (share a link, get credits)\n• Reward is in credits\n• Users complete them from the TaskList component\n\n**2. Business/Syndicate Tasks (Syndicate system)**\n• Created by businesses with ₦ budget\n• Targeted to specific social platforms (WhatsApp, Facebook, TikTok, Telegram)\n• Include flyer uploads and write-ups\n• Require proof screenshots from syndicates\n• Payment is in ₦ from business wallet to syndicate wallet`
  },
  {
    icon: <Store className="h-4 w-4 text-teal-500" />,
    title: "Business Directory & Storefront",
    badge: "Business",
    content: `**Business Storefront (My Biz tab)**\n• Upgraded business users get a beautiful storefront page\n• They can add: logo, description, WhatsApp, website, social media links\n• Storefront is their public-facing business page\n\n**Business Directory**\n• A public listing of all subscribed businesses\n• Businesses pay credits to subscribe (cost set in Admin Settings)\n• Subscription lasts 30 days\n• Listed businesses appear in the searchable directory for all users\n\n**Admin controls:**\n• Set directory listing cost in Settings\n• Set vendor wallet bonus in Settings (₦ given on business upgrade)`
  },
  {
    icon: <Image className="h-4 w-4 text-pink-500" />,
    title: "Slide Manager",
    badge: "Content",
    content: `Manage the homepage carousel/slider:\n\n• Upload slide images with titles and links\n• Set sort order to control display sequence\n• Enable/disable individual slides\n• Slides appear on the main dashboard for all users\n\nUse slides for: announcements, promotions, new feature highlights, partner ads.`
  },
  {
    icon: <Key className="h-4 w-4 text-red-500" />,
    title: "API Key Manager",
    badge: "Developer",
    content: `The API system allows external websites to embed GGD ads:\n\n• Users generate API keys from their dashboard\n• API keys are used to authenticate embed code requests\n• Admin can view all API keys and their usage stats\n• Keys can be activated/deactivated\n\nThis powers the GGD Ad Network embed feature.`
  },
  {
    icon: <Megaphone className="h-4 w-4 text-indigo-500" />,
    title: "Marketing Apps Marketplace",
    badge: "Apps",
    content: `A marketplace of marketing tools and resources:\n\n• Admin creates app listings with: title, description, image, link\n• Apps can be free or cost credits\n• Users browse and redeem apps from the marketplace\n• Credit-based apps deduct from user's credit balance on redemption\n\nUse this for: affiliate tools, training materials, marketing templates, partner apps.`
  },
  {
    icon: <ToggleLeft className="h-4 w-4 text-cyan-500" />,
    title: "Feature Toggles",
    badge: "Features",
    content: `Control which features are visible to users:\n\n• Toggle features on/off without code changes\n• Features include: AI Chat, Blog Generator, Ebook Generator, Sales Funnel, etc.\n• Disabled features are hidden from the user dashboard\n• Useful for: phased rollouts, maintenance, A/B testing\n\nAll feature keys are checked via the useFeatureToggles hook.`
  },
  {
    icon: <Settings className="h-4 w-4 text-gray-500" />,
    title: "Admin Settings",
    badge: "Config",
    content: `Global platform configuration:\n\n• **Paystack Keys** – Live public & secret keys for payment processing\n• **Vendor Wallet Bonus** – ₦ amount credited to business wallet on upgrade\n• **Directory Listing Cost** – Credits required for directory subscription\n• **Task Cost Per Syndicate** – Default ₦ cost per syndicate for business tasks\n\nAll settings are stored in the app_settings table and can be changed anytime.`
  },
  {
    icon: <Shield className="h-4 w-4 text-red-600" />,
    title: "Security & Roles",
    badge: "Security",
    content: `**Role hierarchy:**\n• **admin** – Full platform access, can manage everything\n• **moderator** – Can review content and syndicate submissions\n• **business** – Can create syndicate tasks, has storefront\n• **premium** – Access to premium features\n• **syndicate** – Can accept and complete business tasks\n• **user** – Default role, basic platform access\n\n**Auto-admin:** bethelincovibetv@gmail.com is automatically assigned the admin role on signup.\n\nAll roles are stored in the user_roles table with Row-Level Security (RLS) policies.`
  },
  {
    icon: <Wallet className="h-4 w-4 text-green-600" />,
    title: "Withdrawals",
    badge: "Payouts",
    content: `Syndicates can request withdrawals from their task wallet:\n\n• They provide bank details (bank name, account number, account name)\n• Withdrawal request is created with "pending" status\n• Admin reviews and processes withdrawals manually\n• Once processed, admin marks it as "approved" or "rejected"\n\n**Flow:** Syndicate earns ₦ → Requests withdrawal → Admin processes payout via bank transfer → Marks as done`
  },
  {
    icon: <Bell className="h-4 w-4 text-yellow-600" />,
    title: "Notifications",
    badge: "Comms",
    content: `The notification system keeps users informed:\n\n• Admin can send notifications to any user\n• Auto-notifications are sent for: task approvals, credit additions, role changes\n• Users see unread count on the bell icon\n• Notification types: info, credit, warning, system\n\nUse notifications for: announcements, payment confirmations, task updates.`
  },
];

const AdminGuide = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="h-5 w-5 text-orange-500" />
        <h2 className="text-lg font-bold text-foreground">Platform Admin Guide</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Complete reference for how every part of the GGD platform works. Tap any section to expand.
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

export default AdminGuide;
