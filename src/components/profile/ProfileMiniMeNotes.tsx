import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  CheckCircle2,
  ClipboardCopy,
  Compass,
  Layers,
  ListChecks,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PROFILE_EXISTING_CAPABILITIES,
  PROFILE_SECTION_LABELS,
  ProfileExistingCapability,
  ProfileImplementationNote,
  ProfileNotePriority,
  ProfileNoteStatus,
  ProfileSectionId,
  addProfileNote,
  cycleProfileNoteStatus,
  deleteProfileNote,
  formatNotesAsMarkdown,
  loadProfileNotes,
  saveProfileNotes,
} from '@/lib/profileNotes';

interface ProfileMiniMeNotesProps {
  userId?: string | null;
  avatarUrl?: string | null;
  displayName?: string;
  onJumpToCapability?: (cap: ProfileExistingCapability) => void;
}

const STATUS_STYLE: Record<ProfileNoteStatus, { label: string; className: string }> = {
  planned: {
    label: 'Planned',
    className: 'bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/25',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-sky-500/15 text-sky-700 border-sky-500/30 hover:bg-sky-500/25',
  },
  implemented: {
    label: 'Implemented',
    className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/25',
  },
};

const PRIORITY_STYLE: Record<ProfileNotePriority, string> = {
  high: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
  medium: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  low: 'bg-slate-500/15 text-slate-600 border-slate-400/30',
};

