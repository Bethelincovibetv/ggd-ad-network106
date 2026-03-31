import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, ChevronDown, Users, Wallet, Upload, CheckCircle, 
  Star, Smartphone, DollarSign, Shield, Award, Clock
} from "lucide-react";

const sections = [
  {
    icon: <Users className="h-4 w-4 text-purple-500" />,
    title: "What is a Syndicate?",
    badge: "Overview",
    content: `A Syndicate is a social media promoter who earns money by sharing business content:\n\n**What you do:**\n• Accept tasks from businesses\n• Share their ads/flyers on your social media platforms\n• Submit proof screenshots\n• Get paid in ₦ (Naira) for approved submissions\n\n**Supported platforms:**\n• WhatsApp (Status, Groups, Broadcasts)\n• Facebook (Groups, Timeline)\n• Instagram (Stories, Feed)\n• TikTok (Videos, Groups)\n• Telegram (Channels, Groups)\n\n**Requirements:**\n• Active social media accounts\n• Ability to reach real audiences\n• Honest, quality submissions`
  },
  {
    icon: <Star className="h-4 w-4 text-yellow-500" />,
    title: "How to Become a Syndicate",
    badge: "Apply",
    content: `Follow these steps to join the syndicate network:\n\n1. **Sign up** on GGD Ad Network\n2. Go to **Upgrade** tab\n3. Click **Apply as Syndicate**\n4. Fill in your social media influence:\n   • WhatsApp contacts/groups count\n   • Facebook followers/groups\n   • TikTok followers\n   • Telegram channels/subscribers\n5. Submit your application\n6. **Wait for admin approval** (usually within 24 hours)\n7. Once approved, you'll see the **Jobs** tab!\n\n**Tip:** The more detailed your application, the faster you'll get approved.`
  },
  {
    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
    title: "Completing Tasks Step by Step",
    badge: "How-To",
    content: `Here's exactly how to complete a task and get paid:\n\n1. Go to **Jobs** tab → **Available Tasks**\n2. Review the task details:\n   • Read the write-up carefully\n   • Check which platforms to share on\n   • Note the payment amount (₦ per task)\n3. Click **Accept Task**\n4. **Download the flyer** and **copy the write-up**\n5. Share on the required platform(s) exactly as instructed\n6. **Take a clear screenshot** showing:\n   • The shared content is visible\n   • The platform name is visible\n   • Your profile/account is visible\n7. Click **Upload Proof** and select your screenshot\n8. Wait for the business owner to **review and approve**\n9. Once approved, ₦ is credited to your wallet! 🎉`
  },
  {
    icon: <Wallet className="h-4 w-4 text-green-600" />,
    title: "Earnings & Withdrawals",
    badge: "Money",
    content: `**How you earn:**\n• Each approved task pays ₦ directly to your wallet\n• Payment amount varies per task (set by business)\n• More tasks completed = more money!\n\n**Your Wallet:**\n• Check balance in **Earnings** tab\n• See total earned, total withdrawn\n• Track pending payments\n\n**How to withdraw:**\n1. Go to **Earnings** tab\n2. Click **Withdraw**\n3. Enter your bank details:\n   • Bank name\n   • Account number\n   • Account name\n4. Enter withdrawal amount\n5. Submit request\n6. Admin processes payment within 24-48 hours\n7. Receive payment in your bank account!`
  },
  {
    icon: <Upload className="h-4 w-4 text-blue-500" />,
    title: "Taking Good Proof Screenshots",
    badge: "Proofs",
    content: `Good proof = faster approval = faster payment!\n\n**What makes a good proof:**\n✅ Full screenshot (not cropped)\n✅ Shows the shared content clearly\n✅ Platform name visible (WhatsApp, Facebook, etc.)\n✅ Your profile/name visible in the screenshot\n✅ Timestamp visible (if possible)\n\n**What gets rejected:**\n❌ Blurry or unclear screenshots\n❌ Cropped images that hide details\n❌ Screenshots from wrong platform\n❌ Content doesn't match the task\n❌ Edited or fake screenshots\n\n**Tip:** Take screenshots immediately after sharing for best results.`
  },
  {
    icon: <Award className="h-4 w-4 text-orange-500" />,
    title: "Ranking & Tips",
    badge: "Growth",
    content: `Your syndicate ranking affects which tasks you see:\n\n**How ranking works:**\n• Completing tasks increases your score\n• Approved proofs boost ranking faster\n• Rejected proofs lower your ranking\n• Higher-ranked syndicates get priority on premium tasks\n\n**Tips to earn more:**\n• Complete tasks quickly — don't let them expire\n• Submit clear, honest proofs\n• Accept tasks on platforms where you have the most reach\n• Build your social media following\n• Check for new tasks daily — they fill up fast!\n• Be consistent — regular syndicates earn the most`
  },
];

const SyndicateGuide = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="h-5 w-5 text-purple-500" />
        <h2 className="text-lg font-bold text-foreground">Syndicate Guide</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Everything you need to know about earning money as a GGD Syndicate operator.
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

export default SyndicateGuide;
