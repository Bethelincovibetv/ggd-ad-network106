import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, User, Store, Package, Video as VideoIcon,
  MessageSquare, ExternalLink, Play, ThumbsUp, Calendar, ArrowRight,
  Eye, CheckCircle2, Search
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { classifyVideoUrl } from "@/utils/urlParser";

interface Props {
  query: string;
  onTagSelect?: (tag: string) => void;
  onClose?: () => void;
}

type SearchCategory = "all" | "posts" | "videos" | "people" | "pages";

interface PostHit {
  id: string;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  user_id: string;
  tags?: string[];
  author?: {
    display_name?: string;
    business_name?: string;
    avatar_url?: string;
    business_logo_url?: string;
    business_slug?: string;
  };
  isVideoPost: boolean;
}

interface PersonHit {
  id: string;
  name: string;
  avatar?: string | null;
  subtitle?: string;
  slug?: string | null;
}

interface PageHit {
  id: string;
  name: string;
  logo?: string | null;
  industry?: string | null;
  state?: string | null;
  slug?: string | null;
  description?: string | null;
}

/**
 * Facebook-Style Categorized Search Interface
 * Features solid, non-transparent high-contrast styling and tabs for:
 * All, Posts, Videos, Users / People, and Pages / Businesses.
 */
export const CommunitySearchResults: React.FC<Props> = ({ query, onClose }) => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<SearchCategory>("all");
  const [loading, setLoading] = useState(false);

  const [posts, setPosts] = useState<PostHit[]>([]);
  const [videos, setVideos] = useState<PostHit[]>([]);
  const [people, setPeople] = useState<PersonHit[]>([]);
  const [pages, setPages] = useState<PageHit[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setPosts([]);
      setVideos([]);
      setPeople([]);
      setPages([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const term = `%${q}%`;

      try {
        // Parallel queries across Community Posts, Profiles, and Business Profiles
        const [postsRes, profsRes, businessRes] = await Promise.all([
          supabase
            .from("community_posts")
            .select("id, content, image_url, video_url, created_at, user_id, tags")
            .or(`content.ilike.${term}`)
            .order("created_at", { ascending: false })
            .limit(16),
          supabase
            .from("profiles")
            .select("user_id, display_name, business_name, business_slug, avatar_url, business_logo_url, industry, state")
            .or(`display_name.ilike.${term},email.ilike.${term}`)
            .limit(10),
          supabase
            .from("business_profiles")
            .select("id, business_name, description, logo_url, category, state")
            .ilike("business_name", `%${q}%`)
            .limit(10),
        ]);

        const rawPosts = postsRes.data || [];
        const authorIds = Array.from(new Set(rawPosts.map((p: any) => p.user_id)));
        const { data: authors } = authorIds.length
          ? await supabase.from("profiles").select("user_id, display_name, business_name, avatar_url, business_logo_url, business_slug").in("user_id", authorIds)
          : { data: [] };

        const authorMap = new Map((authors || []).map((a: any) => [a.user_id, a]));

        // Enrich posts
        const enrichedPosts: PostHit[] = rawPosts.map((p: any) => {
          const videoClass = p.video_url ? classifyVideoUrl(p.video_url) : null;
          const hasVideoInContent = p.content ? /youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|\.mp4/i.test(p.content) : false;
          const isVideo = Boolean(p.video_url || hasVideoInContent || videoClass?.isVideo);

          return {
            id: p.id,
            content: p.content,
            image_url: p.image_url,
            video_url: p.video_url,
            created_at: p.created_at,
            user_id: p.user_id,
            tags: p.tags,
            author: authorMap.get(p.user_id),
            isVideoPost: isVideo,
          };
        });

        setPosts(enrichedPosts);
        setVideos(enrichedPosts.filter((p) => p.isVideoPost));

        // Format People (individuals)
        const peopleHits: PersonHit[] = (profsRes.data || []).map((p: any) => ({
          id: p.user_id,
          name: p.display_name || "User",
          avatar: p.avatar_url || p.business_logo_url,
          subtitle: [p.industry, p.state].filter(Boolean).join(" · ") || "Community Member",
          slug: p.business_slug,
        }));
        setPeople(peopleHits);

        // Format Pages / Businesses
        const pageHits: PageHit[] = (businessRes.data || []).map((b: any) => ({
          id: b.id,
          name: b.business_name,
          logo: b.logo_url,
          industry: b.category,
          state: b.state,
          description: b.description,
          slug: b.id,
        }));
        setPages(pageHits);
      } catch (err) {
        console.warn("Facebook-style search error:", err);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  if (query.trim().length < 2) return null;

  const totalResults = posts.length + people.length + pages.length;

  return (
    <Card className="my-3 overflow-hidden rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#18191a] text-neutral-900 dark:text-neutral-100 shadow-2xl relative z-30">
      {/* Search Header with Facebook-style Categories Bar */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#242526] px-4 py-3">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-600 dark:text-neutral-300">
            <Search className="h-4 w-4 text-orange-500" />
            <span>Search Results for &ldquo;{query}&rdquo;</span>
          </div>
          <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
            {totalResults} {totalResults === 1 ? "result" : "results"} found
          </span>
        </div>

        {/* Categories Tab Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {[
            { key: "all", label: "All", count: totalResults },
            { key: "posts", label: "Posts", count: posts.length },
            { key: "videos", label: "Videos", count: videos.length },
            { key: "people", label: "People", count: people.length },
            { key: "pages", label: "Pages", count: pages.length },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveCategory(tab.key as SearchCategory)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                activeCategory === tab.key
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                  : "bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeCategory === tab.key
                    ? "bg-white/30 text-white"
                    : "bg-neutral-300 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Results Body */}
      <div className="p-3 sm:p-4 max-h-[70vh] overflow-y-auto space-y-4">
        {loading && (
          <div className="py-12 text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-orange-500" />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              Searching Facebook-style directory…
            </p>
          </div>
        )}

        {!loading && totalResults === 0 && (
          <div className="py-10 text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
              <Search className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
              No results found for &ldquo;{query}&rdquo;
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
              Check your spelling or try searching for a different keyword, person, or video topic.
            </p>
          </div>
        )}

        {/* 1. PEOPLE / USERS TAB OR IN ALL */}
        {!loading && (activeCategory === "all" || activeCategory === "people") && people.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-blue-500" /> People
              </span>
              {activeCategory === "all" && people.length > 3 && (
                <button
                  type="button"
                  onClick={() => setActiveCategory("people")}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  See all ({people.length})
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              {(activeCategory === "all" ? people.slice(0, 4) : people).map((person) => (
                <div
                  key={person.id}
                  onClick={() => navigate(person.slug ? `/b/${person.slug}` : `/user/${person.id}`)}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-[#242526] hover:bg-neutral-100 dark:hover:bg-[#303031] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-blue-500/10 shrink-0 border border-neutral-300 dark:border-neutral-700">
                      {person.avatar ? (
                        <img src={person.avatar} alt={person.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center font-bold text-blue-600">
                          {person.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {person.name}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                        {person.subtitle}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11px] font-bold rounded-lg shrink-0">
                    View
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. PAGES / BUSINESSES TAB OR IN ALL */}
        {!loading && (activeCategory === "all" || activeCategory === "pages") && pages.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5 text-orange-500" /> Pages & Businesses
              </span>
              {activeCategory === "all" && pages.length > 3 && (
                <button
                  type="button"
                  onClick={() => setActiveCategory("pages")}
                  className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  See all ({pages.length})
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              {(activeCategory === "all" ? pages.slice(0, 4) : pages).map((page) => (
                <div
                  key={page.id}
                  onClick={() => navigate(`/business/${page.id}`)}
                  className="flex items-start justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-[#242526] hover:bg-neutral-100 dark:hover:bg-[#303031] transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="h-10 w-10 rounded-xl overflow-hidden bg-orange-500/10 shrink-0 border border-neutral-300 dark:border-neutral-700">
                      {page.logo ? (
                        <img src={page.logo} alt={page.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center font-bold text-orange-600">
                          <Store className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-orange-600">
                        {page.name}
                      </p>
                      {page.industry && (
                        <Badge variant="outline" className="text-[9px] mt-0.5 border-orange-500/30 text-orange-600 dark:text-orange-400">
                          {page.industry}
                        </Badge>
                      )}
                      {page.description && (
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-1">
                          {page.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button size="sm" className="h-7 px-2.5 text-[11px] font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white shrink-0">
                    Visit
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. VIDEOS TAB */}
        {!loading && (activeCategory === "all" || activeCategory === "videos") && videos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <VideoIcon className="h-3.5 w-3.5 text-red-500" /> Videos
              </span>
              {activeCategory === "all" && videos.length > 2 && (
                <button
                  type="button"
                  onClick={() => setActiveCategory("videos")}
                  className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                >
                  See all ({videos.length})
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {(activeCategory === "all" ? videos.slice(0, 4) : videos).map((v) => (
                <div
                  key={v.id}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-[#242526] p-3 space-y-2 hover:border-red-500/40 transition-all"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">
                      {v.author?.business_name || v.author?.display_name || "Creator"}
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-500 border-red-500/30">
                      Video
                    </Badge>
                  </div>
                  {v.content && (
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-2">
                      {v.content}
                    </p>
                  )}
                  {v.video_url && (
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-red-600 dark:text-red-400 font-bold">
                      <Play className="h-3 w-3 fill-red-600" /> Watch Video on Feed
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. POSTS TAB OR IN ALL */}
        {!loading && (activeCategory === "all" || activeCategory === "posts") && posts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-emerald-500" /> Posts
              </span>
              {activeCategory === "all" && posts.length > 3 && (
                <button
                  type="button"
                  onClick={() => setActiveCategory("posts")}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  See all ({posts.length})
                </button>
              )}
            </div>

            <div className="space-y-2">
              {(activeCategory === "all" ? posts.slice(0, 5) : posts).map((post) => (
                <div
                  key={post.id}
                  className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-[#242526] hover:bg-neutral-100 dark:hover:bg-[#303031] transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-orange-500/10 font-bold flex items-center justify-center text-xs text-orange-600 overflow-hidden">
                        {post.author?.avatar_url ? (
                          <img src={post.author.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          (post.author?.display_name || "U").charAt(0)
                        )}
                      </div>
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {post.author?.business_name || post.author?.display_name || "Community Member"}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-800 dark:text-neutral-200 line-clamp-3 leading-relaxed">
                    {post.content}
                  </p>

                  {post.image_url && (
                    <div className="h-24 w-full rounded-lg overflow-hidden bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                      <img src={post.image_url} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Solid High-Contrast Footer */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-[#242526] px-4 py-2.5 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
        <span>Press <kbd className="px-1.5 py-0.5 rounded-sm bg-neutral-200 dark:bg-neutral-700 font-mono text-[10px]">Esc</kbd> or click outside to dismiss</span>
        <button
          type="button"
          onClick={onClose}
          className="font-bold text-orange-600 dark:text-orange-400 hover:underline"
        >
          Close Results
        </button>
      </div>
    </Card>
  );
};

export default CommunitySearchResults;
