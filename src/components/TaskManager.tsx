import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Plus,
  Trash2,
  Edit2,
  Share2,
  Youtube,
  Globe,
  Coins,
  Search,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Copy,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Users,
  Eye,
  Gift,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  reward_credits: number | null;
  task_type: string | null;
  share_url: string | null;
  flyer_url: string | null;
  funded: boolean;
  max_completions: number;
  completions_count: number;
  is_active: boolean | null;
  creator_id: string | null;
  created_at: string;
}

const TaskManager = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formReward, setFormReward] = useState('5');
  const [formTaskType, setFormTaskType] = useState('share');
  const [formShareUrl, setFormShareUrl] = useState('');
  const [formMaxCompletions, setFormMaxCompletions] = useState('50');
  const [formIsActive, setFormIsActive] = useState(true);
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);
  const [uploadingFlyer, setUploadingFlyer] = useState(false);

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

      if (error) {
        toast.error('Failed to load tasks: ' + error.message);
      } else {
        setTasks((data as TaskItem[]) || []);
      }
    } catch (err: any) {
      toast.error('Network error loading tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDescription('');
    setFormReward('5');
    setFormTaskType('share');
    setFormShareUrl('');
    setFormMaxCompletions('50');
    setFormIsActive(true);
    setFlyerFile(null);
    setFlyerPreview(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (task: TaskItem) => {
    setEditingTask(task);
    setFormTitle(task.title || '');
    setFormDescription(task.description || '');
    setFormReward(String(task.reward_credits || 5));
    setFormTaskType(task.task_type || 'share');
    setFormShareUrl(task.share_url || '');
    setFormMaxCompletions(String(task.max_completions || 1));
    setFormIsActive(task.is_active ?? true);
    setFlyerFile(null);
    setFlyerPreview(task.flyer_url || null);
    setModalOpen(true);
  };

  const handleFlyerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setFlyerFile(file);
    setFlyerPreview(URL.createObjectURL(file));
  };

  const uploadFlyerIfPresent = async (userId: string): Promise<string | null> => {
    if (!flyerFile) return flyerPreview; // Keep existing if not changed
    setUploadingFlyer(true);
    try {
      const ext = (flyerFile.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `admin/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from('task-flyers')
        .upload(fileName, flyerFile, { upsert: false, contentType: flyerFile.type });

      if (error) {
        toast.error('Failed to upload image: ' + error.message);
        return flyerPreview;
      }
      const { data: urlData } = supabase.storage.from('task-flyers').getPublicUrl(fileName);
      return urlData.publicUrl;
    } finally {
      setUploadingFlyer(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error('Task title is required');
      return;
    }

    const reward = parseInt(formReward, 10);
    if (isNaN(reward) || reward <= 0) {
      toast.error('Reward credits must be at least 1');
      return;
    }

    const maxCompletions = parseInt(formMaxCompletions, 10);
    if (isNaN(maxCompletions) || maxCompletions <= 0) {
      toast.error('Max completions must be at least 1');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || 'admin';

      const uploadedUrl = await uploadFlyerIfPresent(userId);

      if (editingTask) {
        // Update existing task
        const { error } = await supabase
          .from('tasks')
          .update({
            title: formTitle.trim(),
            description: formDescription.trim() || null,
            reward_credits: reward,
            task_type: formTaskType,
            share_url: formShareUrl.trim() || null,
            flyer_url: uploadedUrl || null,
            max_completions: maxCompletions,
            is_active: formIsActive,
          })
          .eq('id', editingTask.id);

        if (error) {
          toast.error('Update failed: ' + error.message);
        } else {
          toast.success('Task updated successfully!');
          setModalOpen(false);
          fetchTasks();
        }
      } else {
        // Create new task
        const { error } = await supabase
          .from('tasks')
          .insert({
            title: formTitle.trim(),
            description: formDescription.trim() || null,
            reward_credits: reward,
            task_type: formTaskType,
            share_url: formShareUrl.trim() || null,
            flyer_url: uploadedUrl || null,
            max_completions: maxCompletions,
            completions_count: 0,
            is_active: formIsActive,
            creator_id: authData.user?.id || null,
            funded: true,
          });

        if (error) {
          toast.error('Creation failed: ' + error.message);
        } else {
          toast.success('Task created successfully!');
          setModalOpen(false);
          fetchTasks();
        }
      }
    } catch (err: any) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) {
        toast.error('Failed to toggle status: ' + error.message);
      } else {
        toast.success(!currentStatus ? 'Task activated' : 'Task paused');
        setTasks(prev =>
          prev.map(t => (t.id === id ? { ...t, is_active: !currentStatus } : t))
        );
      }
    } catch {
      toast.error('Error updating task');
    }
  };

  const handleResetCompletions = async (task: TaskItem) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completions_count: 0, is_active: true })
        .eq('id', task.id);

      if (error) {
        toast.error('Failed to reset completions: ' + error.message);
      } else {
        toast.success(`Completions reset to 0! Task is active for ${task.max_completions} more users.`);
        fetchTasks();
      }
    } catch {
      toast.error('Error resetting task');
    }
  };

  const handleDuplicate = async (task: TaskItem) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: `${task.title} (Copy)`,
          description: task.description,
          reward_credits: task.reward_credits,
          task_type: task.task_type,
          share_url: task.share_url,
          flyer_url: task.flyer_url,
          max_completions: task.max_completions,
          completions_count: 0,
          is_active: true,
          creator_id: authData.user?.id || null,
          funded: true,
        });

      if (error) {
        toast.error('Failed to duplicate task: ' + error.message);
      } else {
        toast.success('Task duplicated successfully!');
        fetchTasks();
      }
    } catch {
      toast.error('Error duplicating task');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) {
        toast.error('Failed to delete task: ' + error.message);
      } else {
        toast.success('Task deleted');
        setTasks(prev => prev.filter(t => t.id !== id));
        setDeleteConfirmId(null);
      }
    } catch {
      toast.error('Error deleting task');
    }
  };

  // Metrics
  const totalTasks = tasks.length;
  const activeTasks = tasks.filter(t => t.is_active).length;
  const pausedTasks = tasks.filter(t => !t.is_active).length;
  const totalCompletions = tasks.reduce((sum, t) => sum + (t.completions_count || 0), 0);
  const totalCreditsAwarded = tasks.reduce(
    (sum, t) => sum + (t.completions_count || 0) * (t.reward_credits || 0),
    0
  );

  // Filtered tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch =
      (task.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.share_url || '').toLowerCase().includes(searchQuery.toLowerCase());

    const isCompleted = (task.completions_count || 0) >= (task.max_completions || 1);

    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = !!task.is_active && !isCompleted;
    if (statusFilter === 'paused') matchesStatus = !task.is_active;
    if (statusFilter === 'completed') matchesStatus = isCompleted;

    let matchesType = true;
    if (typeFilter !== 'all') matchesType = (task.task_type || 'share') === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case 'youtube':
        return <Youtube className="h-3.5 w-3.5 text-red-500" />;
      case 'social':
        return <Users className="h-3.5 w-3.5 text-blue-500" />;
      default:
        return <Share2 className="h-3.5 w-3.5 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-emerald-600" />
            Credit Tasks Management
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure community and official promotional tasks that users complete to earn wallet credits.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm text-xs font-semibold gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Create New Task
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border border-border/60 shadow-sm bg-card">
          <CardContent className="p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Tasks</p>
            <p className="text-xl font-black text-foreground mt-0.5">{totalTasks}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              <span className="text-emerald-600 font-bold">{activeTasks}</span> active ·{' '}
              <span className="text-amber-600 font-bold">{pausedTasks}</span> paused
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm bg-card">
          <CardContent className="p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Completions</p>
            <p className="text-xl font-black text-foreground mt-0.5">{totalCompletions.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Total user claims</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm bg-card">
          <CardContent className="p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Credits Distributed</p>
            <p className="text-xl font-black text-emerald-600 mt-0.5">{totalCreditsAwarded.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Awarded to members</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm bg-card">
          <CardContent className="p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Platform Task</p>
            <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1.5">
              <Gift className="h-4 w-4 text-orange-500" />
              100-Credit Share
            </p>
            <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 mt-1">
              Active / Idempotent
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-3.5 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tasks by title, description or link..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="h-8 text-xs w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="paused">Paused Only</SelectItem>
                <SelectItem value="completed">Completed / Full</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs w-[120px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="share">Share Link</SelectItem>
                <SelectItem value="social">Social Media</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Task List Section */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="text-xs">Loading tasks...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <Card className="border-dashed border-border p-8 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No tasks found</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {searchQuery ? 'Try changing your search query or filters.' : 'Click "Create New Task" to add the first credit task.'}
            </p>
          </Card>
        ) : (
          filteredTasks.map(task => {
            const maxComp = task.max_completions || 1;
            const currentComp = task.completions_count || 0;
            const percent = Math.min(100, Math.round((currentComp / maxComp) * 100));
            const isFull = currentComp >= maxComp;

            return (
              <Card
                key={task.id}
                className={`border transition-all hover:shadow-md ${
                  !task.is_active ? 'opacity-65 bg-muted/20 border-border' : isFull ? 'border-amber-200 bg-amber-50/20' : 'border-border/80 bg-card'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Left: Thumbnail & Details */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {task.flyer_url ? (
                        <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted flex-shrink-0 border border-border">
                          <img
                            src={task.flyer_url}
                            alt={task.title}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="h-16 w-16 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600">
                          {getTypeIcon(task.task_type)}
                        </div>
                      )}

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground truncate">{task.title}</h4>
                          <Badge variant="outline" className="text-[10px] py-0 h-5 gap-1 border-muted">
                            {getTypeIcon(task.task_type)}
                            <span className="capitalize">{task.task_type || 'share'}</span>
                          </Badge>
                          <Badge className="text-[10px] py-0 h-5 bg-emerald-100 text-emerald-800 font-bold hover:bg-emerald-100">
                            +{task.reward_credits || 5} Credits
                          </Badge>
                          {isFull && (
                            <Badge variant="secondary" className="text-[10px] py-0 h-5 bg-amber-100 text-amber-800 font-bold">
                              Exhausted / Full
                            </Badge>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                        )}

                        {task.share_url && (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
                            <Globe className="h-3 w-3 flex-shrink-0" />
                            <a
                              href={task.share_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline truncate max-w-[240px] sm:max-w-md flex items-center gap-1"
                            >
                              {task.share_url}
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        )}

                        {/* Progress bar */}
                        <div className="pt-2 max-w-sm">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1 font-medium">
                            <span>Completions: {currentComp} / {maxComp}</span>
                            <span>{percent}%</span>
                          </div>
                          <Progress value={percent} className="h-1.5" />
                        </div>
                      </div>
                    </div>

                    {/* Right: Quick Toggles & Action Buttons */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`active-toggle-${task.id}`} className="text-[11px] text-muted-foreground font-medium">
                          {task.is_active ? 'Active' : 'Paused'}
                        </Label>
                        <Switch
                          id={`active-toggle-${task.id}`}
                          checked={!!task.is_active}
                          onCheckedChange={() => handleToggleActive(task.id, !!task.is_active)}
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        {isFull && (
                          <Button
                            size="icon"
                            variant="outline"
                            title="Reset completions & re-open task"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            onClick={() => handleResetCompletions(task)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="outline"
                          title="Edit task"
                          className="h-8 w-8 text-foreground hover:bg-muted"
                          onClick={() => handleOpenEdit(task)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          title="Duplicate task"
                          className="h-8 w-8 text-foreground hover:bg-muted"
                          onClick={() => handleDuplicate(task)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Delete task"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteConfirmId(task.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-emerald-600" />
              {editingTask ? 'Edit Credit Task' : 'Create New Credit Task'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the requirements, destination link, and credit reward for community promotion.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Task Title *</Label>
              <Input
                placeholder="e.g. Share GGD Digital Growth on WhatsApp"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description & Instructions (optional)</Label>
              <Textarea
                placeholder="Tell users what to share or caption..."
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                className="text-xs min-h-[68px] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Reward Credits *</Label>
                <div className="relative">
                  <Coins className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-600" />
                  <Input
                    type="number"
                    min="1"
                    value={formReward}
                    onChange={e => setFormReward(e.target.value)}
                    className="pl-8 h-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Max Completions (Capacity) *</Label>
                <div className="relative">
                  <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    min="1"
                    value={formMaxCompletions}
                    onChange={e => setFormMaxCompletions(e.target.value)}
                    className="pl-8 h-9 text-xs"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Task Channel</Label>
                <Select value={formTaskType} onValueChange={setFormTaskType}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="share">General Share Link</SelectItem>
                    <SelectItem value="social">Social Media (WhatsApp/FB)</SelectItem>
                    <SelectItem value="youtube">YouTube Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Destination Share URL</Label>
                <Input
                  placeholder="https://..."
                  value={formShareUrl}
                  onChange={e => setFormShareUrl(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Flyer Upload / Preview */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Campaign Flyer / Banner Image</Label>
              <div className="flex items-center gap-3">
                {flyerPreview && (
                  <div className="h-12 w-12 rounded-lg overflow-hidden border border-border flex-shrink-0">
                    <img src={flyerPreview} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
                <label className="flex-1 flex items-center justify-center gap-2 border border-dashed border-border rounded-xl p-2.5 cursor-pointer hover:bg-muted/40 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">
                    {flyerFile ? flyerFile.name : flyerPreview ? 'Change Image' : 'Upload Flyer Image'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFlyerSelect}
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <Label className="text-xs font-semibold">Active Immediately</Label>
                <p className="text-[10px] text-muted-foreground">Make this task visible in the user task feed</p>
              </div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                disabled={isSubmitting || uploadingFlyer}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
                disabled={isSubmitting || uploadingFlyer}
              >
                {(isSubmitting || uploadingFlyer) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingTask ? 'Save Changes' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={open => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              Delete Task
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete this task? Any existing completion records for this task will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmId(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="text-xs font-semibold"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskManager;
