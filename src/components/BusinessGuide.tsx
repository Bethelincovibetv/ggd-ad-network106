import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, ChevronDown, Briefcase, Wallet, Users, Store, 
  ClipboardList, CreditCard, Image, TrendingUp, Shield, CheckCircle
} from "lucide-react";

const sections = [
  {
    icon: <Briefcase className="h-4 w-4 text-blue-500" />,
    title: "Getting Started as a Business",
    badge: "Start",
    content: `Welcome to GGD Ad Network for Business! Here's how to get started:\n\n1. **Upgrade to Business** – Go to Upgrade tab and select "Business" role\n2. **Set up your Storefront** – Add your business name, logo, description & social links\n3. **Fund your Task Wallet** – Add ₦ to your wallet via Paystack\n4. **Create your first Task** – Post a syndicate task to promote your business\n5. **List in Directory** – Subscribe to the Business Directory for visibility\n\n**What you get:**\n• Business storefront page\n• Syndicate task creation\n• Task wallet for paying promoters\n• Directory listing\n• All Premium features included`
  },
  {
    icon: <Store className="h-4 w-4 text-teal-500" />,
    title: "Your Business Storefront",
    badge: "Storefront",
    content: `Your storefront is your public business page on GGD:\n\n**How to set it up:**\n1. Go to **My Biz** tab\n2. Fill in your **business name** and **description**\n3. Upload your **business logo**\n4. Add social media links:\n   • WhatsApp number\n   • Website URL\n   • Facebook, Instagram, TikTok, Telegram\n5. Click **Save** to publish\n\nYour storefront appears in the Business Directory when you subscribe.`
  },
  {
    icon: <ClipboardList className="h-4 w-4 text-orange-500" />,
    title: "Creating Syndicate Tasks",
    badge: "Tasks",
    content: `Syndicate tasks let verified promoters share your content across social media:\n\n**How to create a task:**\n1. Go to **Tasks** tab\n2. Click **Create Task**\n3. Enter **task title** and **write-up/ad copy**\n4. Upload a **flyer/image** for promoters to share\n5. Add a **share link** (optional)\n6. Select **target placements** (WhatsApp Status, Facebook Groups, TikTok, etc.)\n7. Set **max syndicates** (how many promoters)\n8. Set **target locations** (optional)\n9. Review the **total cost** and click **Create**\n\n**Cost:** ₦ per syndicate × number of syndicates\n**Payment:** Deducted automatically from your Task Wallet`
  },
  {
    icon: <Wallet className="h-4 w-4 text-green-500" />,
    title: "Task Wallet",
    badge: "Wallet",
    content: `Your Task Wallet (₦) is used to pay syndicates for completing tasks:\n\n**How to fund:**\n1. Go to **Wallet** tab\n2. Enter amount in Naira\n3. Pay via Paystack (cards, bank transfer)\n4. Balance updates instantly\n\n**How it works:**\n• When you create a task, the total cost is deducted\n• When a syndicate completes your task and you approve, they get paid\n• If you reject a submission, no payment is made\n\n**Bonus:** You may receive a wallet bonus when upgrading to Business!`
  },
  {
    icon: <CheckCircle className="h-4 w-4 text-green-600" />,
    title: "Reviewing Syndicate Proofs",
    badge: "Review",
    content: `After syndicates share your content, they submit proof screenshots:\n\n1. Go to **Tasks** tab\n2. Click **View Proofs** on any task\n3. Review each submission:\n   • Check the screenshot matches the requirement\n   • Verify the content was shared on the correct platform\n4. **Approve** — Syndicate gets paid ₦ from your wallet\n5. **Reject** — No payment, syndicate can try again\n\n**Tips:**\n• Review proofs promptly to keep syndicates motivated\n• Clear task descriptions = better quality submissions`
  },
  {
    icon: <Image className="h-4 w-4 text-pink-500" />,
    title: "Best Practices for Flyers",
    badge: "Tips",
    content: `Create effective flyers for maximum engagement:\n\n• **Size:** 1080x1080px (square) works best for all platforms\n• **Text:** Keep it minimal — big headline, clear call-to-action\n• **Colors:** Use bright, eye-catching colors\n• **Logo:** Always include your business logo\n• **Contact:** Add WhatsApp number or website\n• **Format:** PNG or JPG, max 5MB\n\n**What to include in write-ups:**\n• Brief product/service description\n• Key benefits or offers\n• Call to action (e.g., "Chat us on WhatsApp")\n• Any hashtags to use`
  },
];

const BusinessGuide = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="h-5 w-5 text-blue-500" />
        <h2 className="text-lg font-bold text-foreground">Business Guide</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Complete guide for business owners on GGD Ad Network. Tap any section to learn more.
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

export default BusinessGuide;
