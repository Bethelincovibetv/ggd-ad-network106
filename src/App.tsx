import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import AdminChatWidget from "./components/AdminChatWidget";
import InstallPrompt from "./components/InstallPrompt";
import PushNotificationPrompt from "./components/PushNotificationPrompt";
import { CallProvider } from "@/contexts/CallContext";
import { IncomingCallBanner } from "@/components/call/IncomingCallBanner";
import { CallModal } from "@/components/call/CallModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { Feature } from "@/lib/featureRegistry";

const AdminPage = lazy(() => import("./components/AdminPage"));
const BusinessDetailPage = lazy(() => import("./pages/BusinessDetailPage"));
const UserProfilePublicPage = lazy(() => import("./pages/UserProfilePublicPage"));
const RedirectPage = lazy(() => import("./pages/RedirectPage"));
const SyndicateRegister = lazy(() => import("./pages/SyndicateRegister"));
const SharePreviewPage = lazy(() => import("./pages/SharePreviewPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const IndustryPage = lazy(() => import("./pages/IndustryPage"));
const NotificationsDedicatedPage = lazy(() => import("./pages/NotificationsDedicatedPage"));
const GuideDedicatedPage = lazy(() => import("./pages/GuideDedicatedPage"));
const SupportDedicatedPage = lazy(() => import("./pages/SupportDedicatedPage"));
const VixoraCreatorPage = lazy(() => import("./pages/VixoraCreatorPage"));
const RedeemAirtimePage = lazy(() => import("./pages/RedeemAirtimePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

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

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <CallProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/admin" element={<AdminPage />} />

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

                {/* Syndicate Core Registration */}
                <Route path="/syndicate-register" element={<SyndicateRegister />} />
                <Route path="/notifications" element={<NotificationsDedicatedPage />} />
                <Route path="/guide" element={<GuideDedicatedPage />} />
                <Route path="/support" element={<SupportDedicatedPage />} />
                <Route path="/help" element={<SupportDedicatedPage />} />

                {/* Vixora AI Video Creator Routes */}
                {[
                  "/vixora",
                  "/vixora-creator",
                  "/creator",
                  "/studio",
                  "/autopilot",
                  "/voiceover",
                  "/scripts",
                  "/videos",
                  "/bgmusic",
                  "/tools",
                  "/growth",
                  "/contact",
                  "/coach",
                  "/developer",
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

            {/* Floating GGD AI Assistant / Support Widget (gated by ggd_ai_chat) */}
            <Feature name="ggd_ai_chat">
              <AdminChatWidget />
            </Feature>

            <InstallPrompt />
            <PushNotificationPrompt />
            <IncomingCallBanner />
            <CallModal />
          </CallProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
