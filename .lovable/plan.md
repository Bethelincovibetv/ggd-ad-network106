# Plan

## 1. Sidebar toggle button (top-left)
- Make it bigger (h-11 w-11), gradient orange background, rounded-xl, shadow, white icon. Replace the small ghost icon in `TopNavMenu.tsx` (or wherever the menu trigger lives).

## 2. Admin toggle for Co-Owner visibility
- Add `co_owner_visible` feature toggle row.
- Wire `CoOwnerUpgradeForm` and any co-owner CTA to hide when `is_feature_enabled('co_owner_visible')` is false (use existing `useFeatureToggles` hook).

## 3. State selection (Nigerian states list)
- Profile: replace free-text state input in `BusinessProfileWizard` / profile edit with a `<Select>` populated from `NIGERIAN_STATES`.
- Add `state` column on `profiles` if not already there (check first).

## 4. Target state for normal ads
- Migration: add `target_state text` column to `ads` table.
- `AdCreationForm`: add a "Target State" Select (with "All Nigeria" option).
- `serve-ads` edge function: accept `?state=` query param and filter ads by `target_state IS NULL OR target_state = state`.
- `AdDisplayRotator`: pass user's profile state when fetching.

## 5. Improve normal advert verification
- In `AdminAdManager`: stronger pending-ad review UI — preview image, target URL, click-through test link, target state, advertiser info, approve/reject with reason.
- Add `rejection_reason` column to ads if missing.
- New ads default to `is_active = false` until admin approves.

## 6. YouTube Watch Ads (new ad type)
- Migration: add columns to `ads`: `ad_type text default 'banner'`, `youtube_url text`, `watch_duration_seconds int`, `reward_credits int`.
- `AdCreationForm`: add "Watch Video" tab → YouTube URL + required watch duration + reward credits per view; cost = duration * views budget (computed).
- New component `WatchVideoAd.tsx`: embeds YouTube IFrame Player API, tracks playback time, when `currentTime >= watch_duration_seconds` calls edge function `claim-watch-reward` to credit user (one claim per user per ad).
- Edge function `claim-watch-reward`: verifies auth, checks no prior claim in `ad_watch_claims` table, credits user, decrements ad budget.
- New table `ad_watch_claims (id, ad_id, user_id unique pair, claimed_at)`.
- Surface watch ads in feed/tasks list under a "Watch & Earn" section.

## Technical notes
- All schema via new migration file.
- RLS: `ad_watch_claims` insert by authenticated, select own.
- Reuse `NIGERIAN_STATES` constant for both profile and ad targeting.
- Keep design tokens (no hard-coded colors).

## Out of scope
- YouTube anti-cheat beyond IFrame Player API time check (mark as v1).
- Backfilling existing ads' state/type (defaults handle it).
