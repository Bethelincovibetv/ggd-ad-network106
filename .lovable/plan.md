
## Phase 1: Database Changes (Migration)
1. Create `business_categories` table with default Nigerian business categories
2. Add `category_id` column to `business_profiles`
3. Create `business_listings` table (products/services with free + featured options)
4. Add `paystack_public_key` and `paystack_enabled` columns to `business_profiles`
5. Add feature toggle rows for directory and Paystack features

## Phase 2: Admin UI Fixes
- Make admin nav background fully opaque with proper contrast
- Show full syndicate details (social channels, influence data) when viewing/converting users

## Phase 3: Business Directory & Categories
- Add category selection to business profile/vendor dashboard
- Build directory page with category filter
- Free product/service listings
- Featured listing with credit cost

## Phase 4: Business Detail Page
- Create `/business/:id` route showing full business profile
- WhatsApp, contact info, WhatsApp group, social links, products/services

## Phase 5: Paystack Integration
- Business enters their Paystack public key in vendor dashboard
- Admin toggle to enable/disable Paystack per business
- Platform-wide toggle for the feature
