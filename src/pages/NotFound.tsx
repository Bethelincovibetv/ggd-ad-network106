import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import MetaTags from "@/components/MetaTags";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("404: Non-existent route visited:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background text-foreground">
      <MetaTags
        title="Page Not Found (404) — GGD Ad Network"
        description="The page you were looking for could not be found."
        noindex
      />
      <div className="max-w-md w-full bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center mx-auto">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">404</h1>
          <p className="text-sm font-semibold text-foreground">Page not found</p>
          <p className="text-xs text-muted-foreground break-all">
            No page exists at <span className="font-mono">{location.pathname}</span>
          </p>
        </div>
        <Button asChild className="w-full h-10 rounded-xl font-bold bg-orange-600 hover:bg-orange-700 text-white">
          <Link to="/">
            <Home className="h-4 w-4 mr-2" /> Return to Home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
