import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AuthFormProps {
  onAuthSuccess: () => void;
}

const AuthForm = ({ onAuthSuccess }: AuthFormProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const refFromUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ref') || '' : '';
  const [formData, setFormData] = useState({ email: '', password: '', displayName: '', ref: refFromUrl });
  const [isLoading, setIsLoading] = useState(false);

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
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        toast.success("Logged in successfully!");
        onAuthSuccess();
      } else {
        const { error } = await supabase.auth.signUp({
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
        toast.success("Account created! Check your email to verify.");
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
        <CardTitle className="text-2xl font-bold text-foreground">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          {isLogin ? 'Sign in to manage your ads' : 'Join GGD Ad Network'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input id="displayName" placeholder="Your name" value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="ref">Referral Code (optional)</Label>
                <Input id="ref" placeholder="Friend's code" value={formData.ref}
                  onChange={(e) => setFormData({ ...formData, ref: e.target.value })} className="mt-1" />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="mt-1" />
          </div>
          <div className="relative">
            <Label htmlFor="password">Password</Label>
            <div className="relative mt-1">
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="Min 6 characters"
                value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required className="pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white" disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : (isLogin ? 'Sign In' : 'Create Account')}
          </Button>
        </form>
        <div className="text-center">
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-orange-600 hover:text-orange-700 text-sm">
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthForm;
