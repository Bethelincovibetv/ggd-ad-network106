
import React from 'react';
import { Button } from "@/components/ui/button";
import { MessageCircle, ExternalLink } from "lucide-react";

const BlogFooter = () => {
  const currentYear = new Date().getFullYear();
  const whatsappNumber = "08139044595";
  const whatsappUrl = `https://wa.me/234${whatsappNumber.slice(1)}?text=Hello! I need support with BlogMate AI`;

  const otherSites = [
    { name: "GG Digital", url: "https://ggdigital.com.ng", description: "Digital Marketing Solutions" },
    { name: "ReKEarn", url: "https://rekearn.com.ng", description: "Earn Money Online" },
    { name: "Goodgift Social", url: "https://goodgiftsocial.com.ng", description: "Social Media Management" }
  ];

  return (
    <footer className="bg-gray-900 text-white py-12 mt-16">
      <div className="container mx-auto px-4">
        {/* Cross-promotion section */}
        <div className="mb-8 p-6 bg-gradient-to-r from-purple-800 to-blue-800 rounded-2xl">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <img 
                src="/lovable-uploads/8ddaf624-8a87-493f-998f-d39c2965eb7d.png" 
                alt="GGD Logo" 
                className="w-10 h-10 rounded-full bg-white p-1"
              />
              <h3 className="text-2xl font-bold text-white">Discover more of GGD</h3>
            </div>
            <p className="text-purple-100 text-lg">
              Visit our other official sites for more amazing stuffs and exclusive offers!
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            {otherSites.map((site, index) => (
              <a
                key={index}
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-white group-hover:text-purple-200 transition-colors">
                      {site.name}
                    </h4>
                    <p className="text-sm text-purple-200 opacity-90">
                      {site.description}
                    </p>
                  </div>
                  <ExternalLink className="h-5 w-5 text-purple-200 group-hover:scale-110 transition-transform" />
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Support and Copyright section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-6 border-t border-gray-700">
          <div className="text-center md:text-left">
            <p className="mb-2 text-lg font-medium">© {currentYear} Blogmate. All rights reserved.</p>
            <p className="text-gray-400">Powered by GoodGift Gram</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <span className="text-gray-300 text-sm">Need help? Contact support:</span>
            <Button
              asChild
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full transition-all duration-200 transform hover:scale-105"
            >
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp Support
              </a>
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default BlogFooter;