export const ProfileMiniMeNotes: React.FC<ProfileMiniMeNotesProps> = ({
  userId,
  avatarUrl,
  displayName,
  onJumpToCapability,
}) => {
  const [open, setOpen] = useState(false);
  const [activeView, setActiveView] = useState<'notes' | 'capabilities'>('notes');
  const [statusFilter, setStatusFilter] = useState<'all' | ProfileNoteStatus>('all');
  const [notes, setNotes] = useState<ProfileImplementationNote[]>(() => loadProfileNotes(userId));
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [newSection, setNewSection] = useState<ProfileSectionId>('identity');
  const [newPriority, setNewPriority] = useState<ProfileNotePriority>('high');

  useEffect(() => {
    setNotes(loadProfileNotes(userId));
  }, [userId]);

  const updateAndPersist = (next: ProfileImplementationNote[]) => {
    setNotes(next);
    saveProfileNotes(next, userId);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Please enter a short note title');
      return;
    }
    const next = addProfileNote(notes, {
      title: newTitle,
      details: newDetails,
      section: newSection,
      priority: newPriority,
    });
    updateAndPersist(next);
    setNewTitle('');
    setNewDetails('');
    setShowAddForm(false);
    toast.success('Profile implementation note added');
  };

  const handleCycleStatus = (noteId: string) => {
    const next = cycleProfileNoteStatus(notes, noteId);
    updateAndPersist(next);
  };

  const handleDeleteNote = (noteId: string) => {
    const next = deleteProfileNote(notes, noteId);
    updateAndPersist(next);
    toast.success('Note removed');
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(formatNotesAsMarkdown(notes));
      toast.success('Implementation notes copied as Markdown');
    } catch {
      toast.error('Unable to copy to clipboard');
    }
  };

  const pendingCount = useMemo(
    () => notes.filter((n) => n.status !== 'implemented').length,
    [notes]
  );

  const filteredNotes = useMemo(() => {
    if (statusFilter === 'all') return notes;
    return notes.filter((n) => n.status === statusFilter);
  }, [notes, statusFilter]);

  const initials = (displayName || 'ME').slice(0, 2).toUpperCase();

  return (
    <>
      {/* Compact, Non-Blocking 3D Floating Mini-Me Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open User Profile Implementation Notes"
        className="fixed bottom-24 right-3 sm:right-5 z-40 group flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5
          bg-gradient-to-br from-orange-500 via-amber-500 to-rose-600 text-white
          border border-white/40
          shadow-[0_12px_26px_-6px_rgba(234,88,12,0.55),0_4px_0_0_rgba(154,52,18,0.65),inset_0_2px_4px_rgba(255,255,255,0.45)]
          hover:-translate-y-0.5 active:translate-y-[1px]
          active:shadow-[0_6px_14px_-4px_rgba(234,88,12,0.5),0_2px_0_0_rgba(154,52,18,0.65)]
          transition-all duration-200 cursor-pointer max-w-[180px]"
      >
        <span className="relative shrink-0">
          <Avatar className="h-9 w-9 border-2 border-white shadow-[0_3px_10px_rgba(0,0,0,0.28)] ring-2 ring-amber-200/40 group-hover:scale-105 transition-transform">
            <AvatarImage src={avatarUrl || ''} />
            <AvatarFallback className="bg-slate-950 text-amber-300 text-xs font-black">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-white shadow-sm" />
        </span>

        <span className="flex flex-col items-start text-left min-w-0 leading-tight">
          <span className="text-[11px] font-black tracking-tight flex items-center gap-1 whitespace-nowrap">
            <span>Mini-Me</span>
            <Sparkles className="h-3 w-3 text-amber-100 shrink-0" />
          </span>
          <span className="text-[9.5px] font-bold text-white/90 whitespace-nowrap">
            {pendingCount} Profile Notes
          </span>
        </span>
      </button>

      {/* Non-blocking Compact Modal / Drawer */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[85dvh] p-0 gap-0 overflow-hidden flex flex-col rounded-3xl border border-border/90 shadow-2xl">
          <DialogHeader className="p-4 sm:p-5 bg-gradient-to-r from-orange-600 via-amber-500 to-rose-600 text-white shrink-0">
            <div className="flex items-center gap-3 pr-7">
              <Avatar className="h-11 w-11 border-2 border-white shadow-lg shrink-0">
                <AvatarImage src={avatarUrl || ''} />
                <AvatarFallback className="bg-slate-950 text-amber-300 text-sm font-black">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                  Profile Mini-Me Inspector
                  <Badge className="bg-white/20 text-white border-0 text-[9px] font-black">
                    {notes.length} Notes
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-[11px] text-white/90 font-medium mt-0.5">
                  Plan &amp; track UserProfilePage.tsx updates and inspect live sections.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3">
              <button
                type="button"
                onClick={() => setActiveView('notes')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'notes'
                    ? 'bg-white text-orange-700 shadow-md'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                <ListChecks className="h-3.5 w-3.5" />
                Implementation Notes ({notes.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveView('capabilities')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeView === 'capabilities'
                    ? 'bg-white text-orange-700 shadow-md'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Existing Features ({PROFILE_EXISTING_CAPABILITIES.length})
              </button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 bg-background">
            {activeView === 'notes' ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1 flex-wrap">
                    {(['all', 'planned', 'in_progress', 'implemented'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setStatusFilter(status)}
                        className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                          statusFilter === status
                            ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                            : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'
                        }`}
                      >
                        {status === 'all'
                          ? 'All'
                          : status === 'in_progress'
                          ? 'In Progress'
                          : status === 'implemented'
                          ? 'Done'
                          : 'Planned'}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCopyMarkdown}
                      className="h-7 px-2.5 rounded-lg text-[11px] font-bold cursor-pointer"
                    >
                      <ClipboardCopy className="h-3 w-3 mr-1" /> Copy MD
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setShowAddForm((prev) => !prev)}
                      className="h-7 px-2.5 rounded-lg text-[11px] font-bold bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Note
                    </Button>
                  </div>
                </div>

                {showAddForm && (
                  <form
                    onSubmit={handleAddNote}
                    className="p-3 rounded-2xl border border-orange-500/30 bg-orange-500/5 space-y-2.5"
                  >
                    <div>
                      <Label className="text-[11px] font-bold">Feature / Improvement Title</Label>
                      <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="e.g. Add Bank Payout Verification Card"
                        className="mt-1 h-9 text-xs rounded-xl"
                        maxLength={120}
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Implementation Details</Label>
                      <textarea
                        value={newDetails}
                        onChange={(e) => setNewDetails(e.target.value)}
                        placeholder="Describe fields, API hooks, or layout notes..."
                        rows={2}
                        maxLength={500}
                        className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] font-bold">Target Section</Label>
                        <select
                          value={newSection}
                          onChange={(e) => setNewSection(e.target.value as ProfileSectionId)}
                          className="mt-1 w-full h-9 rounded-xl border border-input bg-background px-2 text-xs font-medium"
                        >
                          {Object.entries(PROFILE_SECTION_LABELS).map(([id, label]) => (
                            <option key={id} value={id}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-[11px] font-bold">Priority</Label>
                        <select
                          value={newPriority}
                          onChange={(e) => setNewPriority(e.target.value as ProfileNotePriority)}
                          className="mt-1 w-full h-9 rounded-xl border border-input bg-background px-2 text-xs font-medium"
                        >
                          <option value="high">High Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="low">Low Priority</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowAddForm(false)}
                        className="h-8 text-xs rounded-xl"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className="h-8 text-xs rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold"
                      >
                        Save Note
                      </Button>
                    </div>
                  </form>
                )}

                <div className="space-y-2.5">
                  {filteredNotes.length === 0 ? (
                    <div className="text-center py-8 border border-dashed rounded-2xl text-xs text-muted-foreground">
                      No notes in this filter yet. Click "Add Note" to plan a profile enhancement.
                    </div>
                  ) : (
                    filteredNotes.map((note) => {
                      const statusMeta = STATUS_STYLE[note.status];
                      return (
                        <div
                          key={note.id}
                          className="p-3 rounded-2xl border border-border bg-card shadow-xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs sm:text-sm font-black text-foreground leading-snug">
                              {note.title}
                            </p>
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(note.id)}
                              aria-label="Delete note"
                              className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {note.details && (
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {note.details}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${PRIORITY_STYLE[note.priority]}`}
                              >
                                {note.priority.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] font-semibold">
                                {PROFILE_SECTION_LABELS[note.section] || note.section}
                              </Badge>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCycleStatus(note.id)}
                              title="Click to cycle status"
                              className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black transition-all cursor-pointer ${statusMeta.className}`}
                            >
                              {statusMeta.label}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-2.5">
                {PROFILE_EXISTING_CAPABILITIES.map((cap) => (
                  <div
                    key={cap.id}
                    className="p-3 rounded-2xl border border-border bg-card shadow-xs space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-black text-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate">{cap.label}</span>
                        </p>
                        <p className="text-[10px] font-bold text-orange-600 mt-0.5">
                          {cap.backing}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onJumpToCapability?.(cap);
                          setOpen(false);
                        }}
                        className="h-7 px-2.5 rounded-xl text-[10.5px] font-bold shrink-0 cursor-pointer"
                      >
                        <Compass className="h-3 w-3 mr-1 text-orange-500" />
                        Jump
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {cap.summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfileMiniMeNotes;
