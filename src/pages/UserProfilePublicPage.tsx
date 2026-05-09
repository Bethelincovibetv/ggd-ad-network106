import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, MapPin, Award, CheckCircle, Loader2, Briefcase, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ggdLogo from '@/assets/ggd-logo.png';

const UserProfilePublicPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [syndicate, setSyndicate] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [p, s, b] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name, business_name, avatar_url, business_logo_url, business_description, created_at').eq('user_id', id).maybeSingle(),
        supabase.from('syndicate_profiles').select('*').eq('user_id', id).maybeSingle(),
        supabase.from('business_profiles').select('id, business_name, logo_url, description, is_directory_listed').eq('user_id', id).maybeSingle(),
      ]);
      setProfile(p.data);
      setSyndicate(s.data);
      setBusiness(b.data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-orange-50">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <p className="text-muted-foreground">User not found</p>
      <Button onClick={() => navigate('/')} variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
    </div>
  );

  const name = profile.display_name || profile.business_name || 'User';
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 dark:from-background dark:to-background">
      <header className="bg-card/90 backdrop-blur border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 text-xs">
            <ArrowLeft className="h-4 w-4" />Back
          </Button>
          <div className="flex items-center gap-2">
            <img src={ggdLogo} alt="GGD" className="h-6 w-6 rounded-lg" />
            <span className="text-sm font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">GGD Network</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-6 text-white text-center">
            <Avatar className="h-24 w-24 mx-auto border-4 border-white shadow-xl">
              <AvatarImage src={profile.avatar_url || profile.business_logo_url || ''} />
              <AvatarFallback className="bg-white text-orange-600 text-2xl font-black">{initials}</AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-black mt-3">{name}</h1>
            <div className="flex justify-center gap-1 flex-wrap mt-2">
              {syndicate && <Badge className="bg-white/20 text-white text-[10px] gap-0.5"><Award className="h-2.5 w-2.5" />Syndicate</Badge>}
              {business?.is_directory_listed && <Badge className="bg-white/20 text-white text-[10px] gap-0.5"><Briefcase className="h-2.5 w-2.5" />Business</Badge>}
            </div>
            {syndicate?.state && (
              <p className="text-xs opacity-90 mt-2 flex items-center justify-center gap-1">
                <MapPin className="h-3 w-3" />{syndicate.state}
              </p>
            )}
          </div>
        </Card>

        {syndicate && (
          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-purple-500" />Syndicate Stats</h2>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Score</p>
                  <p className="text-lg font-black text-foreground">{syndicate.ranking_score || 0}</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Done</p>
                  <p className="text-lg font-black text-foreground">{syndicate.tasks_completed || 0}</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Verified</p>
                  <p className="text-lg font-black text-foreground">{(syndicate.verified_platforms || []).length}</p>
                </div>
              </div>
              {(syndicate.verified_platforms || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {syndicate.verified_platforms.map((p: string) => (
                    <Badge key={p} variant="secondary" className="text-[10px] gap-0.5">
                      <CheckCircle className="h-2.5 w-2.5 text-green-500" />{p}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {business?.is_directory_listed && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <h2 className="text-sm font-bold flex items-center gap-2"><Briefcase className="h-4 w-4 text-orange-500" />Business</h2>
              <p className="text-sm font-semibold">{business.business_name}</p>
              {business.description && <p className="text-xs text-muted-foreground">{business.description}</p>}
              <Button size="sm" onClick={() => navigate(`/business/${business.id}`)} className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                View Business Page
              </Button>
            </CardContent>
          </Card>
        )}

        {profile.created_at && (
          <p className="text-center text-[10px] text-muted-foreground">
            Joined {new Date(profile.created_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
};

export default UserProfilePublicPage;
