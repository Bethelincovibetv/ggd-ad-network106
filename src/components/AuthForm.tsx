import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Loader2, Users, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { captureAndGetReferralCode, ensureUserProfileAndReferral, resolveReferrerByCode } from '@/services/referralService';

interface AuthFormProps {
  onAuthSuccess: () => void;
}

const AuthForm = ({ onAuthSuccess }: AuthFormProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', displayName: '', ref: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [sponsorName, setSponsorName] = useState<string | null>(null);

  useEffect(() => {
    const activeRef = captureAndGetReferralCode();
    if (activeRef) {
      setFormData(prev => ({ ...prev, ref: activeRef }));
      resolveReferrerByCode(activeRef).then(sp => {
        if (sp) {
          setSponsorName(sp.display_name || sp.business_name || 'GGD Member');
        }
      });
    }
  }, []);

  const handleRefChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, ref: val }));
    if (val.trim().length >= 4) {
      const sp = await resolveReferrerByCode(val.trim());
      setSponsorName(sp ? (sp.display_name || sp.business_name || 'GGD Member') : null);
    } else {
      setSponsorName(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        if (signInData.user) {
          await ensureUserProfileAndReferral(signInData.user, undefined, formData.ref);
        }
        toast.success("Logged in successfully!");
        onAuthSuccess();
      } else {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              display_name: formData.displayName || formData.email.split('@')[0],
              ref: formData.ref || undefined,
            },
          },
        });
        if (error) throw error;
        if (signUpData.user) {
          await ensureUserProfileAndReferral(signUpData.user, formData.displayName, formData.ref);
        }
        toast.success("Account created! Check your email to verify.");
        onAuthSuccess();
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl border-0 bg-card">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {isLogin ? 'Sign in to manage your business & earnings' : 'Join GGD Ad Network today'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <form onSubmit={handleSubmit} className="space-y-3">
          {!isLogin && (
            <>
              <div>
                <Label htmlFor="displayName">Business or Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="e.g. Acme Stores or Jane Doe"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="ref">Referral Code (optional)</Label>
                  {sponsorName && (
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Sponsor: {sponsorName}
                    </span>
                  )}
                </div>
                <Input
                  id="ref"
                  placeholder="e.g. GGDXXXXXX"
                  value={formData.ref}
                  onChange={handleRefChange}
                  className="mt-1 font-mono uppercase"
                />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="mt-1"
            />
          </div>
          <div className="relative">
            <Label htmlFor="password">Password</Label>
            <div className="relative mt-1">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold h-10 shadow-md"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
              </>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </Button>
        </form>
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-orange-600 hover:text-orange-700 text-xs font-semibold"
          >
            {isLogin ? "Don't have an account? Sign up with referral" : "Already have an account? Sign in"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthForm;
