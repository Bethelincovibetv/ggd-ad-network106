import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Building2, ClipboardList, Megaphone, Briefcase, Loader2 } from "lucide-react";
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

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search users, businesses, ads…"
          className="w-full h-9 pl-9 pr-9 rounded-full bg-muted/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
        />
        {q && (
          <button onClick={() => { setQ(''); setResults([]); }} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 mt-2 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border-2 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#18191a] text-neutral-900 dark:text-neutral-100 shadow-2xl">
          {loading && (
            <div className="p-5 flex items-center justify-center text-xs font-bold text-neutral-600 dark:text-neutral-300">
              <Loader2 className="h-4 w-4 animate-spin mr-2 text-orange-500" />Searching directory…
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="p-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
              No matching records for &ldquo;{q}&rdquo;
            </div>
          )}
          {!loading && Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="border-b border-neutral-200 dark:border-neutral-800 last:border-0">
              <div className="px-3.5 py-1.5 bg-neutral-100 dark:bg-[#242526] text-[10px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {group} ({items.length})
              </div>
              {items.map(r => (
                <button
                  key={r.id}
                  onClick={() => { r.onClick(); setOpen(false); setQ(''); }}
                  className="w-full flex items-start gap-3 px-3.5 py-2.5 hover:bg-neutral-100 dark:hover:bg-[#282a2d] text-left transition-colors"
                >
                  <r.icon className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">{r.title}</p>
                    {r.subtitle && <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">{r.subtitle}</p>}
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