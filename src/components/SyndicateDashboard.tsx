import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Download, Upload, Loader2, CheckCircle, Copy, ExternalLink, Wallet, Award } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import YouTubeEmbed from "@/components/YouTubeEmbed";

const SyndicateDashboard = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [tasksRes, assignmentsRes, profileRes, walletRes] = await Promise.all([
      supabase.from('syndicate_tasks').select('*').eq('status', 'active'),
      supabase.from('syndicate_task_assignments').select('*, syndicate_tasks(*)').eq('syndicate_user_id', user.id),
      supabase.from('syndicate_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('task_wallets').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    setTasks(tasksRes.data || []);
    setMyAssignments(assignmentsRes.data || []);
    setProfile(profileRes.data);
    setWallet(walletRes.data);
    setLoading(false);
  };

  const acceptTask = async (taskId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('syndicate_task_assignments').insert({
      task_id: taskId, syndicate_user_id: user.id,
    });

    if (error) {
      if (error.code === '23505') toast.info("Already accepted this task");
      else toast.error("Failed to accept task");
      return;
    }

    toast.success("Task accepted! Complete it to earn.");
    fetchData();
  };

  const downloadFlyer = async (flyerUrl: string, taskTitle: string) => {
    try {
      const response = await fetch(flyerUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${taskTitle.replace(/\s+/g, '_')}_flyer.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Flyer downloaded!");
    } catch {
      toast.error("Download failed, opening in new tab");
      window.open(flyerUrl, '_blank');
    }
  };

  const uploadProof = async (assignmentId: string, file: File) => {
    setUploading(assignmentId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(null); return; }

    // Get user profile for name
    const { data: userProfile } = await supabase.from('profiles').select('display_name, email').eq('user_id', user.id).maybeSingle();
    const userName = userProfile?.display_name || userProfile?.email?.split('@')[0] || 'unknown';
    const sanitizedName = userName.replace(/[^a-zA-Z0-9]/g, '_');

    const ext = file.name.split('.').pop();
    const fileName = `${user.id}/${sanitizedName}_${assignmentId}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('syndicate-proofs').upload(fileName, file, { upsert: true });
    if (uploadError) { toast.error("Upload failed: " + uploadError.message); setUploading(null); return; }

    const { data: { publicUrl } } = supabase.storage.from('syndicate-proofs').getPublicUrl(fileName);
    const { error: updateError } = await supabase.from('syndicate_task_assignments').update({
      proof_url: publicUrl,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    }).eq('id', assignmentId);

    if (updateError) { toast.error("Failed to submit proof"); setUploading(null); return; }

    toast.success("Proof submitted! Waiting for review.");
    setUploading(null);
    fetchData();
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  const assignedTaskIds = myAssignments.map(a => a.task_id);
  const availableTasks = tasks.filter(t => !assignedTaskIds.includes(t.id));

  return (
    <div className="space-y-4">
      {/* Syndicate Video */}
      <YouTubeEmbed section="syndicate" />

      {/* Syndicate Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <Award className="h-4 w-4 mx-auto mb-1 text-purple-600" />
            <div className="text-lg font-bold text-foreground">{profile?.ranking_score || 0}</div>
            <div className="text-[10px] text-muted-foreground">Rank</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-4 w-4 mx-auto mb-1 text-green-600" />
            <div className="text-lg font-bold text-foreground">{profile?.tasks_completed || 0}</div>
            <div className="text-[10px] text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <Wallet className="h-4 w-4 mx-auto mb-1 text-green-600" />
            <div className="text-lg font-bold text-foreground">₦{wallet?.balance || 0}</div>
            <div className="text-[10px] text-muted-foreground">Earnings</div>
          </CardContent>
        </Card>
      </div>

      {/* Verified Platforms */}
      {profile?.verified_platforms?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {profile.verified_platforms.map((p: string) => (
            <Badge key={p} className="text-[9px] bg-purple-100 text-purple-700">{p} ✓</Badge>
          ))}
        </div>
      )}

      {/* How It Works */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-3">
          <h4 className="font-bold text-xs text-blue-800 mb-1">📋 How to complete tasks</h4>
          <ol className="text-[10px] text-blue-700 space-y-0.5 list-decimal list-inside">
            <li>Copy the write-up & download the flyer</li>
            <li>Share exactly as instructed on the platform</li>
            <li>Take a screenshot as proof</li>
            <li>Upload proof & wait for approval</li>
          </ol>
        </CardContent>
      </Card>

      {/* My Active Assignments */}
      {myAssignments.length > 0 && (
        <>
          <h3 className="font-bold text-sm text-foreground">My Assignments</h3>
          <div className="space-y-2">
            {myAssignments.map(assignment => {
              const task = assignment.syndicate_tasks;
              if (!task) return null;
              return (
                <Card key={assignment.id} className={assignment.status === 'approved' ? 'border-green-200' : ''}>
                  <CardContent className="p-3 space-y-2">
                    {task.flyer_url && <img src={task.flyer_url} alt={task.title} className="w-full rounded-lg" />}
                    <h4 className="font-semibold text-xs text-foreground">{task.title}</h4>
                    <p className="text-[10px] text-muted-foreground">{task.description}</p>
                    
                    <div className="flex flex-wrap gap-1">
                      {(task.placements || []).map((p: string) => (
                        <Badge key={p} variant="secondary" className="text-[9px]">{p.replace(/_/g, ' ')}</Badge>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      {task.description && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => copyText(task.description)}>
                          <Copy className="h-3 w-3 mr-1" />Copy Text
                        </Button>
                      )}
                      {task.share_link && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => window.open(task.share_link, '_blank')}>
                          <ExternalLink className="h-3 w-3 mr-1" />Open Link
                        </Button>
                      )}
                      {task.flyer_url && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => window.open(task.flyer_url, '_blank')}>
                          <Download className="h-3 w-3 mr-1" />Flyer
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge className={
                        assignment.status === 'approved' ? 'bg-green-500' :
                        assignment.status === 'submitted' ? 'bg-yellow-500' :
                        assignment.status === 'rejected' ? 'bg-red-500' : 'bg-blue-500'
                      }>
                        {assignment.status}
                      </Badge>

                      {(assignment.status === 'accepted' || assignment.status === 'assigned') && (
                        <>
                          <input 
                            type="file" id={`proof-${assignment.id}`} accept="image/*" className="hidden"
                            onChange={e => e.target.files?.[0] && uploadProof(assignment.id, e.target.files[0])}
                          />
                          <Button size="sm" className="bg-green-600 text-white text-[10px]" disabled={uploading === assignment.id}
                            onClick={() => document.getElementById(`proof-${assignment.id}`)?.click()}>
                            {uploading === assignment.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                            Upload Proof
                          </Button>
                        </>
                      )}
                    </div>

                    {assignment.proof_url && (
                      <img src={assignment.proof_url} alt="Proof" className="w-full rounded-lg border" />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Available Tasks */}
      <h3 className="font-bold text-sm text-foreground">Available Tasks</h3>
      <div className="space-y-2">
        {availableTasks.map(task => (
          <Card key={task.id}>
            <CardContent className="p-3 space-y-2">
              {task.flyer_url && <img src={task.flyer_url} alt={task.title} className="w-full rounded-lg" />}
              <h4 className="font-semibold text-xs text-foreground">{task.title}</h4>
              <p className="text-[10px] text-muted-foreground line-clamp-2">{task.description}</p>
              <div className="flex flex-wrap gap-1">
                {(task.placements || []).map((p: string) => (
                  <Badge key={p} variant="secondary" className="text-[9px]">{p.replace(/_/g, ' ')}</Badge>
                ))}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-green-600 font-bold">₦{task.cost_per_syndicate}/task</span>
                <Button size="sm" className="bg-purple-600 text-white text-[10px]" onClick={() => acceptTask(task.id)}>
                  Accept Task
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {availableTasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No available tasks right now</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SyndicateDashboard;
