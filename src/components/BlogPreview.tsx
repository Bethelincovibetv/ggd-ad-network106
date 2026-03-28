
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BlogPost } from "@/types/blog";

interface BlogPreviewProps {
  blog: BlogPost;
}

const BlogPreview = ({ blog }: BlogPreviewProps) => {
  return (
    <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
      <CardHeader className="text-center space-y-4 pb-8">
        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">
          {blog.title}
        </CardTitle>
        <CardDescription className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
          {blog.metaDescription}
        </CardDescription>
        <div className="flex justify-center space-x-2 text-2xl">
          <span>✨</span>
          <span>📝</span>
          <span>🚀</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-12 px-8 pb-8">
        {blog.sections.map((section, index) => (
          <div key={index} className="space-y-6">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📍</span>
              <h3 className="text-2xl font-bold text-gray-900 flex-1">
                {section.heading}
              </h3>
            </div>
            
            {section.imageUrl && (
              <div className="my-8 text-center">
                <div className="inline-block p-4 bg-white rounded-2xl shadow-lg border border-gray-100">
                  <img
                    src={section.imageUrl}
                    alt={section.imageAlt}
                    className="w-full max-w-2xl mx-auto rounded-xl shadow-md"
                  />
                  <p className="text-center text-sm text-gray-500 mt-3 font-medium">
                    {section.imageAlt}
                  </p>
                </div>
              </div>
            )}
            
            <div className="prose max-w-none">
              {section.content.split('\n').map((paragraph, pIndex) => (
                paragraph.trim() && (
                  <p key={pIndex} className="text-gray-700 leading-relaxed mb-6 text-lg">
                    {paragraph}
                  </p>
                )
              ))}
            </div>
            
            {index < blog.sections.length - 1 && (
              <div className="flex justify-center pt-6">
                <div className="flex space-x-3 text-xl opacity-50">
                  <span>•</span>
                  <span>•</span>
                  <span>•</span>
                </div>
              </div>
            )}
          </div>
        ))}
        
        <div className="text-center pt-8 border-t border-gray-200">
          <div className="flex justify-center space-x-2 text-2xl mb-4">
            <span>🎉</span>
            <span>✨</span>
            <span>🚀</span>
            <span>💫</span>
            <span>⭐</span>
          </div>
          <p className="text-gray-600 font-medium">
            Thank you for reading! 📚 Share your thoughts in the comments below 💬
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BlogPreview;
