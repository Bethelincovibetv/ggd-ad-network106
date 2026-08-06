import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import AdminChatWidget from "./components/AdminChatWidget";

const AdminPage = lazy(() => import("./components/AdminPage"));
const BusinessDetailPage = lazy(() => import("./pages/BusinessDetailPage"));
const UserProfilePublicPage = lazy(() => import("./pages/UserProfilePublicPage"));
const RedirectPage = lazy(() => import("./pages/RedirectPage"));
const SyndicateRegister = lazy(() => import("./pages/SyndicateRegister"));
const SharePreviewPage = lazy(() => import("./pages/SharePreviewPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const IndustryPage = lazy(() => import("./pages/IndustryPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/business/:id" element={<BusinessDetailPage />} />
          <Route path="/user/:id" element={<UserProfilePublicPage />} />
          <Route path="/b/:slug" element={<UserProfilePublicPage />} />
          <Route path="/r/:slug" element={<RedirectPage />} />
          <Route path="/s/:slug" element={<SharePreviewPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/industry/:slug" element={<IndustryPage />} />
          <Route path="/syndicate-register" element={<SyndicateRegister />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        <AdminChatWidget />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
