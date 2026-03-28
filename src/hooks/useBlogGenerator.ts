
import { useState } from 'react';
import { toast } from "sonner";
import { generateBlogPost } from "@/services/blogGenerator";
import { BlogPost } from "@/types/blog";

export const useBlogGenerator = () => {
  const [topic, setTopic] = useState('');
  const [generatedBlog, setGeneratedBlog] = useState<BlogPost | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateBlog = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a blog topic");
      return;
    }

    setIsGenerating(true);
    try {
      const blog = await generateBlogPost(topic);
      setGeneratedBlog(blog);
      toast.success("🎉 Congratulations! Your blog has been successfully generated and is ready to rank on Google!");
    } catch (error) {
      toast.error("Failed to generate blog. Please try again.");
      console.error("Blog generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatBlogForCopy = (blog: BlogPost): string => {
    let content = `${blog.title}\n\n`;
    content += `${blog.metaDescription}\n\n`;
    
    blog.sections.forEach((section, index) => {
      content += `${section.heading}\n\n`;
      content += `${section.content}\n\n`;
      if (section.imageUrl) {
        content += `[Image: ${section.imageAlt}]\n`;
        content += `Image URL: ${section.imageUrl}\n\n`;
      }
    });
    
    return content;
  };

  const copyBlogToClipboard = () => {
    if (generatedBlog) {
      const blogContent = formatBlogForCopy(generatedBlog);
      navigator.clipboard.writeText(blogContent);
      toast.success("Blog copied to clipboard!");
    }
  };

  const downloadBlog = () => {
    if (generatedBlog) {
      const blogContent = formatBlogForCopy(generatedBlog);
      const blob = new Blob([blogContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedBlog.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Blog downloaded successfully!");
    }
  };

  const resetForm = () => {
    setGeneratedBlog(null);
    setTopic('');
  };

  return {
    topic,
    setTopic,
    generatedBlog,
    isGenerating,
    handleGenerateBlog,
    copyBlogToClipboard,
    downloadBlog,
    resetForm
  };
};
