
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Copy, Globe, Palette } from "lucide-react";

const WebAppGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [appName, setAppName] = useState('');
  const [appType, setAppType] = useState('business');
  const [colorScheme, setColorScheme] = useState('modern');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  const generateWebApp = async () => {
    if (!prompt.trim() || !appName.trim()) {
      toast.error("Please provide both app name and description");
      return;
    }

    setIsGenerating(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const webAppCode = generateDynamicWebApp();
      setGeneratedCode(webAppCode);
      toast.success("Web app generated successfully!");
      
    } catch (error) {
      toast.error("Failed to generate web app");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateDynamicWebApp = () => {
    const colors = getColorScheme();
    const features = extractFeatures();
    const sections = generateSections();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: ${colors.background};
            color: ${colors.text};
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        header {
            background: ${colors.primary};
            color: white;
            padding: 1rem 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo {
            font-size: 1.8rem;
            font-weight: bold;
        }
        
        .nav-links {
            display: flex;
            gap: 2rem;
            list-style: none;
        }
        
        .nav-links a {
            color: white;
            text-decoration: none;
            transition: opacity 0.3s;
        }
        
        .nav-links a:hover {
            opacity: 0.8;
        }
        
        .hero {
            padding: 4rem 0;
            text-align: center;
            background: ${colors.secondary};
        }
        
        .hero h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            color: ${colors.primary};
        }
        
        .hero p {
            font-size: 1.2rem;
            margin-bottom: 2rem;
            opacity: 0.8;
        }
        
        .btn {
            display: inline-block;
            padding: 12px 30px;
            background: ${colors.accent};
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            transition: all 0.3s;
            border: none;
            cursor: pointer;
            font-size: 1rem;
        }
        
        .btn:hover {
            background: ${colors.primary};
            transform: translateY(-2px);
        }
        
        .features {
            padding: 4rem 0;
            background: white;
        }
        
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
        }
        
        .feature-card {
            background: ${colors.card};
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.3s;
        }
        
        .feature-card:hover {
            transform: translateY(-5px);
        }
        
        .feature-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        
        .section {
            padding: 4rem 0;
        }
        
        .section:nth-child(even) {
            background: ${colors.background};
        }
        
        .section h2 {
            text-align: center;
            font-size: 2.5rem;
            margin-bottom: 2rem;
            color: ${colors.primary};
        }
        
        footer {
            background: ${colors.primary};
            color: white;
            padding: 2rem 0;
            text-align: center;
        }
        
        @media (max-width: 768px) {
            .nav-links {
                display: none;
            }
            
            .hero h1 {
                font-size: 2rem;
            }
            
            .features-grid {
                grid-template-columns: 1fr;
            }
        }
        
        .fade-in {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.6s ease;
        }
        
        .fade-in.visible {
            opacity: 1;
            transform: translateY(0);
        }
    </style>
</head>
<body>
    <header>
        <nav class="container">
            <div class="logo">${appName}</div>
            <ul class="nav-links">
                <li><a href="#home">Home</a></li>
                <li><a href="#features">Features</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </nav>
    </header>
    
    <section class="hero" id="home">
        <div class="container">
            <h1>${appName}</h1>
            <p>${prompt}</p>
            <button class="btn" onclick="handleCTA()">Get Started Now</button>
        </div>
    </section>
    
    <section class="features section" id="features">
        <div class="container">
            <h2>Key Features</h2>
            <div class="features-grid">
                ${features.map(feature => `
                    <div class="feature-card fade-in">
                        <div class="feature-icon">${feature.icon}</div>
                        <h3>${feature.title}</h3>
                        <p>${feature.description}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>
    
    ${sections}
    
    <footer>
        <div class="container">
            <p>&copy; 2024 ${appName}. All rights reserved.</p>
        </div>
    </footer>
    
    <script>
        function handleCTA() {
            alert('Welcome to ${appName}! Ready to get started?');
        }
        
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
        
        // Fade in animation on scroll
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);
        
        document.querySelectorAll('.fade-in').forEach(el => {
            observer.observe(el);
        });
        
        // Add some interactivity based on app type
        ${getAppTypeScript()}
    </script>
</body>
</html>`;
  };

  const getColorScheme = () => {
    const schemes = {
      modern: {
        primary: '#2563eb',
        secondary: '#f8fafc',
        accent: '#10b981',
        background: '#f1f5f9',
        text: '#1e293b',
        card: '#ffffff'
      },
      dark: {
        primary: '#6366f1',
        secondary: '#1e293b',
        accent: '#f59e0b',
        background: '#0f172a',
        text: '#f8fafc',
        card: '#334155'
      },
      warm: {
        primary: '#dc2626',
        secondary: '#fef2f2',
        accent: '#ea580c',
        background: '#fef7ed',
        text: '#7c2d12',
        card: '#ffffff'
      },
      nature: {
        primary: '#059669',
        secondary: '#ecfdf5',
        accent: '#10b981',
        background: '#f0fdf4',
        text: '#064e3b',
        card: '#ffffff'
      }
    };
    return schemes[colorScheme] || schemes.modern;
  };

  const extractFeatures = () => {
    const defaultFeatures = [
      { icon: '🚀', title: 'Fast Performance', description: 'Optimized for speed and efficiency' },
      { icon: '📱', title: 'Mobile Responsive', description: 'Works perfectly on all devices' },
      { icon: '🎨', title: 'Beautiful Design', description: 'Modern and attractive interface' },
      { icon: '🔧', title: 'Easy to Use', description: 'Intuitive and user-friendly' }
    ];

    // Try to extract features from the prompt
    const words = prompt.toLowerCase();
    const features = [];

    if (words.includes('dashboard') || words.includes('analytics')) {
      features.push({ icon: '📊', title: 'Analytics Dashboard', description: 'Comprehensive data visualization and insights' });
    }
    if (words.includes('social') || words.includes('community')) {
      features.push({ icon: '👥', title: 'Social Features', description: 'Connect and engage with your community' });
    }
    if (words.includes('payment') || words.includes('shop') || words.includes('ecommerce')) {
      features.push({ icon: '💳', title: 'Secure Payments', description: 'Safe and reliable payment processing' });
    }
    if (words.includes('real-time') || words.includes('live')) {
      features.push({ icon: '⚡', title: 'Real-time Updates', description: 'Instant synchronization and updates' });
    }

    return features.length > 0 ? features.slice(0, 4) : defaultFeatures;
  };

  const generateSections = () => {
    const words = prompt.toLowerCase();
    let sections = '';

    if (words.includes('about') || words.includes('story')) {
      sections += `
        <section class="section" id="about">
            <div class="container">
                <h2>About Us</h2>
                <p style="text-align: center; font-size: 1.1rem; max-width: 800px; margin: 0 auto;">
                    ${prompt} We are dedicated to providing the best experience for our users.
                </p>
            </div>
        </section>
      `;
    }

    sections += `
        <section class="section" id="contact">
            <div class="container">
                <h2>Get In Touch</h2>
                <div style="text-align: center;">
                    <p style="font-size: 1.1rem; margin-bottom: 2rem;">Ready to get started? Contact us today!</p>
                    <button class="btn" onclick="handleContact()">Contact Us</button>
                </div>
            </div>
        </section>
    `;

    return sections;
  };

  const getAppTypeScript = () => {
    switch (appType) {
      case 'ecommerce':
        return `
          function handleContact() {
            alert('Thanks for your interest! We will contact you soon about our products.');
          }
        `;
      case 'portfolio':
        return `
          function handleContact() {
            alert('Thank you for visiting my portfolio! Let us discuss your project.');
          }
        `;
      case 'blog':
        return `
          function handleContact() {
            alert('Thanks for reading! Subscribe to get updates on new posts.');
          }
        `;
      default:
        return `
          function handleContact() {
            alert('Thank you for your interest! We will get back to you soon.');
          }
        `;
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success("Code copied to clipboard!");
  };

  const downloadHTML = () => {
    const blob = new Blob([generatedCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appName.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("HTML file downloaded!");
  };

  const resetForm = () => {
    setPrompt('');
    setAppName('');
    setAppType('business');
    setColorScheme('modern');
    setGeneratedCode('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Professional Web App Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!generatedCode ? (
            <>
              <div>
                <Label htmlFor="appName" className="text-lg font-medium">App Name *</Label>
                <Input
                  id="appName"
                  placeholder="My Awesome App"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="appType" className="text-lg font-medium">App Type</Label>
                <Select value={appType} onValueChange={setAppType}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business/Corporate</SelectItem>
                    <SelectItem value="portfolio">Portfolio/Personal</SelectItem>
                    <SelectItem value="ecommerce">E-commerce/Shop</SelectItem>
                    <SelectItem value="blog">Blog/News</SelectItem>
                    <SelectItem value="landing">Landing Page</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="colorScheme" className="text-lg font-medium">Color Scheme</Label>
                <Select value={colorScheme} onValueChange={setColorScheme}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modern">Modern Blue</SelectItem>
                    <SelectItem value="dark">Dark Theme</SelectItem>
                    <SelectItem value="warm">Warm Orange</SelectItem>
                    <SelectItem value="nature">Nature Green</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="prompt" className="text-lg font-medium">Describe Your Web App *</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe your web application in detail. What does it do? Who is it for? What features should it have? Be specific about functionality, target audience, and key benefits..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="mt-2 min-h-[120px]"
                />
              </div>

              <Button 
                onClick={generateWebApp}
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? "Generating Professional Web App..." : "Generate Web App"}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Your Professional Web App is Ready!</h3>
                <div className="flex gap-2">
                  <Button onClick={copyToClipboard} variant="outline" size="sm">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                  <Button onClick={downloadHTML} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download HTML
                  </Button>
                  <Button onClick={resetForm} variant="outline" size="sm">
                    Generate Another
                  </Button>
                </div>
              </div>
              
              <div className="text-center">
                <iframe
                  srcDoc={generatedCode}
                  className="w-full h-96 border rounded-lg"
                  title="Generated Web App Preview"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WebAppGenerator;
