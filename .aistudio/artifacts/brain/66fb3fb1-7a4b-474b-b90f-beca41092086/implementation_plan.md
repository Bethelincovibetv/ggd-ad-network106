# Comprehensive QA Audit & Full-Stack Remediation Plan

This plan establishes a complete, production-grade audit and remediation roadmap across all layers of the application, incorporating strict validation, crash resilience, and architectural preservation.

---

## 1. Audit Findings & Target Areas

### A. Frontend & Crash Resilience
- **Missing Global & Route Error Boundaries:** An uncaught runtime error in any child route or module causes a complete white screen collapse of the React tree. A resilient `ErrorBoundary` component with automatic reload and fallback recovery is needed in `src/App.tsx`.
- **Search UI Dismiss Action:** In `src/components/CommunityFeed.tsx`, the `CommunitySearchResults` component had its `onClose` prop omitted, preventing the "Close Results" button from clearing the search overlay.
- **Defensive Storage in View Tracking:** In `src/services/realtimeViewsService.ts`, direct `sessionStorage` calls need defensive guards for environments where storage access is restricted (e.g. private browsing or strict cookie sandboxes).

### B. Backend & API Validation Hardening
- **Link Preview Scraping Guardrails:** Ensure URL inputs in `/api/link-preview` reject localhost/private network IPs (SSRF protection) and enforce maximum payload sizes.
- **Upload File Validation:** Ensure `/api/upload` enforces MIME-type whitelist, maximum byte size boundaries, and sanitizes filenames before filesystem persistence.
- **Cloud SQL & In-Memory Synchronization:** Ensure view counters and chat endpoints handle transient database disconnections without throwing 500 errors to the client.

### C. Performance & Mobile UI
- **Zero-Pill and High-Contrast Search Overlays:** Ensure Facebook-style search tabs maintain solid, fully opaque contrast across both light and dark themes with full keyboard escape support.
- **Component Warning Cleanup:** Clean up empty catch blocks and fast-refresh warning patterns in high-traffic components.

---

## 2. Remediation Plan

### Phase 1: Application-Level Error Boundary
- Create `src/components/ErrorBoundary.tsx` styled to match the dark/light design system with clear error reporting and recovery buttons.
- Wrap `<Routes>` and lazy-loaded routes in `src/App.tsx` with `<ErrorBoundary>`.

### Phase 2: Search UI & Interaction Fixes
- Wire `onClose={() => setFilterQuery('')}` in `src/components/CommunityFeed.tsx`.
- Add an Escape key listener in `CommunitySearchResults.tsx` to dismiss search results immediately.

### Phase 3: Defensive Real-Time Views Service
- In `src/services/realtimeViewsService.ts`, add safe memory-fallback storage when `sessionStorage` is unavailable or throws.
- Ensure the live subscriber Map prevents memory leaks when components unmount.

### Phase 4: API & Security Hardening in `server.ts`
- Add SSRF protection in `/api/link-preview` to prevent requesting internal IP ranges (`127.0.0.1`, `10.*`, `192.168.*`, `169.254.*`).
- Add defensive file extension and size validation in `/api/upload`.
- Add robust fallback responses in `/api/posts/:id/view` so that any database downtime falls back to the in-memory cache transparently.

### Phase 5: Verification & Testing
- Run `npx tsc --noEmit` to verify type safety.
- Run `lint_applet` to verify zero fatal errors.
- Run `compile_applet` to confirm a successful build.
- Test server endpoints using `curl` to verify response codes and error handling.
