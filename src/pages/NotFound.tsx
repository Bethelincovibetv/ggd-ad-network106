import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  Home,
  ArrowLeft,
  Compass,
  Briefcase,
  Store,
  Sparkles,
  Megaphone,
  HelpCircle,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MetaTags from "@/components/MetaTags";
import AdDisplayPreview from "@/components/AdDisplayPreview";
import ggdLogo from "@/assets/ggd-logo.png";

const QUICK_DESTINATIONS = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, desc: "Overview & earnings" },
  { label: "Credit Tasks", to: "/tasks", icon: Briefcase, desc: "Earn GGG daily" },
  { label: "Marketplace", to: "/marketplace", icon: Store, desc: "Verified Nigerian stores" },
  { label: "Community Feed", to: "/feed", icon: Sparkles, desc: "Promos & updates" },
  { label: "Campaigns", to: "/campaigns", icon: Megaphone, desc: "Banner & social ads" },
  { label: "Help & Support", to: "/support", icon: HelpCircle, desc: "Get assistance" },
];

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.warn("404: Non-existent route visited:", location.pathname);
  }, [location.pathname]);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <MetaTags
        title="Page Not Found (404) — GGD Ad Network"
        description="The page you requested could not be found. Return to GGD Ad Network to explore campaigns, tasks, and the marketplace."
        noindex
      />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <img
              src={ggdLogo}
              alt="GGD Ad Network"
              className="h-8 w-8 rounded-xl object-cover border border-orange-500/30 shrink-0"
            />
            <span className="font-black text-sm tracking-tight truncate">
              GGD <span className="text-orange-500">AD NETWORK</span>
            </span>
          </Link>

          <nav aria-label="404 navigation" className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex rounded-xl text-xs font-semibold">
              <Link to="/marketplace">Marketplace</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex rounded-xl text-xs font-semibold">
              <Link to="/tasks">Tasks</Link>
            </Button>
            <Button asChild size="sm" className="rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white">
              <Link to="/">
                <Home className="h-3.5 w-3.5 mr-1.5" />
                Back to App
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <section className="rounded-3xl border border-border/80 bg-card shadow-xl overflow-hidden">
          <div className="p-6 sm:p-10 text-center space-y-6 bg-gradient-to-b from-orange-500/[0.07] via-transparent to-transparent">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-600 dark:text-orange-400 text-xs font-black uppercase tracking-wider">
              <Compass className="h-3.5 w-3.5" />
              Error 404 · Route Not Found
            </div>

            <div className="space-y-2 max-w-xl mx-auto">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
                We couldn&apos;t find that page
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                The address{" "}
                <code className="px-2 py-0.5 rounded-md bg-muted font-mono text-xs text-foreground break-all">
                  {location.pathname}
                </code>{" "}
                does not match any active route on GGD Ad Network. Jump back into the app below.
              </p>
            </div>

            {/* Primary Navigation CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto rounded-xl font-bold bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md px-6"
              >
                <Link to="/">
                  <Home className="h-4 w-4 mr-2" />
                  Return to App Home
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleGoBack}
                className="w-full sm:w-auto rounded-xl font-semibold px-6"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </div>

          {/* Quick Destinations Grid */}
          <div className="border-t border-border/60 bg-muted/20 p-5 sm:p-7">
            <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-3.5 text-center sm:text-left">
              Quick Navigation Inside GGD
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {QUICK_DESTINATIONS.map((dest) => (
                <Link
                  key={dest.to}
                  to={dest.to}
                  className="group flex items-center gap-3 p-3.5 rounded-2xl border border-border/70 bg-card hover:border-orange-500/40 hover:bg-orange-500/[0.04] transition-all"
                >
                  <div className="h-9 w-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <dest.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {dest.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{dest.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Active Banner Ad Unit */}
        <section aria-label="Sponsored Banner Advertisement" className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Megaphone className="h-3.5 w-3.5 text-orange-500" />
              Featured Network Sponsor
            </p>
            <Link
              to="/campaigns"
              className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline"
            >
              Promote your business →
            </Link>
          </div>
          <AdDisplayPreview />
        </section>
      </main>
    </div>
  );
};

export default NotFound;
