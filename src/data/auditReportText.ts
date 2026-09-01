// Full Master GGD Ad Network Forensic Audit and GGD 2.0 Blueprint documentation

export const GGD_MASTER_AUDIT_REPORT = `# GGD AD NETWORK — COMPLETE MASTER TECHNICAL AUDIT & ARCHITECTURAL BLUEPRINT (GGD 2.0)

==================================================
1. EXECUTIVE SUMMARY
==================================================

The GGD Ad Network (Go Global Digital Ad Network) is a production-grade digital advertising, social task distribution ("Syndicate" / Share & Earn), watch-to-earn reward ecosystem, business directory marketplace, and community portal designed primarily for the Nigerian and African digital economies. It bridges local small and medium businesses (SMBs) with targeted audiences, web publishers, and social media promoters across WhatsApp, Facebook, Instagram, TikTok, and X (Twitter).

The repository (Bethelincovibetv/ggd-ad-network106) is a complete, scalable Single Page Application (SPA) built on React 18, TypeScript, Tailwind CSS, and Shadcn UI, backed by Supabase (PostgreSQL 15+, Row Level Security, Edge Functions, Realtime channels, Storage Buckets) with Paystack payment integration.

Core Capabilities Matrix:
• Display & Banner Advertising Engine: In-platform banners and external embeddable JavaScript widgets (/embed.js, /api-docs) delivering real-time impressions and click tracking with state-level geo-targeting (all 36 Nigerian States + FCT).
• Syndicate (Social Share & Earn) Engine: Businesses publish task campaigns with flyers, copy, and payout budgets; vetted syndicates claim tasks, share unique attribution links (/s/:slug), submit image proof & URLs, undergo business/admin approval, and receive direct bank transfer or wallet payouts.
• Watch-to-Earn Video Ads: Users watch YouTube video advertisements for a configured duration to claim credit rewards backed by advertiser budgets.
• Dual Wallet & Financial System: Virtual credits (for creating ads/tasks) and Task Wallets (Naira balances for task funding, creator rewards, and bank withdrawals). Integrated with Paystack for fiat on-ramp.
• Business Directory & Showcase: Profiles, digital business cards, product listings, category filters, and lead generation.
• AI & Content Suite: Integration with Google Gemini (geminiEbookService.ts, blogGenerator.ts, ai-campaign-assistant Edge Function) and Pixabay for automated campaign copy, ebooks, and blog content generation.
• Social Community & Realtime Comms: Community feed with posts, reactions, comments, global peer-to-peer (P2P) task chat, and direct admin support channels.
• Comprehensive Admin Control Center: Dynamic feature toggles (feature_toggles), global runtime settings (app_settings), user role management, ad/task moderation, withdrawal processing, and audit trails.

==================================================
2. CURRENT PLATFORM MAP (ARCHITECTURE & INVENTORY)
==================================================

Frontend:
• React 18 SPA (Vite + Tailwind CSS + Lucide Icons + Shadcn UI).
• State & Hooks: useRole, useSyndicateStatus, useAdminCheck, useFeatureToggles, useToast, useMobile.
• Service Layer: geminiEbookService.ts, blogGenerator.ts, pixabayService.ts.

Backend (Supabase Cloud):
• PostgreSQL DB (38+ Tables with granular RLS policies, triggers, and RPCs).
• Storage Buckets: ads, flyers, task-proofs, business-logos, community-posts, payment-proofs, slide-images.
• Edge Functions:
  - paystack-init: Initializes fiat checkout for credit/wallet purchases.
  - paystack-verify: Verifies Paystack transaction references and credits user balances.
  - claim-watch-reward: Validates and awards credits for completed video watches.
  - serve-ads: Public rotator delivering active banner ads and logging tracking beacons.
  - task-share: Social crawler OpenGraph meta tag renderer and 302 redirect for share links.
  - ad-network-api: External publisher REST API for ad delivery and telemetry.
  - ai-campaign-assistant: Gemini proxy for marketing copywriting.
  - generate-business-hero: Generates business branding graphics.
  - send-activity-email: Transactional notification email dispatcher.

==================================================
3. USER ROLES & ACCESS MODEL
==================================================

Roles (app_role enum):
1. user: Baseline registered user; can browse directory, watch reward ads, earn credits, fund wallet, create community posts, access P2P chat.
2. business: Default role assigned on registration via handle_new_user() trigger. Allows creating banner ads, video watch ads, directory listings, and syndicate marketing campaigns.
3. syndicate: Earner role granted after submitting KYC application (syndicate_profiles) and receiving admin approval (is_approved = true). Grants access to task assignments and bank withdrawal requests.
4. premium: Subscriber role with tiers (Tier 0: Free rolling 1-month; Tier 1–3: Paid; Tier 4: White-label). Grants lower fees, priority ad placement, AI tools access, and higher referral kickbacks.
5. moderator: Moderation staff with permissions to review ads, tasks, proofs, and community posts.
6. admin: Full administrative control; bypasses RLS policies via has_role(auth.uid(), 'admin').
7. co_owner: Partner equity tier with custom revenue share dashboard and network metrics.

==================================================
4. BUSINESS & ADVERTISING WORKFLOW
==================================================

Business Lifecycle:
Register -> Auto-generate business_slug -> Create Banner/Watch Ad or Syndicate Task -> Fund with Credits/Task Wallet -> Admin Approval -> Display/Rotator Delivery -> Real-time Click & Impression Tracking.

Syndicate Lifecycle:
Register & KYC (WhatsApp, Socials, Nigerian Bank Account) -> Admin Review & Approval -> Browse Tasks -> Claim Task (generates unique attribution shortlink /s/:slug) -> Post to Social Media -> Upload Screenshot Proof & Link -> Business/Admin Approval -> Task Wallet Credited -> Bank Withdrawal Request.

==================================================
5. FINANCIAL & ESCROW ARCHITECTURE
==================================================

Dual Currency Architecture:
1. Virtual Credits (profiles.credits): Used for purchasing banner ad impressions and watch-to-earn rewards. Exchange rate configured via app_settings.credit_exchange_rate (default 100 Naira per credit).
2. Naira Task Wallet (task_wallets.balance): Holds cash value for funding syndicate tasks and receiving task compensation. Supports Paystack deposits and bank withdrawals.

Escrow Locking & Settlement:
• When a business creates a campaign: Total budget is locked in task_wallets.pending_balance.
• When a syndicate submits verified proof and it is approved: Platform retains configured margin (default 30%) and credits earner wallet with net payout (70%).
• When a withdrawal is requested: Funds deduct from task_wallets.balance into withdrawal_requests for admin bank transfer.

==================================================
6. "HIRE ME" PROMOTER MARKETPLACE GAP ANALYSIS
==================================================

• Promoter Profile: PARTIALLY IMPLEMENTED (Social handles and stats stored in syndicate_profiles; lacks dedicated portfolio showcase).
• Promoter Discovery / Directory: PARTIALLY IMPLEMENTED (Public profile route /b/:slug exists; lacks dedicated promoter search/filter grid).
• Promoter Custom Pricing Packages: NOT IMPLEMENTED (Currently fixed advertiser-set rewards).
• "Hire Me" 1-on-1 Contract Request: NOT IMPLEMENTED (Needs direct business-to-promoter hiring flow).
• Direct Escrow Agreement: PARTIALLY IMPLEMENTED (Task wallet holds exist; needs 1-to-1 milestone bindings).
• Promoter Ratings & Reviews: PARTIALLY IMPLEMENTED (ReviewManager exists; needs binding to promoter profiles).

==================================================
7. PAYSTACK AUTOMATIC PAYOUT ARCHITECTURAL BLUEPRINT
==================================================

Intended Flow:
1. Bank Account Recipient Creation: Call Paystack /transferrecipient on syndicate KYC approval to store recipient_code.
2. Withdrawal Request: Syndicate requests withdrawal; system locks funds.
3. Automation Router (Based on app_settings.auto_payout_enabled):
   - If OFF: Admin manually processes transfer.
   - If ON: Invokes Edge Function calling Paystack /transfer API with idempotency reference.
4. Webhook Processing: Paystack transfer.success marks request completed; transfer.failed restores funds to user wallet.

==================================================
8. DATABASE RELATIONSHIP SUMMARY (38 TABLES)
==================================================

• Auth & Users: auth.users, profiles, user_roles, user_email_preferences.
• Financial & Wallets: task_wallets, credit_transactions, credit_transfers, withdrawal_requests, co_owner_shares, co_owner_payouts.
• Advertising: ads, ad_events, ad_watch_claims, api_keys, slides.
• Syndicate & Tasks: syndicate_profiles, syndicate_tasks, syndicate_task_assignments, task_share_links, task_link_clicks, tasks.
• Directory & Commerce: business_listings, business_categories, business_profiles, business_addons, user_addon_purchases, marketing_apps, user_app_redemptions.
• Social & Comms: community_posts, post_comments, post_reactions, emoji_reactions, p2p_messages, admin_chat_messages.
• System & Moderation: app_settings, feature_toggles, notifications, audit_logs, referral_rewards.

==================================================
9. GGD 2.0 FINAL IMPLEMENTATION ROADMAP
==================================================

PHASE 1 (Preserve & Secure Baseline):
• Maintain existing working banner ad rotator, watch-to-earn engine, Paystack on-ramp, and community feed.
• Secure RPC balance mutations with column-level restrictions.

PHASE 2 (Automated Paystack Payouts):
• Deploy Paystack transfer recipient creation and instant webhook-verified bank transfers.
• Add toggle in Admin Settings for Automatic Payouts (ON/OFF).

PHASE 3 ("Hire Me" Marketplace):
• Create dedicated Promoter Directory with category/state filters and custom pricing packages.
• Implement 1-on-1 milestone escrow contracts.

PHASE 4 (AI Proof Verification):
• Deploy Gemini Vision in Edge runtime to auto-audit proof screenshots for required hashtags and flyer imagery.

PHASE 5 (Future Bethelincovibe TV Integration):
• Expose external campaign synchronization API and interactive TV QR placement tokens.

==================================================
END OF AUDIT REPORT
==================================================`;
