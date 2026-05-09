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
import NotFound from "./pages/NotFound";

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
          <Route path="/r/:slug" element={<RedirectPage />} />
          <Route path="/syndicate-register" element={<SyndicateRegister />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
