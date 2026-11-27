import React, { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import InstallPrompt from "./components/InstallPrompt";
import PushNotificationPrompt from "./components/PushNotificationPrompt";
import { CallProvider } from "@/contexts/CallContext";
import { IncomingCallBanner } from "@/components/call/IncomingCallBanner";
import { CallModal } from "@/components/call/CallModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import ActivationGateHost from "@/components/ActivationGateHost";

/**
 * Retries dynamic chunk imports on transient network/cache failures so navigating
 * to lazy-loaded routes (including Admin Portal) never shows a false page error.
 */
function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  chunkName: string
) {
  return lazy(async () => {
    const reloadKey = `ggd_chunk_retry_${chunkName}`;
    try {
      const mod = await importer();
      try {
        if (typeof window !== "undefined") {
          window.sessionStorage?.removeItem(reloadKey);
        }
      } catch {}
      return mod;
    } catch (err) {
      // Retry once immediately in case of transient network blip
      try {
        return await importer();
      } catch {
        // Reload once if a new build invalidated old hashed chunks
        try {
          if (typeof window !== "undefined" && !window.sessionStorage?.getItem(reloadKey)) {
            window.sessionStorage?.setItem(reloadKey, "1");
            window.location.reload();
            return await new Promise<never>(() => {});
          }
        } catch {}
        throw err;
      }
    }
  });
}

const AdminPage = lazyWithRetry(() => import("./components/AdminPage"), "AdminPage");
const BusinessDetailPage = lazyWithRetry(() => import("./pages/BusinessDetailPage"), "BusinessDetailPage");
const UserProfilePublicPage = lazyWithRetry(() => import("./pages/UserProfilePublicPage"), "UserProfilePublicPage");
const RedirectPage = lazyWithRetry(() => import("./pages/RedirectPage"), "RedirectPage");
const SyndicateRegister = lazyWithRetry(() => import("./pages/SyndicateRegister"), "SyndicateRegister");
const SharePreviewPage = lazyWithRetry(() => import("./pages/SharePreviewPage"), "SharePreviewPage");
const ProductDetailPage = lazyWithRetry(() => import("./pages/ProductDetailPage"), "ProductDetailPage");
const IndustryPage = lazyWithRetry(() => import("./pages/IndustryPage"), "IndustryPage");
const NotificationsDedicatedPage = lazyWithRetry(() => import("./pages/NotificationsDedicatedPage"), "NotificationsDedicatedPage");
const GuideDedicatedPage = lazyWithRetry(() => import("./pages/GuideDedicatedPage"), "GuideDedicatedPage");
const SupportDedicatedPage = lazyWithRetry(() => import("./pages/SupportDedicatedPage"), "SupportDedicatedPage");
const VixoraCreatorPage = lazyWithRetry(() => import("./pages/VixoraCreatorPage"), "VixoraCreatorPage");
const RedeemAirtimePage = lazyWithRetry(() => import("./pages/RedeemAirtimePage"), "RedeemAirtimePage");
const NotFound = lazyWithRetry(() => import("./pages/NotFound"), "NotFound");

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

/**
 * FeatureRoute: Gated Route Protector
 * If the feature toggle is disabled, securely redirects to homepage with zero content leak.
 */
const FeatureRoute = ({ feature, element }: { feature: string; element: React.ReactNode }) => {
  const { isEnabled, loading } = useFeatureToggles();
  if (loading) return <RouteFallback />;
  if (!isEnabled(feature)) {
    return <Navigate to="/" replace />;
  }
  return <>{element}</>;
};

const RouteErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={`${location.pathname}${location.search}`}>
      {children}
    </ErrorBoundary>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <CallProvider>
            <Toaster />
            <Sonner />
            <RouteErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/index" element={<Index />} />
                  <Route path="/dashboard" element={<Index />} />
                  <Route path="/auth" element={<Index />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/admin/*" element={<AdminPage />} />

                {/* Direct App Tab Destinations */}
                <Route path="/inbox" element={<Index initialTab="inbox" />} />
                <Route path="/chat" element={<Index initialTab="inbox" />} />
                <Route path="/messages" element={<Index initialTab="inbox" />} />
                <Route path="/wallet" element={<Index initialTab="wallet" />} />
                <Route path="/feed" element={<Index initialTab="feed" />} />
                <Route path="/community" element={<Index initialTab="feed" />} />
                <Route path="/tasks" element={<Index initialTab="tasks" />} />
                <Route path="/campaigns" element={<Index initialTab="campaigns" />} />
                <Route path="/directory" element={<Index initialTab="directory" />} />
                <Route path="/marketplace" element={<Index initialTab="marketplace" />} />
                <Route path="/favorites" element={<Index initialTab="favorites" />} />
                <Route path="/my-business" element={<Index initialTab="my-business" />} />

                {/* Business Directory & Storefronts */}
                <Route
                  path="/business/:id"
                  element={<FeatureRoute feature="business_directory" element={<BusinessDetailPage />} />}
                />
                <Route
                  path="/user/:id"
                  element={<UserProfilePublicPage />}
                />
                <Route
                  path="/b/:slug"
                  element={<UserProfilePublicPage />}
                />
                <Route
                  path="/industry/:slug"
                  element={<FeatureRoute feature="business_directory" element={<IndustryPage />} />}
                />
                <Route
                  path="/product/:id"
                  element={<FeatureRoute feature="products_services" element={<ProductDetailPage />} />}
                />

                {/* Smart Links */}
                <Route
                  path="/r/:slug"
                  element={<FeatureRoute feature="link_shortener" element={<RedirectPage />} />}
                />
                <Route
                  path="/s/:slug"
                  element={<FeatureRoute feature="link_shortener" element={<SharePreviewPage />} />}
                />

                {/* Airtime & Data Redemption */}
                <Route
                  path="/redeem"
                  element={<FeatureRoute feature="credit_airtime_redeem" element={<RedeemAirtimePage />} />}
                />
                <Route
                  path="/airtime"
                  element={<FeatureRoute feature="credit_airtime_redeem" element={<RedeemAirtimePage />} />}
                />
                <Route
                  path="/redeem-airtime"
                  element={<FeatureRoute feature="credit_airtime_redeem" element={<RedeemAirtimePage />} />}
                />

                {/* Syndicate Core Registration */}
                <Route path="/syndicate-register" element={<SyndicateRegister />} />
                <Route path="/notifications" element={<NotificationsDedicatedPage />} />
                <Route path="/guide" element={<GuideDedicatedPage />} />
                <Route path="/support" element={<SupportDedicatedPage />} />
                <Route path="/help" element={<SupportDedicatedPage />} />

                {/* Vixora AI Chat Routes */}
                {[
                  "/vixora",
                  "/vixora-creator",
                  "/creator",
                  "/studio",
                ].map(path => (
                  <Route
                    key={path}
                    path={path}
                    element={<FeatureRoute feature="vixora_ai_studio" element={<VixoraCreatorPage />} />}
                  />
                ))}

                  {/* Catch-All */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </RouteErrorBoundary>

            <InstallPrompt />
            <PushNotificationPrompt />
            <IncomingCallBanner />
            <CallModal />
            <ActivationGateHost />
          </CallProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
