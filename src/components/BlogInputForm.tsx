
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";

interface BlogInputFormProps {
  topic: string;
  setTopic: (topic: string) => void;
  onGenerateBlog: () => void;
  isGenerating: boolean;
}

const BlogInputForm = ({ topic, setTopic, onGenerateBlog, isGenerating }: BlogInputFormProps) => {
  return (
    <Card className="shadow-xl border-0 bg-white/80 backdrop-blur">
      <CardHeader className="text-center pb-8">
        <CardTitle className="text-2xl font-bold">Generate Your Blog Post</CardTitle>
        <CardDescription className="text-lg">
          Enter your topic and let AI create a complete SEO-optimized blog with images
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="topic" className="text-lg font-medium">Blog Topic</Label>
          <Input
            id="topic"
            placeholder="e.g., 'Benefits of Digital Marketing for Small Businesses'"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="mt-2 h-12 text-lg"
            disabled={isGenerating}
          />
        </div>
        <Button
          onClick={onGenerateBlog}
          disabled={isGenerating || !topic.trim()}
          className="w-full h-12 text-lg font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Generating Your Blog...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Generate SEO Blog
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BlogInputForm;
