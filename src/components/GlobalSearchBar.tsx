import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Building2, ClipboardList, Megaphone, Briefcase, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';

interface Result {
  id: string;
  title: string;
  subtitle?: string;
  group: 'Users' | 'Businesses' | 'Tasks' | 'Banner Ads' | 'Apps' | 'Syndicate Tasks';
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

const GlobalSearchBar: React.FC = () => {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const handle = setTimeout(async () => {
      setLoading(true);
      const term = `%${q.trim()}%`;
      const [profiles, businesses, tasks, ads, apps, synTasks] = await Promise.all([
        supabase.from('profiles').select('user_id,display_name,email,business_name,business_category').or(`display_name.ilike.${term},email.ilike.${term},business_name.ilike.${term}`).limit(5),
        supabase.from('business_profiles').select('id,business_name,description').ilike('business_name', `%${q.trim()}%`).limit(5),
        supabase.from('tasks').select('id,title,description').ilike('title', `%${q.trim()}%`).eq('is_active', true).limit(5),
        supabase.from('ads').select('id,title,description').ilike('title', `%${q.trim()}%`).eq('is_active', true).limit(5),
        supabase.from('marketing_apps').select('id,title,description,app_link').ilike('title', `%${q.trim()}%`).limit(5),
        supabase.from('syndicate_tasks').select('id,title,description').ilike('title', `%${q.trim()}%`).limit(5),
      ]);

      const out: Result[] = [];
      (profiles.data || []).forEach((p: any) => out.push({
        id: 'u-' + p.user_id, title: p.business_name || p.display_name || p.email || 'User',
        subtitle: p.business_category || p.email, group: 'Users', icon: User,
        onClick: () => navigate(`/user/${p.user_id}`),
      }));
      (businesses.data || []).forEach((b: any) => out.push({
        id: 'b-' + b.id, title: b.business_name, subtitle: b.description?.slice(0, 80),
        group: 'Businesses', icon: Building2,
        onClick: () => navigate(`/business/${b.id}`),
      }));
      (tasks.data || []).forEach((t: any) => out.push({
        id: 't-' + t.id, title: t.title, subtitle: t.description?.slice(0, 80),
        group: 'Tasks', icon: ClipboardList, onClick: () => { setOpen(false); window.dispatchEvent(new CustomEvent('ggd-nav', { detail: 'tasks' })); },
      }));
      (ads.data || []).forEach((a: any) => out.push({
        id: 'a-' + a.id, title: a.title, subtitle: a.description?.slice(0, 80),
        group: 'Banner Ads', icon: Megaphone, onClick: () => { setOpen(false); window.dispatchEvent(new CustomEvent('ggd-nav', { detail: 'ads' })); },
      }));
      (apps.data || []).forEach((a: any) => out.push({
        id: 'app-' + a.id, title: a.title, subtitle: a.description?.slice(0, 80),
        group: 'Apps', icon: Megaphone, onClick: () => { if (a.app_link) window.open(a.app_link, '_blank'); },
      }));
      (synTasks.data || []).forEach((s: any) => out.push({
        id: 's-' + s.id, title: s.title, subtitle: s.description?.slice(0, 80),
        group: 'Syndicate Tasks', icon: Briefcase, onClick: () => { setOpen(false); window.dispatchEvent(new CustomEvent('ggd-nav', { detail: 'syndicate' })); },
      }));

      setResults(out);
      setLoading(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [q, navigate]);

  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    (acc[r.group] = acc[r.group] || []).push(r); return acc;
  }, {});

  const quickChips = [
    { label: "🏢 Businesses", term: "store" },
    { label: "🛍️ Products", term: "shop" },
    { label: "📋 Tasks", term: "earn" },
    { label: "📢 Adverts", term: "ad" }
  ];

  return (
    <div ref={ref} className="relative w-full max-w-xl mx-auto space-y-1.5">
      {/* 3D Colorful Gradient Container like Community Search Bar */}
      <div className="relative group p-[2px] rounded-2xl bg-gradient-to-r from-orange-500 via-rose-500 via-purple-600 to-amber-400 shadow-md hover:shadow-xl transition-all duration-300">
        <div className="bg-card/95 backdrop-blur-md rounded-[14px] p-1.5 sm:p-2 flex items-center gap-2 sm:gap-2.5">
          {/* 3D Colorful Icon Badge */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-orange-500/30 shrink-0 group-hover:scale-105 transition-transform">
            <Search className="h-4 w-4 drop-shadow" />
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={q}
              onChange={e => { setQ(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder="Search merchants, businesses, tasks, ads & members…"
              className="w-full h-8 sm:h-9 border-0 bg-transparent text-xs sm:text-sm font-medium focus:outline-none placeholder:text-muted-foreground/70 px-1 text-foreground"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {q && (
              <button
                type="button"
                onClick={() => { setQ(''); setResults([]); }}
                className="h-7 w-7 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center text-xs transition-colors"
                title="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs px-3 py-1.5 sm:py-2 rounded-xl shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Quick Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-1 py-0.5 text-xs">
        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1 shrink-0 mr-0.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
          Explore:
        </span>
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setQ(chip.term);
              setOpen(true);
            }}
            className="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-muted/50 hover:bg-orange-500/10 hover:text-orange-600 border border-border/60 transition-colors text-muted-foreground"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-border/80 bg-card/98 backdrop-blur-md shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150">
          {loading && (
            <div className="p-4 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2 text-orange-500" />Searching…
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">No results for "{q}"</div>
          )}
          {!loading && Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="border-b border-border/50 last:border-0">
              <div className="px-3 py-1.5 bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{group}</div>
              {items.map(r => (
                <button
                  key={r.id}
                  onClick={() => { r.onClick(); setOpen(false); setQ(''); }}
                  className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-muted/60 text-left transition-colors cursor-pointer"
                >
                  <r.icon className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{r.title}</p>
                    {r.subtitle && <p className="text-[11px] text-muted-foreground truncate">{r.subtitle}</p>}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlobalSearchBar;