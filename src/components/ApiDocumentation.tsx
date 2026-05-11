import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Code, Globe, Zap, Shield, BookOpen, ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const API_BASE = `${supabaseUrl}/functions/v1/ad-network-api`;

const CodeBlock = ({ code, language = 'javascript' }: { code: string; language?: string }) => {
  const copy = () => { navigator.clipboard.writeText(code); toast.success('Copied!'); };
  return (
    <div className="relative bg-gray-950 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900 border-b border-gray-800">
        <span className="text-[10px] text-gray-400 uppercase">{language}</span>
        <Button size="icon" variant="ghost" className="h-6 w-6 text-gray-400 hover:text-white" onClick={copy}>
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <pre className="p-3 overflow-x-auto text-[11px] leading-relaxed text-green-400 whitespace-pre-wrap">{code}</pre>
    </div>
  );
};

interface ApiDocumentationProps {
  userApiKey?: string;
}

const ApiDocumentation = ({ userApiKey }: ApiDocumentationProps) => {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const activeKey = userApiKey || apiKeys[0]?.api_key || 'YOUR_API_KEY';

  useEffect(() => {
    const fetchKeys = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('api_keys').select('api_key, name').eq('user_id', user.id).eq('is_active', true).limit(5);
      setApiKeys(data || []);
    };
    fetchKeys();
  }, []);

  const fullInstructions = `=== GGD AD NETWORK API - COMPLETE INTEGRATION GUIDE ===

API Base URL: ${API_BASE}
Your API Key: ${activeKey}

--- AUTHENTICATION ---
Include your API key in every request using one of these methods:
  Header: x-api-key: ${activeKey}
  Query:  ?api_key=${activeKey}

--- ENDPOINT 1: FETCH ADS (GET) ---
URL: ${API_BASE}?api_key=${activeKey}&limit=5

Example (JavaScript):
fetch("${API_BASE}?api_key=${activeKey}&limit=5")
  .then(r => r.json())
  .then(data => {
    // data.ads = [{ id, title, description, image_url, target_url }]
    data.ads.forEach(ad => console.log(ad.title));
  });

Response:
{
  "success": true,
  "ads": [{ "id": "...", "title": "...", "description": "...", "image_url": "...", "target_url": "..." }],
  "count": 1
}

--- ENDPOINT 2: SUBMIT AD (POST) ---
URL: ${API_BASE}
Headers: { "Content-Type": "application/json", "x-api-key": "${activeKey}" }
Body: { "title": "My Ad", "description": "...", "target_url": "https://...", "image_url": "https://...", "duration_days": 30 }

Example (JavaScript):
fetch("${API_BASE}", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-api-key": "${activeKey}" },
  body: JSON.stringify({
    title: "My Product",
    description: "Best deal!",
    target_url: "https://example.com",
    image_url: "https://example.com/img.jpg",
    duration_days: 30
  })
}).then(r => r.json()).then(console.log);

--- ENDPOINT 3: TRACK EVENTS (POST) ---
URL: ${API_BASE}
Headers: { "Content-Type": "application/json", "x-api-key": "${activeKey}" }
Body: { "ad_id": "uuid", "event_type": "impression" or "click" }

--- HTML EMBED WIDGET (NO CODE NEEDED) ---
<div id="ggd-ad-container"></div>
<script>
(function() {
  var API_KEY = "${activeKey}";
  var API_URL = "${API_BASE}";
  var container = document.getElementById("ggd-ad-container");
  var ads = [], idx = 0;
  function load() {
    fetch(API_URL + "?api_key=" + API_KEY + "&limit=10")
      .then(function(r) { return r.json(); })
      .then(function(d) { if (d.ads && d.ads.length) { ads = d.ads; show(); } });
  }
  function track(id, type) {
    fetch(API_URL, { method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify({ ad_id: id, event_type: type })
    });
  }
  function show() {
    if (!ads.length) return;
    var ad = ads[idx];
    track(ad.id, "impression");
    container.innerHTML = '<div style="max-width:100%;margin:10px auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.12);font-family:system-ui;cursor:pointer;background:#fff" onclick="window.open(\\'' + ad.target_url + '\\',\\'_blank\\')">'
      + (ad.image_url ? '<img src="' + ad.image_url + '" style="width:100%;display:block">' : '')
      + '<div style="padding:10px 14px"><h3 style="margin:0;font-size:15px;font-weight:700">' + ad.title + '</h3>'
      + (ad.description ? '<p style="margin:4px 0 0;font-size:12px;color:#666">' + ad.description + '</p>' : '')
      + '</div><div style="background:#f9f9f9;padding:3px;text-align:center;font-size:9px;color:#bbb">Ad by GGD AD NETWORK</div></div>';
    idx = (idx + 1) % ads.length;
  }
  load();
  setInterval(show, 8000);
})();
</script>

--- ERROR CODES ---
401 - Missing API key
403 - Invalid or inactive API key
400 - Bad request (missing fields)
405 - Method not allowed
500 - Server error

--- NOTES ---
• Submitted ads may require admin approval before going live
• Request counts are tracked per API key
• API access is for Premium and Admin users
`;

  const copyAll = () => {
    navigator.clipboard.writeText(fullInstructions);
    toast.success('Complete API instructions copied! Paste into any AI app builder.');
  };

  return (
    <div className="space-y-4">
      {/* Hero */}
      <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-0">
        <CardContent className="p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Globe className="h-6 w-6" />
            <h2 className="text-lg font-black">GGD Ad Network API</h2>
          </div>
          <p className="text-sm text-orange-100">Integrate GGD ads into any website or app. Submit ads, display them, and track performance.</p>
          <code className="block text-[10px] bg-white/20 rounded px-2 py-1 mt-2 break-all">{API_BASE}</code>
        </CardContent>
      </Card>

      {/* Copy All Instructions - AI Builder Ready */}
      <Card className="border-2 border-orange-500/50 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardCopy className="h-4 w-4 text-orange-500" />
            Copy Full API Instructions for AI App Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Copy the complete API documentation including your API key. Paste it into any AI app creator (like Lovable, Bolt, v0, etc.) to build an app that integrates with GGD Ad Network.
          </p>
          {apiKeys.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-muted-foreground">Using key:</span>
              <code className="text-[10px] bg-muted px-2 py-0.5 rounded font-mono text-orange-600 break-all">{activeKey}</code>
            </div>
          )}
          {apiKeys.length === 0 && (
            <p className="text-[10px] text-amber-600 font-medium">⚠️ No API key found. Create one in the API tab first, then come back to copy instructions with your key.</p>
          )}
          <Button 
            onClick={copyAll} 
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white gap-2"
          >
            <ClipboardCopy className="h-4 w-4" />
            Copy Complete Instructions + API Key
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            Includes: all endpoints, authentication, examples, embed widget & your API key
          </p>
        </CardContent>
      </Card>

      {/* Quick Start */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-orange-500" />Quick Start</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Go to <strong>API</strong> tab and generate an API key</li>
            <li>Use the key in the <code className="bg-muted px-1 rounded">x-api-key</code> header or <code className="bg-muted px-1 rounded">api_key</code> query param</li>
            <li>Fetch ads or submit your own ads via the API</li>
            <li>Track impressions & clicks for analytics</li>
          </ol>
        </CardContent>
      </Card>

      {/* Authentication */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-orange-500" />Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">Every request must include your API key. Two methods:</p>
          <CodeBlock language="header" code={`x-api-key: ${activeKey}`} />
          <p className="text-[10px] text-muted-foreground text-center">— or —</p>
          <CodeBlock language="query" code={`${API_BASE}?api_key=${activeKey}`} />
        </CardContent>
      </Card>

      {/* Endpoints */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Code className="h-4 w-4 text-orange-500" />API Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="fetch" className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-8">
              <TabsTrigger value="fetch" className="text-[10px]">Fetch Ads</TabsTrigger>
              <TabsTrigger value="submit" className="text-[10px]">Submit Ad</TabsTrigger>
              <TabsTrigger value="track" className="text-[10px]">Track Event</TabsTrigger>
            </TabsList>

            <TabsContent value="fetch" className="space-y-3 mt-3">
              <div className="flex items-center gap-2">
                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded">GET</span>
                <code className="text-[10px] text-muted-foreground break-all">/ad-network-api?api_key={activeKey}&limit=5</code>
              </div>
              <p className="text-xs text-muted-foreground">Returns active ads from the GGD network to display on your site.</p>
              <CodeBlock code={`fetch("${API_BASE}?api_key=${activeKey}&limit=5")
  .then(r => r.json())
  .then(data => {
    data.ads.forEach(ad => {
      console.log(ad.title, ad.target_url);
    });
  });`} />
              <p className="text-[10px] font-semibold text-foreground">Response:</p>
              <CodeBlock language="json" code={`{
  "success": true,
  "ads": [
    {
      "id": "uuid-here",
      "title": "Amazing Product",
      "description": "Check out this deal!",
      "image_url": "https://...",
      "target_url": "https://example.com"
    }
  ],
  "count": 1
}`} />
            </TabsContent>

            <TabsContent value="submit" className="space-y-3 mt-3">
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded">POST</span>
                <code className="text-[10px] text-muted-foreground">/ad-network-api</code>
              </div>
              <p className="text-xs text-muted-foreground">Submit an ad to the GGD network.</p>
              <CodeBlock code={`fetch("${API_BASE}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${activeKey}"
  },
  body: JSON.stringify({
    title: "My Product Launch",
    description: "Best product of 2026!",
    target_url: "https://mysite.com/product",
    image_url: "https://mysite.com/banner.jpg",
    duration_days: 30
  })
})
.then(r => r.json())
.then(data => console.log(data));`} />
            </TabsContent>

            <TabsContent value="track" className="space-y-3 mt-3">
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded">POST</span>
                <code className="text-[10px] text-muted-foreground">/ad-network-api</code>
              </div>
              <p className="text-xs text-muted-foreground">Track ad impressions and clicks.</p>
              <CodeBlock code={`fetch("${API_BASE}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${activeKey}"
  },
  body: JSON.stringify({
    ad_id: "ad-uuid-here",
    event_type: "click"
  })
});`} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Embed Widget */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-orange-500" />Embed Widget (No-Code)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">Paste this HTML snippet into your website:</p>
          <CodeBlock language="html" code={`<!-- GGD Ad Network Widget -->
<div id="ggd-ad-container"></div>
<script>
(function() {
  var API_KEY = "${activeKey}";
  var API_URL = "${API_BASE}";
  var container = document.getElementById("ggd-ad-container");
  var ads = [], idx = 0;
  function load() {
    fetch(API_URL + "?api_key=" + API_KEY + "&limit=10")
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.ads && d.ads.length) { ads = d.ads; show(); }
      });
  }
  function track(id, type) {
    fetch(API_URL, { method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify({ ad_id: id, event_type: type })
    });
  }
  function show() {
    if (!ads.length) return;
    var ad = ads[idx];
    track(ad.id, "impression");
    container.innerHTML = '<div style="max-width:100%;margin:10px auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.12);font-family:system-ui;cursor:pointer;background:#fff" onclick="window.open(\\'' + ad.target_url + '\\',\\'_blank\\')">'
      + (ad.image_url ? '<img src="' + ad.image_url + '" style="width:100%;display:block">' : '')
      + '<div style="padding:10px 14px"><h3 style="margin:0;font-size:15px;font-weight:700">' + ad.title + '</h3>'
      + (ad.description ? '<p style="margin:4px 0 0;font-size:12px;color:#666">' + ad.description + '</p>' : '')
      + '</div><div style="background:#f9f9f9;padding:3px;text-align:center;font-size:9px;color:#bbb">Ad by GGD AD NETWORK</div></div>';
    idx = (idx + 1) % ads.length;
  }
  load();
  setInterval(show, 8000);
})();
</script>`} />
        </CardContent>
      </Card>

      {/* Error Codes */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Error Codes</CardTitle></CardHeader>
        <CardContent>
          <div className="text-[10px] space-y-1">
            {[['401','Missing API key'],['403','Invalid or inactive API key'],['400','Bad request'],['405','Method not allowed'],['500','Server error']].map(([code, desc]) => (
              <div key={code} className="flex items-center gap-2">
                <span className="bg-red-100 text-red-700 font-mono font-bold px-1.5 py-0.5 rounded">{code}</span>
                <span className="text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rate Limits */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Rate Limits & Notes</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>• Request counts are tracked per API key</p>
          <p>• Submitted ads may be auto-approved or require admin review depending on platform settings</p>
          <p>• API access is available for <strong>Premium</strong> and <strong>Admin</strong> users</p>
          <p>• Each API key can optionally be scoped to a domain</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiDocumentation;
