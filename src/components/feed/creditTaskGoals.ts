import { Youtube, Timer, ThumbsUp, MessageSquare, UserPlus, Globe, Share2, type LucideIcon } from 'lucide-react';

/** Promotion goals for Credit Tasks. These reuse the existing `tasks` table
 *  (task_type column) — no new task system is introduced. */
export interface CreditTaskGoal {
  key: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  /** Requires a YouTube URL and renders the native in-feed player. */
  youtube: boolean;
  /** Requires the performer to watch for a duration before the reward unlocks. */
  timed?: boolean;
  urlLabel: string;
}

export const CREDIT_TASK_GOALS: CreditTaskGoal[] = [
  { key: 'youtube_views',    label: 'YouTube Views',      hint: 'Users watch your video in the feed',      icon: Youtube,       youtube: true,  timed: true,  urlLabel: 'YouTube video URL' },
  { key: 'youtube_watch',    label: 'YouTube Watch Time', hint: 'Users watch for a set duration',          icon: Timer,         youtube: true,  timed: true,  urlLabel: 'YouTube video URL' },
  { key: 'youtube_likes',    label: 'YouTube Likes',      hint: 'Users watch then like your video',        icon: ThumbsUp,      youtube: true,  timed: true,  urlLabel: 'YouTube video URL' },
  { key: 'youtube_comments', label: 'YouTube Comments',   hint: 'Users watch then comment',                icon: MessageSquare, youtube: true,  timed: true,  urlLabel: 'YouTube video URL' },
  { key: 'youtube_subscribe',label: 'YouTube Subscribers',hint: 'Users watch then subscribe',              icon: UserPlus,      youtube: true,  timed: true,  urlLabel: 'YouTube channel / video URL' },
  { key: 'website_visit',    label: 'Website Visits',     hint: 'Users visit your website or landing page',icon: Globe,         youtube: false, urlLabel: 'Website URL' },
  { key: 'share',            label: 'Social Media Shares',hint: 'Users share your link on social media',   icon: Share2,        youtube: false, urlLabel: 'Link to share' },
];

export const findGoal = (key?: string | null) =>
  CREDIT_TASK_GOALS.find(g => g.key === key) || null;

export const isYouTubeGoal = (key?: string | null) =>
  key === 'youtube' || !!findGoal(key)?.youtube;