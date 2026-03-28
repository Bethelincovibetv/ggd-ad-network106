
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Code, Copy, Eye, Settings, BarChart3, Globe, Calendar, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useAdStorage } from "@/hooks/useAdStorage";

const AdminPage = () => {
  const { ads } = useAdStorage();
  const [embedSettings, setEmbedSettings] = useState({
    rotationInterval: 8,
    maxWidth: 300,
    showPoweredBy: true,
    borderRadius: 10,
    theme: 'light'
  });
  const [generatedCode, setGeneratedCode] = useState('');

  const activeAds = ads.filter(ad => ad.isActive && ad.isPaid && ad.paymentStatus === 'paid');
  const totalRevenue = ads.reduce((sum, ad) => sum + ad.amount, 0);
  const totalImpressions = ads.reduce((sum, ad) => sum + ad.impressions, 0);
  const totalClicks = ads.reduce((sum, ad) => sum + ad.clicks, 0);

  const generateEmbedCode = () => {
    if (activeAds.length === 0) {
      toast.error("No active ads available for embedding");
      return;
    }

    const embedCode = `
<!-- GGD Ad Network Embed Code -->
<div id="ggd-ad-rotator-${Date.now()}" style="max-width: ${embedSettings.maxWidth}px; margin: 20px auto;"></div>

<style>
  .ggd-ad-rotator {
    border: 1px solid #ddd;
    border-radius: ${embedSettings.borderRadius}px;
    overflow: hidden;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
    cursor: pointer;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: ${embedSettings.theme === 'dark' ? '#1a1a1a' : '#ffffff'};
    color: ${embedSettings.theme === 'dark' ? '#ffffff' : '#333333'};
  }
  .ggd-ad-rotator:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
  }
  .ggd-ad-image {
    width: 100%;
    height: 200px;
    object-fit: cover;
  }
  .ggd-ad-content {
    padding: 20px;
  }
  .ggd-ad-title {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 10px;
    line-height: 1.3;
  }
  .ggd-ad-description {
    font-size: 14px;
    opacity: 0.8;
    line-height: 1.5;
    margin-bottom: 15px;
  }
  .ggd-ad-cta {
    background: linear-gradient(45deg, #ea580c, #dc2626);
    color: white;
    padding: 12px 24px;
    border-radius: 6px;
    text-decoration: none;
    display: inline-block;
    font-size: 14px;
    font-weight: 600;
    text-align: center;
    width: 100%;
    box-sizing: border-box;
    transition: all 0.3s ease;
  }
  .ggd-ad-cta:hover {
    background: linear-gradient(45deg, #dc2626, #b91c1c);
    transform: translateY(-1px);
  }
  ${embedSettings.showPoweredBy ? `
  .ggd-powered-by {
    font-size: 11px;
    opacity: 0.6;
    text-align: center;
    padding: 8px;
    background: ${embedSettings.theme === 'dark' ? '#2a2a2a' : '#f8f9fa'};
    border-top: 1px solid ${embedSettings.theme === 'dark' ? '#333' : '#eee'};
  }
  .ggd-powered-by a {
    color: inherit;
    text-decoration: none;
  }
  ` : ''}
</style>

<script>
(function() {
  const GGD_ADS = ${JSON.stringify(activeAds.map(ad => ({
    id: ad.id,
    title: ad.title,
    description: ad.description,
    imageUrl: ad.imageUrl,
    targetUrl: ad.targetUrl
  })))};
  
  let currentAdIndex = 0;
  const rotatorId = 'ggd-ad-rotator-${Date.now()}';
  
  function displayAd(ad) {
    const rotator = document.getElementById(rotatorId);
    if (!rotator) return;
    
    rotator.className = 'ggd-ad-rotator';
    rotator.innerHTML = \`
      \${ad.imageUrl ? \`<img src="\${ad.imageUrl}" alt="\${ad.title}" class="ggd-ad-image" onerror="this.style.display='none'">\` : ''}
      <div class="ggd-ad-content">
        <div class="ggd-ad-title">\${ad.title}</div>
        <div class="ggd-ad-description">\${ad.description}</div>
        <a href="\${ad.targetUrl}" class="ggd-ad-cta" target="_blank" onclick="trackClick('\${ad.id}')">Learn More →</a>
      </div>
      ${embedSettings.showPoweredBy ? `<div class="ggd-powered-by"><a href="https://ggd-ad-network.com" target="_blank">Powered by GGD Ad Network</a></div>` : ''}
    \`;
    
    rotator.onclick = function(e) {
      if (e.target.tagName !== 'A') {
        trackClick(ad.id);
        window.open(ad.targetUrl, '_blank');
      }
    };
  }
  
  function rotateAds() {
    if (GGD_ADS.length === 0) return;
    displayAd(GGD_ADS[currentAdIndex]);
    currentAdIndex = (currentAdIndex + 1) % GGD_ADS.length;
  }
  
  function trackClick(adId) {
    // Send tracking data to your analytics endpoint
    if (typeof fetch !== 'undefined') {
      fetch('https://api.ggd-ad-network.com/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adId: adId, 
          action: 'click',
          timestamp: new Date().toISOString(),
          referrer: window.location.hostname
        })
      }).catch(() => {}); // Silent fail
    }
  }
  
  // Initialize
  rotateAds();
  if (GGD_ADS.length > 1) {
    setInterval(rotateAds, ${embedSettings.rotationInterval * 1000});
  }
})();
</script>`;

    setGeneratedCode(embedCode);
    toast.success("Embed code generated successfully!");
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success("Embed code copied to clipboard!");
  };

  const previewEmbedCode = () => {
    const newWindow = window.open('', '_blank', 'width=400,height=600');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>GGD Ad Network Preview</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 20px; background: #f5f5f5;">
          <h2 style="text-align: center; color: #333; margin-bottom: 30px;">Ad Network Preview</h2>
          ${generatedCode}
        </body>
        </html>
      `);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            🏢 Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Manage your ad network and generate embed codes</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="text-center">
            <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-700">{ads.length}</div>
            <div className="text-sm text-blue-600">Total Ads</div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-r from-green-50 to-green-100">
          <div className="text-center">
            <Globe className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-700">{activeAds.length}</div>
            <div className="text-sm text-green-600">Active Ads</div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-purple-100">
          <div className="text-center">
            <Eye className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-700">{totalImpressions.toLocaleString()}</div>
            <div className="text-sm text-purple-600">Total Views</div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-r from-orange-50 to-orange-100">
          <div className="text-center">
            <DollarSign className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-700">${totalRevenue.toFixed(2)}</div>
            <div className="text-sm text-orange-600">Total Revenue</div>
          </div>
        </Card>
      </div>

      {/* Embed Code Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Embed Code Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="rotationInterval">Rotation Interval (seconds)</Label>
              <Input
                id="rotationInterval"
                type="number"
                min="3"
                max="60"
                value={embedSettings.rotationInterval}
                onChange={(e) => setEmbedSettings({
                  ...embedSettings,
                  rotationInterval: parseInt(e.target.value) || 8
                })}
              />
            </div>
            <div>
              <Label htmlFor="maxWidth">Max Width (pixels)</Label>
              <Input
                id="maxWidth"
                type="number"
                min="200"
                max="800"
                value={embedSettings.maxWidth}
                onChange={(e) => setEmbedSettings({
                  ...embedSettings,
                  maxWidth: parseInt(e.target.value) || 300
                })}
              />
            </div>
            <div>
              <Label htmlFor="theme">Theme</Label>
              <Select value={embedSettings.theme} onValueChange={(value) => setEmbedSettings({
                ...embedSettings,
                theme: value
              })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="borderRadius">Border Radius (pixels)</Label>
              <Input
                id="borderRadius"
                type="number"
                min="0"
                max="20"
                value={embedSettings.borderRadius}
                onChange={(e) => setEmbedSettings({
                  ...embedSettings,
                  borderRadius: parseInt(e.target.value) || 10
                })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showPoweredBy"
                checked={embedSettings.showPoweredBy}
                onChange={(e) => setEmbedSettings({
                  ...embedSettings,
                  showPoweredBy: e.target.checked
                })}
                className="rounded"
              />
              <Label htmlFor="showPoweredBy">Show "Powered by GGD" branding</Label>
            </div>
          </div>

          <Button 
            onClick={generateEmbedCode} 
            className="w-full bg-gradient-to-r from-orange-600 to-red-600"
            disabled={activeAds.length === 0}
          >
            <Code className="mr-2 h-4 w-4" />
            Generate Embed Code ({activeAds.length} Active Ads)
          </Button>
        </CardContent>
      </Card>

      {/* Generated Embed Code */}
      {generatedCode && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Embed Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Instructions for Website Owners:</strong>
              </p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Copy the code below and paste it into your website's HTML</li>
                <li>• The ads will automatically rotate every {embedSettings.rotationInterval} seconds</li>
                <li>• Includes click tracking and responsive design</li>
                <li>• Works on all modern browsers and mobile devices</li>
              </ul>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={copyEmbedCode} className="flex-1">
                <Copy className="mr-2 h-4 w-4" />
                Copy Embed Code
              </Button>
              <Button onClick={previewEmbedCode} variant="outline" className="flex-1">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                {generatedCode}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Ads Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Advertisements</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.map((ad) => (
                <TableRow key={ad.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{ad.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-48">
                        {ad.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      ad.paymentStatus === 'paid' && ad.isActive ? 'default' :
                      ad.paymentStatus === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {ad.paymentStatus === 'paid' && ad.isActive ? 'Active' :
                       ad.paymentStatus === 'pending' ? 'Pending' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>{ad.durationDays} days</TableCell>
                  <TableCell>${ad.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>👁️ {ad.impressions} views</div>
                      <div>🖱️ {ad.clicks} clicks</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {ad.endDate && (
                      <div className="text-sm">
                        {new Date(ad.endDate).toLocaleDateString()}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {ads.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No advertisements yet</p>
              <p className="text-sm">Ads will appear here once users create campaigns</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPage;
