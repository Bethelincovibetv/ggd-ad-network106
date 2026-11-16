import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { callRpc } from "@/lib/supabaseRpc";

interface Props {
  task: any | null;
  onClose: () => void;
  onSubmitted: (taskId: string) => void;
}

const TaskProofSubmitDialog: React.FC<Props> = ({ task, onClose, onSubmitted }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => { setFile(null); setPreview(null); setNote(''); };

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Screenshot must be under 5MB"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!task) return;
    if (!file) { toast.error("Please upload a screenshot as proof"); return; }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please sign in"); return; }
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}/credit-tasks/${task.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('task-proofs').upload(path, file, { contentType: file.type });
      if (upErr) { toast.error(`Upload failed: ${upErr.message}`); return; }
      const { data: { publicUrl } } = supabase.storage.from('task-proofs').getPublicUrl(path);
      const { data, error } = await callRpc<any>('submit_task_proof', {
        p_task_id: task.id, p_proof_url: publicUrl, p_proof_text: note || null,
      });
      if (error || !data?.success) { toast.error(data?.error || error?.message || "Could not submit proof"); return; }
      toast.success("Proof submitted! Credits are paid after review (auto-approved within 48 hours).");
      onSubmitted(task.id);
      reset();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!task} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">Submit proof to earn</DialogTitle>
          <DialogDescription className="text-xs">
            Upload a screenshot showing you completed "{task?.title}". The task owner or an admin reviews it. If nobody reviews it in 48 hours, it is approved automatically.
          </DialogDescription>
        </DialogHeader>
        <label className="block border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:bg-muted/40">
          {preview ? (
            <img src={preview} alt="Proof preview" className="max-h-56 mx-auto rounded-lg" />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
              <Upload className="h-6 w-6" />
              <span className="text-sm font-medium">Tap to upload screenshot</span>
            </div>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={pick} />
        </label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional: link to your post or a short note"
          className="text-sm"
          rows={2}
        />
        <Button onClick={submit} disabled={busy || !file} className="w-full">
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Submit Proof
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default TaskProofSubmitDialog;
