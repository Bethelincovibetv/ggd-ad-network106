import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const TaskManager = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTask, setNewTask] = useState({ title: '', description: '', reward_credits: '5', share_url: '' });

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    setTasks(data || []);
  };

  const createTask = async () => {
    if (!newTask.title.trim()) { toast.error("Title required"); return; }
    const { error } = await supabase.from('tasks').insert({
      title: newTask.title,
      description: newTask.description || null,
      reward_credits: parseInt(newTask.reward_credits) || 5,
      task_type: 'share',
      share_url: newTask.share_url || null,
    });
    if (error) { toast.error("Failed to create task"); return; }
    toast.success("Task created!");
    setNewTask({ title: '', description: '', reward_credits: '5', share_url: '' });
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    toast.success("Task deleted");
    fetchTasks();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('tasks').update({ is_active: !current }).eq('id', id);
    fetchTasks();
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-foreground flex items-center gap-2"><ClipboardList className="h-4 w-4" />Task Management</h3>
      
      <Card className="border-green-200">
        <CardContent className="p-4 space-y-3">
          <Input placeholder="Task title *" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="h-8 text-xs" />
          <Input placeholder="Description (optional)" value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} className="h-8 text-xs" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Reward Credits</Label>
              <Input type="number" value={newTask.reward_credits} onChange={e => setNewTask({ ...newTask, reward_credits: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px]">Share URL</Label>
              <Input placeholder="https://..." value={newTask.share_url} onChange={e => setNewTask({ ...newTask, share_url: e.target.value })} className="h-8 text-xs" />
            </div>
          </div>
          <Button onClick={createTask} className="w-full text-xs" size="sm"><Plus className="h-3 w-3 mr-1" />Create Task</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {tasks.map(task => (
          <Card key={task.id} className={`${!task.is_active ? 'opacity-50' : ''}`}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{task.title}</p>
                {task.description && <p className="text-[10px] text-muted-foreground">{task.description}</p>}
                <p className="text-[10px] text-green-600 font-medium">+{task.reward_credits} credits</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => toggleActive(task.id, task.is_active)}>
                  {task.is_active ? 'Disable' : 'Enable'}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteTask(task.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TaskManager;
