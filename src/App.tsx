import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import AdminPage from "./components/AdminPage";
import BusinessDetailPage from "./pages/BusinessDetailPage";
import UserProfilePublicPage from "./pages/UserProfilePublicPage";
import RedirectPage from "./pages/RedirectPage";
import SyndicateRegister from "./pages/SyndicateRegister";
import SharePreviewPage from "./pages/SharePreviewPage";
import LeadCapturePage from "./pages/LeadCapturePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import IndustryPage from "./pages/IndustryPage";
import NotFound from "./pages/NotFound";
import AdminChatWidget from "./components/AdminChatWidget";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/business/:id" element={<BusinessDetailPage />} />
          <Route path="/user/:id" element={<UserProfilePublicPage />} />
          <Route path="/b/:slug" element={<UserProfilePublicPage />} />
          <Route path="/r/:slug" element={<RedirectPage />} />
          <Route path="/s/:slug" element={<SharePreviewPage />} />
          <Route path="/lead/:slug" element={<LeadCapturePage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/industry/:slug" element={<IndustryPage />} />
          <Route path="/syndicate-register" element={<SyndicateRegister />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <AdminChatWidget />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
