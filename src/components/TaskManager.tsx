import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  ClipboardList, Plus, Trash2, Edit3, ExternalLink,
  Coins, Users, CheckCircle2, Play, Pause, Eye,
  Share2, Image as ImageIcon, Search, RefreshCw, Loader2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CreditTask {
  id: string;
  title: string;
  description: string | null;
  reward_credits: number | null;
  task_type: string | null;
  share_url: string | null;
  flyer_url: string | null;
  max_completions: number;
  completions_count: number;
  is_active: boolean | null;
  funded: boolean;
  creator_id: string | null;
  created_at: string;
}

const CREDIT_PRESETS = [5, 10, 15, 20, 50, 100];

const TaskManager = () => {
  const [tasks, setTasks] = useState<CreditTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'share' | 'video'>('all');

  // Create form state
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    reward_credits: '5',
    task_type: 'share' as 'share' | 'video',
    share_url: '',
    flyer_url: '',
    max_completions: '100',
    is_unlimited: false,
  });

  // Edit dialog state
  const [editingTask, setEditingTask] = useState<CreditTask | null>(null);
  const [updating, setUpdating] = useState(false);

  // Delete dialog state
  const [taskToDelete, setTaskToDelete] = useState<CreditTask | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks((data as CreditTask[]) || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch credit tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const ext = file.name.split('.').pop();
      const fileName = `credit-tasks/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const { error } = await supabase.storage
        .from('task-flyers')
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (error) {
        // Fallback to slide-images if task-flyers bucket fails
        const { error: altErr } = await supabase.storage
          .from('slide-images')
          .upload(fileName, file, { upsert: true });
        if (altErr) throw altErr;
        const { data } = supabase.storage.from('slide-images').getPublicUrl(fileName);
        if (isEdit && editingTask) {
          setEditingTask({ ...editingTask, flyer_url: data.publicUrl });
        } else {
          setNewTask(prev => ({ ...prev, flyer_url: data.publicUrl }));
        }
      } else {
        const { data } = supabase.storage.from('task-flyers').getPublicUrl(fileName);
        if (isEdit && editingTask) {
          setEditingTask({ ...editingTask, flyer_url: data.publicUrl });
        } else {
          setNewTask(prev => ({ ...prev, flyer_url: data.publicUrl }));
        }
      }
      toast.success("Task flyer uploaded");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const createTask = async () => {
    if (!newTask.title.trim()) {
      toast.error("Task title is required");
      return;
    }
    const rewardCredits = parseInt(newTask.reward_credits, 10);
    if (isNaN(rewardCredits) || rewardCredits <= 0) {
      toast.error("Please enter a valid credit reward (minimum 1)");
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        title: newTask.title.trim(),
        description: newTask.description.trim() || null,
        reward_credits: rewardCredits,
        task_type: newTask.task_type,
        share_url: newTask.share_url.trim() || null,
        flyer_url: newTask.flyer_url.trim() || null,
        max_completions: newTask.is_unlimited ? 999999 : (parseInt(newTask.max_completions, 10) || 100),
        is_active: true,
        funded: true,
      });

      if (error) throw error;

      toast.success("Credit task created successfully!");
      setNewTask({
        title: '',
        description: '',
        reward_credits: '5',
        task_type: 'share',
        share_url: '',
        flyer_url: '',
        max_completions: '100',
        is_unlimited: false,
      });
      setShowCreateCard(false);
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message || "Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const saveEditedTask = async () => {
    if (!editingTask) return;
    if (!editingTask.title.trim()) {
      toast.error("Task title cannot be empty");
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: editingTask.title.trim(),
          description: editingTask.description ? editingTask.description.trim() : null,
          reward_credits: Number(editingTask.reward_credits) || 5,
          task_type: editingTask.task_type,
          share_url: editingTask.share_url ? editingTask.share_url.trim() : null,
          flyer_url: editingTask.flyer_url ? editingTask.flyer_url.trim() : null,
          max_completions: Number(editingTask.max_completions) || 100,
          is_active: editingTask.is_active,
        })
        .eq('id', editingTask.id);

      if (error) throw error;

      toast.success("Credit task updated");
      setEditingTask(null);
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message || "Failed to update task");
    } finally {
      setUpdating(false);
    }
  };

  const toggleTaskActive = async (task: CreditTask) => {
    const nextState = !task.is_active;
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_active: nextState })
        .eq('id', task.id);

      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_active: nextState } : t));
      toast.success(nextState ? "Task activated" : "Task paused");
    } catch {
      toast.error("Failed to change task status");
    }
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskToDelete.id);

      if (error) throw error;
      toast.success("Task deleted");
      setTaskToDelete(null);
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete task");
    } finally {
      setDeleting(false);
    }
  };

  // KPIs
  const totalTasks = tasks.length;
  const activeTasks = tasks.filter(t => t.is_active !== false).length;
  const pausedTasks = totalTasks - activeTasks;
  const totalCompletions = tasks.reduce((sum, t) => sum + (t.completions_count || 0), 0);
  const totalCreditsAllocated = tasks.reduce((sum, t) => sum + ((t.reward_credits || 5) * (t.completions_count || 0)), 0);

  // Filtered tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
      (t.share_url && t.share_url.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? t.is_active !== false :
      t.is_active === false;

    const matchesType =
      typeFilter === 'all' ? true :
      typeFilter === 'share' ? (t.task_type === 'share' || !t.task_type) :
      (t.task_type === 'video' || t.task_type === 'youtube');

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            Credit Task Management
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Admin console for managing community reward tasks. Users complete tasks to earn GGD Credits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTasks}
            disabled={loading}
            className="rounded-xl h-9 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateCard(!showCreateCard)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 text-xs font-bold shadow-md"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {showCreateCard ? 'Close Form' : 'New Credit Task'}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/60 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
          <CardContent className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Tasks</p>
            <p className="text-2xl font-black text-foreground mt-0.5">{totalTasks}</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">{activeTasks} currently active</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
          <CardContent className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Tasks</p>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{activeTasks}</p>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">{pausedTasks} paused</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
          <CardContent className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Completions</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{totalCompletions}</p>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">Community user actions</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent">
          <CardContent className="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Credits Distributed</p>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">{totalCreditsAllocated.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">Rewarding community</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Task Card */}
      {showCreateCard && (
        <Card className="border-emerald-500/40 bg-card shadow-lg rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Plus className="h-4 w-4" /> Create New Credit Task
            </h3>
            <p className="text-xs text-emerald-100 mt-0.5">
              Launch a community credit task with custom instructions, reward credits, and target link.
            </p>
          </div>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-bold text-foreground">Task Title *</Label>
                  <Input
                    placeholder="e.g., Share GGD Mobile App on WhatsApp Status"
                    value={newTask.title}
                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                    className="h-10 text-xs rounded-xl mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground">Task Type</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Button
                      type="button"
                      variant={newTask.task_type === 'share' ? 'default' : 'outline'}
                      onClick={() => setNewTask({ ...newTask, task_type: 'share' })}
                      className={`h-9 text-xs rounded-xl ${newTask.task_type === 'share' ? 'bg-emerald-600 text-white font-bold' : ''}`}
                    >
                      <Share2 className="h-3.5 w-3.5 mr-1.5" /> 📢 Share Task
                    </Button>
                    <Button
                      type="button"
                      variant={newTask.task_type === 'video' ? 'default' : 'outline'}
                      onClick={() => setNewTask({ ...newTask, task_type: 'video' })}
                      className={`h-9 text-xs rounded-xl ${newTask.task_type === 'video' ? 'bg-red-600 text-white font-bold' : ''}`}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" /> ▶️ Video / Watch
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground">Reward Amount (Credits) *</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Credits"
                      value={newTask.reward_credits}
                      onChange={e => setNewTask({ ...newTask, reward_credits: e.target.value })}
                      className="h-10 text-xs rounded-xl w-32 font-bold text-emerald-600"
                    />
                    <div className="flex flex-wrap gap-1">
                      {CREDIT_PRESETS.map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewTask({ ...newTask, reward_credits: p.toString() })}
                          className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-bold transition ${
                            newTask.reward_credits === p.toString()
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          +{p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">Max Completions (Slots)</Label>
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTask.is_unlimited}
                        onChange={e => setNewTask({ ...newTask, is_unlimited: e.target.checked })}
                        className="rounded"
                      />
                      Unlimited
                    </label>
                  </div>
                  {!newTask.is_unlimited && (
                    <Input
                      type="number"
                      min="1"
                      placeholder="100"
                      value={newTask.max_completions}
                      onChange={e => setNewTask({ ...newTask, max_completions: e.target.value })}
                      className="h-10 text-xs rounded-xl mt-1"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-bold text-foreground">Instructions & Description</Label>
                  <Textarea
                    placeholder="Provide clear steps for users: e.g., Copy the link below and share to at least 2 active WhatsApp groups, then confirm."
                    value={newTask.description}
                    onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                    className="h-20 text-xs rounded-xl mt-1 resize-none"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground">Target Link / Share URL</Label>
                  <Input
                    placeholder="https://..."
                    value={newTask.share_url}
                    onChange={e => setNewTask({ ...newTask, share_url: e.target.value })}
                    className="h-10 text-xs rounded-xl mt-1 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground">Flyer / Image Banner</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      placeholder="Paste image URL or upload..."
                      value={newTask.flyer_url}
                      onChange={e => setNewTask({ ...newTask, flyer_url: e.target.value })}
                      className="h-10 text-xs rounded-xl flex-1 font-mono text-[11px]"
                    />
                    <label className="shrink-0 cursor-pointer">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingImage}
                        className="h-10 rounded-xl text-xs"
                        asChild
                      >
                        <span>
                          {uploadingImage ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ImageIcon className="h-3.5 w-3.5 mr-1" />
                          )}
                          Upload
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleFileUpload(e, false)}
                      />
                    </label>
                  </div>
                  {newTask.flyer_url && (
                    <div className="mt-2 relative rounded-xl overflow-hidden border border-border/60 max-h-28 bg-muted/20 flex items-center justify-center">
                      <img
                        src={newTask.flyer_url}
                        alt="Preview"
                        className="max-h-28 object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setNewTask({ ...newTask, flyer_url: '' })}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 text-[10px] hover:bg-black"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button
                variant="ghost"
                onClick={() => setShowCreateCard(false)}
                className="h-10 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={createTask}
                disabled={creating}
                className="h-10 rounded-xl text-xs font-bold px-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                Publish Credit Task
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tasks by title, instructions, or link..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 pl-9 text-xs rounded-xl bg-muted/20"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center bg-secondary/50 p-0.5 rounded-xl text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition text-[11px] ${
                statusFilter === 'all' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg font-bold transition text-[11px] ${
                statusFilter === 'active' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('paused')}
              className={`px-3 py-1.5 rounded-lg font-bold transition text-[11px] ${
                statusFilter === 'paused' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
              }`}
            >
              Paused
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex items-center bg-secondary/50 p-0.5 rounded-xl text-xs">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition text-[11px] ${
                typeFilter === 'all' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter('share')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition text-[11px] ${
                typeFilter === 'share' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
              }`}
            >
              📢 Share
            </button>
            <button
              onClick={() => setTypeFilter('video')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition text-[11px] ${
                typeFilter === 'video' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
              }`}
            >
              ▶️ Video
            </button>
          </div>
        </div>
      </div>

      {/* Task Cards List */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="h-7 w-7 animate-spin mx-auto text-emerald-600" />
          <p className="text-xs text-muted-foreground mt-2">Loading credit tasks catalogue...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-muted/10 p-10 text-center rounded-2xl">
          <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm font-bold text-foreground">No credit tasks found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {search ? 'Try clearing your search query or filters' : 'Click "New Credit Task" above to publish community tasks'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => {
            const isActive = task.is_active !== false;
            const isVideo = task.task_type === 'video' || task.task_type === 'youtube';
            const completions = task.completions_count || 0;
            const max = task.max_completions || 100;
            const progressPercent = Math.min(100, Math.round((completions / max) * 100));

            return (
              <Card
                key={task.id}
                className={`border transition-all rounded-2xl overflow-hidden hover:shadow-md ${
                  !isActive ? 'bg-muted/30 border-dashed border-border/60 opacity-80' : 'bg-card border-border/70 shadow-xs'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Flyer / Icon + Info */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {task.flyer_url ? (
                        <div className="h-16 w-16 rounded-xl overflow-hidden border border-border/60 bg-muted/30 shrink-0 flex items-center justify-center">
                          <img
                            src={task.flyer_url}
                            alt={task.title}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div
                          className={`h-16 w-16 rounded-xl flex items-center justify-center shrink-0 ${
                            isVideo
                              ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isVideo ? <Eye className="h-7 w-7" /> : <Share2 className="h-7 w-7" />}
                        </div>
                      )}

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-foreground truncate">{task.title}</h4>
                          <Badge
                            className={`text-[9px] font-bold border-0 ${
                              isVideo
                                ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isVideo ? '▶️ Video' : '📢 Share'}
                          </Badge>
                          <Badge
                            className={`text-[9px] font-bold border-0 ${
                              isActive
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {isActive ? 'Active' : 'Paused'}
                          </Badge>
                        </div>

                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 pt-1 flex-wrap text-[11px]">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Coins className="h-3 w-3" /> +{task.reward_credits || 5} Credits
                          </span>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {completions} {max >= 999999 ? 'completed (unlimited)' : `/ ${max} completed (${progressPercent}%)`}
                          </span>
                          {task.share_url && (
                            <a
                              href={task.share_url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-blue-500 hover:text-blue-600 flex items-center gap-1 font-mono text-[10px]"
                            >
                              <ExternalLink className="h-3 w-3" /> Link
                            </a>
                          )}
                          <span className="text-muted-foreground/60 text-[10px]">
                            Created: {new Date(task.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Mini progress bar */}
                        {max < 999999 && (
                          <div className="w-full max-w-xs bg-muted/60 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div
                              className="bg-emerald-600 h-full rounded-full transition-all"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleTaskActive(task)}
                        className="h-8 text-xs rounded-xl font-semibold"
                      >
                        {isActive ? (
                          <>
                            <Pause className="h-3.5 w-3.5 mr-1 text-amber-500" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Activate
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingTask(task)}
                        className="h-8 text-xs rounded-xl font-semibold"
                      >
                        <Edit3 className="h-3.5 w-3.5 mr-1 text-blue-500" /> Edit
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setTaskToDelete(task)}
                        className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Task Modal */}
      <Dialog open={!!editingTask} onOpenChange={open => !open && setEditingTask(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-primary" /> Edit Credit Task
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update task title, credit payout, target URL, or completion capacity.
            </DialogDescription>
          </DialogHeader>

          {editingTask && (
            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label className="text-xs font-bold">Title *</Label>
                <Input
                  value={editingTask.title}
                  onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="h-9 text-xs rounded-xl mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Description / Instructions</Label>
                <Textarea
                  value={editingTask.description || ''}
                  onChange={e => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="h-20 text-xs rounded-xl mt-1 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold">Reward Credits</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editingTask.reward_credits || 5}
                    onChange={e => setEditingTask({ ...editingTask, reward_credits: parseInt(e.target.value, 10) || 1 })}
                    className="h-9 text-xs rounded-xl mt-1 font-bold text-emerald-600"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Max Completions</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editingTask.max_completions || 100}
                    onChange={e => setEditingTask({ ...editingTask, max_completions: parseInt(e.target.value, 10) || 100 })}
                    className="h-9 text-xs rounded-xl mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold">Target Link (Share URL)</Label>
                <Input
                  value={editingTask.share_url || ''}
                  onChange={e => setEditingTask({ ...editingTask, share_url: e.target.value })}
                  className="h-9 text-xs rounded-xl mt-1 font-mono text-[11px]"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Flyer Image URL</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={editingTask.flyer_url || ''}
                    onChange={e => setEditingTask({ ...editingTask, flyer_url: e.target.value })}
                    className="h-9 text-xs rounded-xl flex-1 font-mono text-[11px]"
                  />
                  <label className="shrink-0 cursor-pointer">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingImage}
                      className="h-9 rounded-xl text-xs"
                      asChild
                    >
                      <span>
                        <ImageIcon className="h-3 w-3 mr-1" /> Upload
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleFileUpload(e, true)}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <Label className="text-xs font-bold cursor-pointer">Task Status (Active)</Label>
                <Button
                  type="button"
                  variant={editingTask.is_active ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditingTask({ ...editingTask, is_active: !editingTask.is_active })}
                  className={`h-8 rounded-xl text-xs ${editingTask.is_active ? 'bg-emerald-600 text-white' : ''}`}
                >
                  {editingTask.is_active ? 'Active' : 'Paused'}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setEditingTask(null)} className="h-9 rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              onClick={saveEditedTask}
              disabled={updating}
              className="h-9 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!taskToDelete} onOpenChange={open => !open && setTaskToDelete(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Delete Credit Task?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to permanently delete "{taskToDelete?.title}"? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setTaskToDelete(null)} className="h-9 rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteTask}
              disabled={deleting}
              className="h-9 rounded-xl text-xs font-bold"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Delete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskManager;
