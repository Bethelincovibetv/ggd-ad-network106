
import React from 'react';
import { Sparkles } from "lucide-react";

const WelcomeSection = () => {
  return (
    <div className="text-center mb-12">
      <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full mb-6">
        <Sparkles className="h-5 w-5" />
        <span className="font-medium">Welcome to Blogmate</span>
      </div>
      <h2 className="text-4xl font-bold text-gray-900 mb-4">
        Create SEO-Optimized Blogs in Seconds
      </h2>
      <p className="text-xl text-gray-600 max-w-2xl mx-auto">
        Generate professional, SEO-friendly blog posts with AI-powered content and relevant images. 
        Ready to rank on Google!
      </p>
    </div>
  );
};

export default WelcomeSection;
