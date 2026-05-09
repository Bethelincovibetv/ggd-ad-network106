import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail, HelpCircle, Shield } from "lucide-react";

const WHATSAPP_NUMBER = '2348131107416';

const SupportPage = ({ userEmail }: { userEmail: string }) => {
  const faqs = [
    { q: "How do I earn credits?", a: "You earn credits by logging in daily, completing tasks, and referring new users." },
    { q: "How do I create API keys?", a: "Upgrade to Premium to access API keys and embed codes for your websites." },
    { q: "How long do ads last?", a: "Free users get 7-day ads. Premium users can create ads lasting up to 30 days." },
    { q: "How do I upgrade to Premium?", a: "Contact our admin via WhatsApp to request a Premium upgrade." },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-foreground flex items-center gap-2">
        <HelpCircle className="h-5 w-5" />Support Center
      </h2>

      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
        <CardContent className="p-4 text-center space-y-2">
          <MessageCircle className="h-8 w-8 mx-auto text-green-600" />
          <h3 className="font-bold text-foreground">Need Help?</h3>
          <p className="text-xs text-muted-foreground">
            Tap the floating WhatsApp button (bottom-left) anywhere in the app for instant support. You can drag it to any spot you like.
          </p>
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={() => {
              const msg = encodeURIComponent(`Hello! I need help with my GGD Ad Network account (${userEmail}).`);
              window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
            }}
          >
            <MessageCircle className="h-4 w-4 mr-2" />Open WhatsApp Chat
          </Button>
          <p className="text-[11px] text-muted-foreground">📞 +234 813 110 7416</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-foreground">Frequently Asked Questions</h3>
        {faqs.map((faq, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-foreground">{faq.q}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{faq.a}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SupportPage;
