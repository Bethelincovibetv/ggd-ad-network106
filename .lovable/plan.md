## Restore & Expand Referral System + Community Chat

### Phase 1: Database
- Add `referral_percentage` to `app_settings` (default 2)
- Add `referred_by_user_id` (uuid) to `profiles` for proper linkage
- Backfill `referral_code` for existing users (use short slug from user_id) via trigger update
- Update `handle_new_user()` to:
  - Auto-generate `referral_code` (e.g. first 8 chars of uid)
  - Capture referrer from `raw_user_meta_data->>'ref'` and link `referred_by_user_id`
- Create `referral_earnings` table: `id, referrer_id, referred_user_id, source ('fund'|'earn'), amount, credits_earned, created_at` with RLS (referrer can view own)
- Create `referral_messages` table for community chat between referrer ↔ referred member: `id, sender_id, receiver_id, message, is_read, created_at`, RLS so only the two parties involved (and admin) can read/send
- Trigger on `task_wallets` updates and `credit_transfers`/`profiles.credits` increments → insert referral earning + bump referrer's credits by X%

### Phase 2: Referral UI (new tab "Referrals" in dashboard nav)
- Show user's referral code + shareable link `https://site/?ref=CODE`
- Copy button + WhatsApp/social share
- Stats: total referred, total earned credits
- List of referred members (avatar, name, joined date, total contributed)
- Click member → opens community chat panel with that member

### Phase 3: Auth capture
- `AuthForm` reads `?ref=CODE` from URL, passes as `display_name` metadata + `ref` field on signup

### Phase 4: Admin setting
- `AdminSettings` adds input: "Referral % earned from referred member's activity" (writes `referral_percentage` to `app_settings`)

### Phase 5: Community chat component
- Reuse pattern from `AdminChatWidget`/`admin_chat_messages` but use `referral_messages`
- Realtime subscription on `referral_messages` filtered by current user

### Files to touch
- migration (new)
- `src/components/AuthForm.tsx` — capture ref param
- `src/components/Dashboard.tsx` + `TopNavMenu.tsx` — add Referrals tab
- new `src/components/ReferralsPage.tsx`
- new `src/components/ReferralChat.tsx`
- `src/components/AdminSettings.tsx` — % input
