import React, { useState, useMemo } from 'react';
import { VIXORA_TOOLS_REGISTRY, VixoraToolEntry } from '../services/vixoraToolsRegistry';
import { generateBannerAdvertCanvas, BannerFormat } from '../services/vixoraBannerEngine';

interface ToolsLibraryProps {
  onSelectTab: (tab: string) => void;
  onStartLiveAssistant: () => void;
  onOpenChatWithPrompt: (prompt?: string) => void;
  themeMode?: 'light' | 'dark';
}

export const ToolsLibrary: React.FC<ToolsLibraryProps> = ({
  onSelectTab,
  onStartLiveAssistant,
  onOpenChatWithPrompt,
  themeMode = 'dark'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Interactive Banner Quick Sandbox Modal State
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [sandboxHeadline, setSandboxHeadline] = useState('Scale Your Business on GGD Ad Network');
  const [sandboxSubheadline, setSandboxSubheadline] = useState('High-converting targeted traffic and verified buyers');
  const [sandboxFormat, setSandboxFormat] = useState<BannerFormat>('300x250');
  const [sandboxTheme, setSandboxTheme] = useState<'orange' | 'gold' | 'emerald' | 'cyber' | 'blue'>('orange');
  const [sandboxCta, setSandboxCta] = useState('Claim Offer Now →');
  const [sandboxPreviewUrl, setSandboxPreviewUrl] = useState<string>('');

  const categories = [
    { id: 'all', label: 'All Tools', icon: 'fa-shapes' },
    { id: 'video', label: 'Video & Scripting', icon: 'fa-video' },
    { id: 'voice', label: 'AI Voice & Audio', icon: 'fa-waveform-lines' },
    { id: 'growth', label: 'Growth & SEO', icon: 'fa-chart-line' },
    { id: 'creative', label: 'Creative Assets', icon: 'fa-palette' },
    { id: 'mentorship', label: 'Mentorship & Memory', icon: 'fa-brain' }
  ];

  const filteredTools = useMemo(() => {
    return VIXORA_TOOLS_REGISTRY.filter(tool => {
      const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;

      const matchesSearch = 
        tool.name.toLowerCase().includes(q) ||
        tool.shortDescription.toLowerCase().includes(q) ||
        tool.fullDescription.toLowerCase().includes(q) ||
        tool.keywords.some(k => k.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const handleLaunchTool = (tool: VixoraToolEntry) => {
    if (tool.actionType === 'tab' && tool.targetTab) {
      onSelectTab(tool.targetTab);
    } else if (tool.actionType === 'live_voice') {
      onStartLiveAssistant();
    } else if (tool.actionType === 'chat_command') {
      onOpenChatWithPrompt(tool.suggestedPrompt || `Help me with ${tool.name}`);
    } else if (tool.targetTab) {
      onSelectTab(tool.targetTab);
    }
  };

  const openBannerSandbox = () => {
    const res = generateBannerAdvertCanvas({
      headline: sandboxHeadline,
      subheadline: sandboxSubheadline,
      format: sandboxFormat,
      themeColor: sandboxTheme,
      ctaText: sandboxCta,
      brandName: 'GGD Ad Network'
    });
    setSandboxPreviewUrl(res.dataUrl);
    setIsSandboxOpen(true);
  };

  const regenerateSandboxPreview = (
    headline = sandboxHeadline,
    sub = sandboxSubheadline,
    fmt = sandboxFormat,
    thm = sandboxTheme,
    cta = sandboxCta
  ) => {
    const res = generateBannerAdvertCanvas({
      headline,
      subheadline: sub,
      format: fmt,
      themeColor: thm,
      ctaText: cta,
      brandName: 'GGD Ad Network'
    });
    setSandboxPreviewUrl(res.dataUrl);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* PAGE HEADER */}
      <div className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden ${
        themeMode === 'light' 
          ? 'bg-gradient-to-br from-white via-orange-50/30 to-amber-50/50 border-slate-200 text-slate-900' 
          : 'bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border-white/10 text-white'
      }`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-ggd-orange/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-ggd-orange/20 text-ggd-orange border border-ggd-orange/30">
              Unified Feature Library
            </span>
            <span className="text-xs font-bold text-slate-400">({VIXORA_TOOLS_REGISTRY.length} AI Tools)</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight flex items-center gap-2.5">
            <i className="fa-solid fa-bolt-lightning text-ggd-orange"></i>
            <span>Vixora AI Tools & Capabilities</span>
          </h2>

          <p className="text-xs text-slate-400 max-w-xl leading-relaxed font-medium">
            Explore every AI creation tool in Vixora AI Studio. From full autopilot video production and live audio calls to viral scriptwriting, GGD banner advert design, and SEO growth tools.
          </p>

          {/* QUICK HERO ACTIONS */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => openBannerSandbox()}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <i className="fa-solid fa-rectangle-ad text-xs"></i>
              <span>Quick Banner Generator</span>
            </button>
            <button
              onClick={onStartLiveAssistant}
              className="px-3.5 py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-ggd-orange border border-orange-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <i className="fa-solid fa-microphone-lines text-xs animate-pulse"></i>
              <span>Live Voice Agent Call</span>
            </button>
            <button
              onClick={() => onOpenChatWithPrompt('How far Vixora! Help me plan a complete video and ad marketing campaign')}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/15 active:scale-95 transition-all cursor-pointer"
            >
              <i className="fa-solid fa-comments text-xs"></i>
              <span>Ask AI Chat Assistant</span>
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="pt-2">
            <div className={`relative flex items-center rounded-2xl border transition-all shadow-md ${
              themeMode === 'light'
                ? 'bg-white border-slate-300 focus-within:border-ggd-orange text-slate-900'
                : 'bg-white/5 border-white/10 focus-within:border-ggd-orange text-white'
            }`}>
              <i className="fa-solid fa-magnifying-glass text-slate-400 text-sm ml-4"></i>
              <input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tools by name, keyword (e.g. 'banner', 'video', 'voice', 'script', 'flyer')..."
                className="w-full px-3 py-3.5 bg-transparent outline-none text-xs font-semibold placeholder:text-slate-500"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="mr-3 text-slate-400 hover:text-white text-xs p-1"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORY FILTER PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map(cat => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2 shrink-0 active:scale-95 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white border-orange-400/50 shadow-md'
                  : themeMode === 'light'
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <i className={`fa-solid ${cat.icon} text-[11px]`}></i>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* TOOLS GRID */}
      {filteredTools.length === 0 ? (
        <div className={`p-10 text-center rounded-3xl border ${
          themeMode === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/50 border-white/5'
        }`}>
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3 text-lg">
            <i className="fa-solid fa-magnifying-glass"></i>
          </div>
          <h3 className="text-sm font-black uppercase tracking-tight">No tools found</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">Try searching for another keyword or change the selected category filter.</p>
          <button 
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
            className="mt-4 px-4 py-2 rounded-xl bg-ggd-orange/10 border border-ggd-orange/30 text-ggd-orange font-bold text-xs cursor-pointer"
          >
            Reset Search Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool) => (
            <div 
              key={tool.id}
              className={`p-5 rounded-3xl border flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 shadow-lg group relative overflow-hidden ${
                themeMode === 'light'
                  ? 'bg-white border-slate-200 hover:border-ggd-orange/50 hover:shadow-orange-500/10'
                  : 'bg-slate-900/90 border-white/10 hover:border-ggd-orange/50 hover:shadow-orange-500/10'
              }`}
            >
              <div className="space-y-3 relative z-10">
                {/* TOOL HEADER */}
                <div className="flex items-start justify-between gap-2">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center text-white text-base shadow-md shrink-0 border border-white/20`}>
                    <i className={`fa-solid ${tool.icon}`}></i>
                  </div>
                  {tool.badge && (
                    <span className="px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-orange-500/15 border border-orange-500/30 text-ggd-orange">
                      {tool.badge}
                    </span>
                  )}
                </div>

                {/* TOOL TITLE & DESC */}
                <div>
                  <h3 className={`text-sm font-black uppercase tracking-tight group-hover:text-ggd-orange transition-colors ${themeMode === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    {tool.name}
                  </h3>
                  <p className={`text-xs mt-1 font-medium leading-relaxed ${themeMode === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                    {tool.shortDescription}
                  </p>
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className={`pt-4 mt-4 border-t flex items-center justify-between gap-2 ${themeMode === 'light' ? 'border-slate-100' : 'border-white/5'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${themeMode === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {tool.category.toUpperCase()}
                </span>
                
                <div className="flex items-center gap-1.5">
                  {(tool.id === 'tool_banner_ad' || tool.id === 'tool_flyer_generator') && (
                    <button
                      onClick={() => openBannerSandbox()}
                      title="Quick Design Sandbox"
                      className="px-2.5 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      <i className="fa-solid fa-paintbrush mr-1"></i>
                      <span>Quick Test</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleLaunchTool(tool)}
                    className="btn-3d btn-3d-orange px-3.5 py-2 min-h-[40px] text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer touch-manipulation"
                  >
                    <span>
                      {tool.actionType === 'chat_command' 
                        ? 'Invoke in Chat' 
                        : tool.actionType === 'live_voice'
                        ? 'Start Voice Call'
                        : 'Launch Feature'}
                    </span>
                    <i className="fa-solid fa-arrow-right text-[10px]"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QUICK BANNER & GRAPHIC DESIGNER SANDBOX MODAL */}
      {isSandboxOpen && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className={`w-full max-w-2xl rounded-3xl border p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5 ${
            themeMode === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-white/15 text-white'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
                  <i className="fa-solid fa-rectangle-ad"></i>
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight">GGD Banner & Graphic Sandbox</h3>
                  <p className="text-[10px] text-slate-400">Design high-converting banner ads & promotional flyers in seconds</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSandboxOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* LIVE PREVIEW AREA */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center justify-center min-h-[220px]">
              {sandboxPreviewUrl ? (
                <div className="max-w-full overflow-hidden rounded-xl border border-white/20 shadow-xl">
                  <img src={sandboxPreviewUrl} alt="Preview" className="max-h-64 object-contain mx-auto" />
                </div>
              ) : (
                <div className="text-center text-slate-400 text-xs">
                  <i className="fa-solid fa-spinner animate-spin text-lg mb-2 text-ggd-orange"></i>
                  <p>Rendering high-res canvas banner...</p>
                </div>
              )}
            </div>

            {/* CONTROLS FORM */}
            <div className="space-y-3 text-left">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Headline Text</label>
                <input 
                  type="text" 
                  value={sandboxHeadline}
                  onChange={e => {
                    setSandboxHeadline(e.target.value);
                    regenerateSandboxPreview(e.target.value, sandboxSubheadline, sandboxFormat, sandboxTheme, sandboxCta);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold outline-none focus:border-ggd-orange ${
                    themeMode === 'light' ? 'bg-slate-50 border-slate-300' : 'bg-black/30 border-white/10'
                  }`}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Subheadline / Supporting Offer</label>
                <input 
                  type="text" 
                  value={sandboxSubheadline}
                  onChange={e => {
                    setSandboxSubheadline(e.target.value);
                    regenerateSandboxPreview(sandboxHeadline, e.target.value, sandboxFormat, sandboxTheme, sandboxCta);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold outline-none focus:border-ggd-orange ${
                    themeMode === 'light' ? 'bg-slate-50 border-slate-300' : 'bg-black/30 border-white/10'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Banner Dimensions</label>
                  <select 
                    value={sandboxFormat}
                    onChange={e => {
                      const fmt = e.target.value as BannerFormat;
                      setSandboxFormat(fmt);
                      regenerateSandboxPreview(sandboxHeadline, sandboxSubheadline, fmt, sandboxTheme, sandboxCta);
                    }}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none ${
                      themeMode === 'light' ? 'bg-slate-50 border-slate-300' : 'bg-black/30 border-white/10'
                    }`}
                  >
                    <option value="300x250">300x250 (Medium Rectangle - Most Popular)</option>
                    <option value="728x90">728x90 (Leaderboard Top Banner)</option>
                    <option value="1080x1080">1080x1080 (Square Instagram/Social)</option>
                    <option value="1080x1350">1080x1350 (Portrait Promotional Flyer)</option>
                    <option value="320x100">320x100 (Mobile Large Banner)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Theme Palette</label>
                  <select 
                    value={sandboxTheme}
                    onChange={e => {
                      const thm = e.target.value as any;
                      setSandboxTheme(thm);
                      regenerateSandboxPreview(sandboxHeadline, sandboxSubheadline, sandboxFormat, thm, sandboxCta);
                    }}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none ${
                      themeMode === 'light' ? 'bg-slate-50 border-slate-300' : 'bg-black/30 border-white/10'
                    }`}
                  >
                    <option value="orange">Vixora Orange & Amber</option>
                    <option value="gold">Luxury Gold & Black</option>
                    <option value="emerald">Emerald Green Wealth</option>
                    <option value="cyber">Cyberpunk Neon Purple</option>
                    <option value="blue">Corporate Tech Blue</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ACTION FOOTER */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <a 
                href={sandboxPreviewUrl} 
                download={`GGD_Banner_${sandboxFormat}_${Date.now()}.png`}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-center cursor-pointer"
              >
                <i className="fa-solid fa-download"></i>
                <span>Download High-Res PNG</span>
              </a>

              <button 
                onClick={() => {
                  const embedCode = `<a href="https://ggd.ng" target="_blank"><img src="${sandboxPreviewUrl}" alt="${sandboxHeadline}" style="max-width:100%;border-radius:12px;"/></a>`;
                  navigator.clipboard?.writeText(embedCode);
                  alert("Banner embed HTML code copied to clipboard!");
                }}
                className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase flex items-center gap-1.5 border border-white/15 active:scale-95 transition-all cursor-pointer"
              >
                <i className="fa-solid fa-code"></i>
                <span>Copy Embed Code</span>
              </button>

              <button 
                onClick={() => {
                  setIsSandboxOpen(false);
                  onOpenChatWithPrompt(`Generate a ${sandboxFormat} banner advert about ${sandboxHeadline}`);
                }}
                className="py-3 px-4 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 font-bold text-xs uppercase flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                <span>Launch in AI Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

