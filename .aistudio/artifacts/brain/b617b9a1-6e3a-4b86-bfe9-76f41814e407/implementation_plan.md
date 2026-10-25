# Zero-Flash Feature Toggle State Persistence & Fallback Resilience

Eliminate initial state flickering and prevent switched-off toggles from resetting to enabled defaults during page loading, SSR hydration, or offline/database network fallbacks.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed during clarification and will govern the implementation:

- **Confirmed Decision 1**: Pre-seed initial feature toggle state synchronously from cached browser storage (`localStorage`) so that components initialize immediately with the saved state without any visual flash.
- **Confirmed Decision 2**: During offline network fallbacks or database lookup errors, retain the existing cached state in full instead of resetting to default `true` values or overwriting local storage with empty responses.

---

## 1. Overview & Core Concept

**What It Does**:
Ensures that any platform feature or menu item toggled **OFF** by administrators stays strictly **OFF** during every stage of the application lifecycle: initial page mount, async database fetching, network delay, and offline error fallbacks.

**Target Audience / Persona**:
Platform administrators and users who expect a consistent, flicker-free interface where disabled modules (e.g. ads, tasks, marketplace) remain completely hidden without transient flashes during loads or network retries.

---

## 2. User Experience & Visual Design

- **Zero-Flash Lifecycle**:
  1. On page boot, `useFeatureToggles` immediately reads synchronous `localStorage` cache into state before initial render.
  2. If a feature was disabled (`false`), `isEnabled(key)` returns `false` synchronously on frame 1.
  3. When Supabase responds with remote toggles, state is updated seamlessly via merge.
  4. If Supabase fails or returns an error, the cached state is preserved 100% without wiping local storage or resetting toggles to default `true`.
- **Interactive Micro-Interactions**:
  - Smooth, immediate UI updates when toggling features in `AdminFeatureToggles.tsx`.
  - Zero layout shift or flashing of hidden navigation items in `SideNavMenu.tsx` or `Dashboard.tsx`.

---

## 3. Key Technical Decisions & Trade-Offs

- **Decision 1: Persistent Cache Merging vs. Destructive Replacement**:
  - *Chosen Approach*: Merge fetched Supabase toggles into the existing local cache map, and ignore empty/error responses rather than overwriting `cache` with `{}`.
  - *Why*: Prevents network dropouts or database query errors from inadvertently resetting turned-off features to their default `true` state in the fallback handler.
- **Decision 2: Synchronous Local Cache Hydration**:
  - *Chosen Approach*: Load `localStorage` synchronously during module initialization before React hook execution.
  - *Why*: Guarantees React renders the first frame with saved toggles, completely eliminating visual hydration flashes.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser LocalStorage                      │
│                (ggd_feature_toggles_v1 cache)               │
└──────────────────────────────┬──────────────────────────────┘
                               │ Synchronous Init (Frame 1)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 useFeatureToggles React Hook                 │
│      (Immediate pre-seeded state from memory/storage)       │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               │ Async Fetch                  │ Instant State Read
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Supabase Remote DB      │ │    isFeatureEnabled Check  │
│      (feature_toggles)       │ │  (Strict false preservation│
└──────────────┬───────────────┘ │   for all gated components)│
               │ Merge (if ok)   └────────────────────────────┘
               ▼
┌──────────────────────────────┐
│  Notify Component Listeners  │
└──────────────────────────────┘
```

### Component & Hook Modifications
1. **`src/hooks/useFeatureToggles.ts`**:
   - Refactor `fetchToggles()` to safely merge fetched remote records into `cache` instead of replacing `cache` with empty arrays.
   - Guard against network/database errors so `localStorage` is never cleared on fetch failure.
   - Synchronously load `localStorage` into `cache` at file import time.
   - Ensure `isFeatureEnabled` strictly respects explicit `false` values in both memory cache and local storage.
2. **`src/lib/featureRegistry.ts`**:
   - Verify `isFeatureEnabled()` lookup hierarchy so that if any explicit toggle or alias is set to `false`, it returns `false` unconditionally.
