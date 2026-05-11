## Goals

1. Make ads display **randomly** across slots (no duplicates per page load).
2. Fix notification banner to be mobile-friendly.
3. Fix watermark text to **GGD AD NETWORK** everywhere.
4. Remove **Support** from footer/side menus; add a **top global search bar** (users, businesses, tasks, banners, marketing apps, syndicate tasks).
5. Banner advert + task integration: when a task is created with a banner, auto-generate a **smart share/redirect link**. Sharing produces a tracked URL → visitor lands on a 3–5 sec interstitial showing the banner → auto-redirects to the target. Clicks/impressions are logged for analytics.
6. Convert **Home tab** into the **Analytics & Dashboard overview** (KPIs, per-campaign performance, recent activity, wallet summary).
7. Properly redo the **Admin Portal colorful design** (was reportedly not applied).

---

## 1. Random Ad Rotation

- Update `AdDisplayRotator.tsx` and `AdRotator.tsx`:
  - Replace sequential `currentAdIndex` with a shuffled queue (Fisher–Yates).
  - Each rotator instance gets its own shuffled subset, so two slots on the same page show different ads.
  - Add an optional `slotId` prop; when multiple rotators mount, a shared module-level "used set" prevents the same ad appearing twice on a single page load. Reset on unmount/refresh.
- Update embed code in `AdRotator.tsx` (the snippet given to publishers) so the JS shuffles `ads` array client-side and picks per slot.

## 2. Notification Banner — Mobile-Friendly

- Audit `NotificationBell.tsx` and any toast/banner that overlays content.
- Constrain width with `max-w-[calc(100vw-2rem)]`, add `safe-area-inset` padding, position `top-2 right-2` on mobile, ensure z-index doesn't sit under the top nav. Make dismissable.

## 3. Watermark Fix

- Replace all "Powered by GGD Network" / "Ad by GGD Network" with **"GGD AD NETWORK"** in:
  - `AdDisplayRotator.tsx`
  - `AdRotator.tsx` (embed snippet, both occurrences)
  - `ApiDocumentation.tsx` (two occurrences)

## 4. Footer Cleanup + Top Search Bar

- Remove `support` entry from `MobileFooterMenu.tsx` and `SideNavMenu.tsx`.
- Add a new `GlobalSearchBar` component rendered in `TopNavMenu.tsx` (or above it). Sticky, full-width on mobile.
  - Debounced query → fetches in parallel from `profiles`, `business_profiles`, `tasks`, `ads` (banner adverts), `marketing_apps`, `syndicate_tasks`.
  - Drop-down result panel grouped by section with icons; clicking jumps to the relevant page.

## 5. Smart Share / Redirect Link System

**Database (migration):**
- New table `task_share_links`:
  - `slug` (unique short code), `task_id`, `sharer_user_id` (who shared), `clicks` int, `created_at`.
- New table `task_share_clicks`:
  - `share_link_id`, `created_at`, `referrer`, `user_agent`, `country`.
- RLS: owners and task creators can read their stats; anon can insert clicks; anon can read by slug (for landing page).

**Frontend:**
- New route `/s/:slug` → `SharePreviewPage.tsx`:
  - Fetches link + task (banner image, title, target URL).
  - Shows full banner with "Continuing in 5…" countdown, then `window.location.replace(target)`.
  - Logs a click row + increments counter.
  - Sets OG meta tags so social previews show the banner.
- Task share button: calls a helper that creates (or fetches existing) `task_share_links` row for `(task_id, sharer_user_id)` and copies `https://<host>/s/<slug>`.
- `BusinessTaskCreator.tsx`: when creating a task with a banner, persist the banner image on the task (uses existing `flyer_url`).

## 6. Home → Analytics & Dashboard Overview

- Refactor the Home tab content in `Dashboard.tsx` into `HomeDashboard.tsx`:
  - **KPI cards row**: Total clicks, impressions, credits spent (queries `ad_events`, `task_share_clicks`, wallet).
  - **Per-campaign performance list**: each ad/task with clicks, impressions, share count, status.
  - **Recent activity feed**: latest shares, completions, earnings (last 10).
  - **Wallet & credits summary**: balance + quick fund button.

## 7. Admin Portal Colorful Design (redo properly)

- Verify `AdminPanel.tsx` renders the gradient tabs (already coded). Ensure `AdminPage.tsx` (the wrapper route) actually mounts `AdminPanel`, not an older grey version.
- Replace any remaining grey backgrounds inside child admin components' headers (e.g., `AdminUserManager`, `AdminSettings`, `AdminFeatureToggles`, `AdminApiManager`) with matching gradient header strips so the colorful theme carries through inside each tab — not just the tab buttons.
- Add a colorful page header bar at the top of the admin route with gradient + icon + label so users immediately see the colorful redesign.

---

## Files Touched (summary)

**New**
- `src/components/GlobalSearchBar.tsx`
- `src/components/HomeDashboard.tsx`
- `src/pages/SharePreviewPage.tsx`
- migration: `task_share_links`, `task_share_clicks`

**Edited**
- `src/components/AdDisplayRotator.tsx`, `src/components/AdRotator.tsx` (random + watermark)
- `src/components/ApiDocumentation.tsx` (watermark)
- `src/components/NotificationBell.tsx` (mobile-friendly)
- `src/components/MobileFooterMenu.tsx`, `src/components/SideNavMenu.tsx` (remove Support)
- `src/components/TopNavMenu.tsx` (mount search bar)
- `src/components/Dashboard.tsx` (Home → HomeDashboard)
- `src/components/BusinessTaskCreator.tsx` + task share button (smart link generation)
- `src/App.tsx` (add `/s/:slug` route)
- `src/components/AdminPage.tsx` + selected admin children (colorful headers)
