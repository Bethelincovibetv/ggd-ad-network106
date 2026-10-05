import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Video, Key, Sparkles, RefreshCw, Copy, Trash2, Plus, CheckCircle2, 
  ExternalLink, Film, Shield, Settings2, Sliders, Cpu, Play, Download,
  Volume2, Music, Layers, AlertCircle, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface VixoraApiKey {
  id: string;
  name: string;
  apiKey: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string | null;
  status: 'active' | 'revoked';
  rateLimitPerMin: number;
  permissions: string[];
  usageCount: number;
}

interface VideoJob {
  job_id: string;
  project_id: string;
  status: 'queued' | 'processing' | 'ready' | 'failed';
  progress: number;
  topic?: string;
  aspect_ratio?: string;
  duration?: string;
  video_url?: string;
  created_at: string;
}

const AdminVixoraManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'api_keys' | 'ai_config' | 'jobs' | 'embed'>('api_keys');
  const [loading, setLoading] = useState(true);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<VixoraApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyRateLimit, setNewKeyRateLimit] = useState('120');
  const [creatingKey, setCreatingKey] = useState(false);

  // AI & Engine Config state
  const [geminiKey, setGeminiKey] = useState('');
  const [pexelsKey, setPexelsKey] = useState('');
  const [fishAudioKey, setFishAudioKey] = useState('');
  const [defaultVoice, setDefaultVoice] = useState('Kore');
  const [defaultModel, setDefaultModel] = useState('gemini-2.5-flash');
  const [autoSfxEnabled, setAutoSfxEnabled] = useState(true);
  const [allowPublicApi, setAllowPublicApi] = useState(true);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Video Jobs State
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [refreshingJobs, setRefreshingJobs] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchApiKeys(),
      fetchEngineConfig(),
      fetchJobs()
    ]);
    setLoading(false);
  };

  const fetchApiKeys = async () => {
    try {
      const res = await fetch('/api/public/v1/keys/list');
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || []);
      }
    } catch (err) {
      console.warn('Could not load Vixora API keys:', err);
    }
  };

  const fetchEngineConfig = async () => {
    try {
      const { data } = await supabase.from('app_settings').select('key, value');
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((r: any) => { map[r.key] = r.value; });
        if (map['gemini_api_key'] || map['admin_gemini_key']) {
          setGeminiKey(map['gemini_api_key'] || map['admin_gemini_key']);
        }
        if (map['pexels_api_key']) setPexelsKey(map['pexels_api_key']);
        if (map['fish_audio_api_key']) setFishAudioKey(map['fish_audio_api_key']);
        if (map['vixora_default_voice']) setDefaultVoice(map['vixora_default_voice']);
        if (map['vixora_ai_model']) setDefaultModel(map['vixora_ai_model']);
        if (map['vixora_auto_sfx']) setAutoSfxEnabled(map['vixora_auto_sfx'] === 'true');
        if (map['vixora_public_api_enabled']) setAllowPublicApi(map['vixora_public_api_enabled'] !== 'false');
      }
    } catch (err) {
      console.warn('Error loading Vixora config:', err);
    }
  };

  const fetchJobs = async () => {
    setRefreshingJobs(true);
    try {
      const res = await fetch('/api/public/v1/videos/list');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.warn('Could not load video jobs:', err);
    } finally {
      setRefreshingJobs(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }
    setCreatingKey(true);
    try {
      const res = await fetch('/api/public/v1/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          rate_limit: Number(newKeyRateLimit) || 120,
          permissions: ['videos:create', 'scripts:generate', 'audio:tts', 'assets:search', 'remote:embed']
        })
      });
      const data = await res.json();
      if (data.ok && data.key) {
        toast.success(`API Key "${data.key.name}" generated!`);
        setNewKeyName('');
        await fetchApiKeys();
      } else {
        toast.error(data.error || 'Failed to generate API Key');
      }
    } catch (err: any) {
      toast.error('Network error generating key: ' + err?.message);
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (key: VixoraApiKey) => {
    try {
      const res = await fetch('/api/public/v1/keys/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key.apiKey, id: key.id })
      });
      if (res.ok) {
        toast.success(`Key "${key.name}" revoked`);
        await fetchApiKeys();
      }
    } catch (err: any) {
      toast.error('Failed to revoke key: ' + err?.message);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const updates = [
        { key: 'gemini_api_key', value: geminiKey.trim() },
        { key: 'admin_gemini_key', value: geminiKey.trim() },
        { key: 'pexels_api_key', value: pexelsKey.trim() },
        { key: 'fish_audio_api_key', value: fishAudioKey.trim() },
        { key: 'vixora_default_voice', value: defaultVoice },
        { key: 'vixora_ai_model', value: defaultModel },
        { key: 'vixora_auto_sfx', value: String(autoSfxEnabled) },
        { key: 'vixora_public_api_enabled', value: String(allowPublicApi) }
      ];

      for (const item of updates) {
        await supabase.from('app_settings').upsert(item, { onConflict: 'key' });
      }

      toast.success('Vixora AI Engine configuration saved successfully!');
    } catch (err: any) {
      toast.error('Error saving configuration: ' + err?.message);
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER CARD */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-orange-600 via-purple-600 to-indigo-700 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-lg">
            <Video className="h-7 w-7 text-amber-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/25 text-white border-0 text-[10px] font-black uppercase">
                ADMIN CONTROL
              </Badge>
              <span className="text-xs font-bold text-amber-200">v1.0 Production Engine</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black mt-0.5 tracking-tight">Vixora AI Studio & API Management</h1>
            <p className="text-xs text-white/80">Configure AI models, manage external API keys, inspect video rendering jobs, and embed widgets.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-center">
          <Button
            size="sm"
            onClick={() => window.open('/vixora', '_blank')}
            className="bg-white hover:bg-white/90 text-orange-600 font-bold text-xs shadow-md rounded-xl cursor-pointer"
          >
            Launch Studio <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-muted/60 rounded-2xl border">
        <Button
          variant={activeTab === 'api_keys' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('api_keys')}
          className={`rounded-xl text-xs font-bold gap-2 ${activeTab === 'api_keys' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}`}
        >
          <Key className="h-4 w-4" /> Vixora API Keys ({apiKeys.length})
        </Button>
        <Button
          variant={activeTab === 'ai_config' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('ai_config')}
          className={`rounded-xl text-xs font-bold gap-2 ${activeTab === 'ai_config' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
        >
          <Sliders className="h-4 w-4" /> Engine & AI Keys
        </Button>
        <Button
          variant={activeTab === 'jobs' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('jobs')}
          className={`rounded-xl text-xs font-bold gap-2 ${activeTab === 'jobs' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
        >
          <Film className="h-4 w-4" /> Video Render Queue ({jobs.length})
        </Button>
        <Button
          variant={activeTab === 'embed' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('embed')}
          className={`rounded-xl text-xs font-bold gap-2 ${activeTab === 'embed' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
        >
          <Layers className="h-4 w-4" /> Embed SDK & Widget
        </Button>
      </div>

      {/* TAB 1: API KEYS MANAGEMENT */}
      {activeTab === 'api_keys' && (
        <div className="space-y-4">
          <Card className="border shadow-md rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <Plus className="h-4 w-4 text-orange-500" /> Generate New Vixora REST API Key
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs font-bold">API Key / Client Name</Label>
                  <Input
                    placeholder="e.g. Partner Mobile App / External Client Portal"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Rate Limit (req/min)</Label>
                  <Input
                    type="number"
                    value={newKeyRateLimit}
                    onChange={(e) => setNewKeyRateLimit(e.target.value)}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>
              <Button
                onClick={handleCreateApiKey}
                disabled={creatingKey}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-xs rounded-xl shadow-md"
              >
                {creatingKey ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                Generate Production API Key
              </Button>
            </CardContent>
          </Card>

          {/* ACTIVE KEYS LIST */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-muted-foreground tracking-wider">Active API Keys</h3>
              <Button size="sm" variant="ghost" onClick={fetchApiKeys} className="h-7 text-xs">
                <RefreshCw className="h-3 w-3 mr-1" /> Refresh
              </Button>
            </div>

            {apiKeys.length === 0 ? (
              <Card className="p-8 text-center border-dashed rounded-2xl">
                <p className="text-xs text-muted-foreground">No custom API keys registered yet. Create one above!</p>
              </Card>
            ) : (
              apiKeys.map((key) => (
                <Card key={key.id} className="border rounded-2xl overflow-hidden hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{key.name}</span>
                          <Badge variant={key.status === 'active' ? 'default' : 'destructive'} className="text-[10px]">
                            {key.status.toUpperCase()}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{key.rateLimitPerMin} req/min</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-muted px-2.5 py-1 rounded-lg text-orange-600 font-bold">
                            {key.apiKey}
                          </code>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-lg"
                            onClick={() => {
                              navigator.clipboard.writeText(key.apiKey);
                              toast.success('API Key copied to clipboard!');
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Usage: <b className="text-foreground">{key.usageCount} requests</b> · Created: {new Date(key.createdAt).toLocaleDateString()}
                          {key.lastUsedAt && ` · Last Used: ${new Date(key.lastUsedAt).toLocaleTimeString()}`}
                        </p>
                      </div>

                      {key.status === 'active' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-destructive hover:bg-destructive/10 border-destructive/30 rounded-xl"
                            onClick={() => handleRevokeKey(key)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Revoke Key
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AI & ENGINE CONFIGURATION */}
      {activeTab === 'ai_config' && (
        <Card className="border shadow-md rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-600" /> Vixora AI Studio Master Engine Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* GEMINI KEY */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center justify-between">
                <span>Google Gemini AI API Key (Script Engine & Kore Voice TTS)</span>
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                >
                  {showGeminiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showGeminiKey ? 'Hide' : 'Reveal'}
                </button>
              </Label>
              <Input
                type={showGeminiKey ? "text" : "password"}
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="font-mono text-xs rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">Global key for AI script generation, video scene beats, retention scoring, and Gemini TTS.</p>
            </div>

            {/* PEXELS KEY */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Pexels Stock Video API Key (Automated HD Clip Sourcing)</Label>
              <Input
                type="password"
                placeholder="Pexels Video API Key..."
                value={pexelsKey}
                onChange={(e) => setPexelsKey(e.target.value)}
                className="font-mono text-xs rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">Powers automated HD vertical and widescreen clip sourcing for video scene sequences.</p>
            </div>

            {/* FISH AUDIO KEY */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Fish.Audio API Key (African & Custom AI Voices)</Label>
              <Input
                type="password"
                placeholder="sk-fish-..."
                value={fishAudioKey}
                onChange={(e) => setFishAudioKey(e.target.value)}
                className="font-mono text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
              {/* DEFAULT VOICE */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Default Signature Voice</Label>
                <Select value={defaultVoice} onValueChange={setDefaultVoice}>
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue placeholder="Select default voice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kore">Vixora Kore (Signature Flagship AI)</SelectItem>
                    <SelectItem value="Aoede">Aoede (Warm Storytelling)</SelectItem>
                    <SelectItem value="Puck">Puck (Viral High Energy)</SelectItem>
                    <SelectItem value="Charon">Charon (Deep Cinematic)</SelectItem>
                    <SelectItem value="Fenrir">Fenrir (Bold Tech)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* DEFAULT AI MODEL */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Default Gemini Model</Label>
                <Select value={defaultModel} onValueChange={setDefaultModel}>
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue placeholder="Select AI model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra Fast & Responsive)</SelectItem>
                    <SelectItem value="gemini-3.7-flash">Gemini 3.7 Flash (Latest Advanced Reasoning)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* TOGGLES */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                <div>
                  <p className="text-xs font-bold text-foreground">Auto-SFX Cues for Video Beats</p>
                  <p className="text-[10px] text-muted-foreground">Automatically attach whooshes, pops and sub drops to scene cuts</p>
                </div>
                <Switch checked={autoSfxEnabled} onCheckedChange={setAutoSfxEnabled} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                <div>
                  <p className="text-xs font-bold text-foreground">Enable Public REST API & Embed SDK</p>
                  <p className="text-[10px] text-muted-foreground">Allow external client apps to invoke /api/public/v1/* endpoints</p>
                </div>
                <Switch checked={allowPublicApi} onCheckedChange={setAllowPublicApi} />
              </div>
            </div>

            <Button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer mt-2"
            >
              {savingConfig ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Save Vixora Master Engine Configuration
            </Button>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: VIDEO RENDER JOBS QUEUE */}
      {activeTab === 'jobs' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-muted-foreground tracking-wider">
              Server-Side Video Render Jobs ({jobs.length})
            </h3>
            <Button size="sm" variant="outline" onClick={fetchJobs} disabled={refreshingJobs} className="h-7 text-xs rounded-xl">
              <RefreshCw className={`h-3 w-3 mr-1 ${refreshingJobs ? 'animate-spin' : ''}`} /> Refresh Jobs
            </Button>
          </div>

          {jobs.length === 0 ? (
            <Card className="p-8 text-center border-dashed rounded-2xl">
              <p className="text-xs text-muted-foreground">No background video render jobs queued yet. Initiate one from Vixora Studio or the REST API.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {jobs.map((job) => (
                <Card key={job.job_id} className="border rounded-2xl hover:shadow-md transition-all">
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <code className="text-[10px] font-mono font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded">
                        {job.job_id}
                      </code>
                      <Badge
                        variant={job.status === 'ready' ? 'default' : job.status === 'processing' ? 'secondary' : 'outline'}
                        className="text-[10px]"
                      >
                        {job.status.toUpperCase()} ({job.progress}%)
                      </Badge>
                    </div>

                    <div>
                      <p className="font-bold text-xs text-foreground truncate">{job.topic || 'Untitled Video'}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Ratio: {job.aspect_ratio || 'vertical'} · Duration: {job.duration || '30s'} · Queued: {new Date(job.created_at).toLocaleTimeString()}
                      </p>
                    </div>

                    {job.video_url && (
                      <div className="pt-2 border-t flex items-center justify-between">
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Render Ready
                        </span>
                        <a
                          href={job.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-orange-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <Play className="h-3 w-3" /> Preview Video
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: EMBED SDK & WIDGET */}
      {activeTab === 'embed' && (
        <Card className="border shadow-md rounded-2xl space-y-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-600" /> Universal Embed SDK (Zero-Login Widget)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Embed Vixora Video Studio or AI Creative Assistant directly onto any external client portal, WordPress site, or mobile web app.
            </p>

            <div className="space-y-2">
              <Label className="text-xs font-bold">1-Line Script Tag (Place before closing &lt;/body&gt;)</Label>
              <div className="relative">
                <pre className="p-3 bg-muted rounded-xl text-[11px] font-mono overflow-x-auto text-foreground">
                  {`<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://ggdadnetwork.com'}/embed.js"></script>`}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-2 top-2 h-7 text-xs"
                  onClick={() => {
                    const tag = `<script src="${window.location.origin}/embed.js"></script>`;
                    navigator.clipboard.writeText(tag);
                    toast.success('Script tag copied!');
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">HTML Container Target for Video Studio</Label>
              <div className="relative">
                <pre className="p-3 bg-muted rounded-xl text-[11px] font-mono overflow-x-auto text-foreground">
                  {`<div id="vixora-video-creator" data-theme="dark" data-height="750px"></div>`}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-2 top-2 h-7 text-xs"
                  onClick={() => {
                    const html = `<div id="vixora-video-creator" data-theme="dark" data-height="750px"></div>`;
                    navigator.clipboard.writeText(html);
                    toast.success('Container HTML copied!');
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminVixoraManager;
export { AdminVixoraManager };
