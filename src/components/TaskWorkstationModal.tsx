import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Camera,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  Download,
  ExternalLink,
  Facebook,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Send,
  Share2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { getOrCreateTaskShareUrl } from "@/lib/taskShare";

export type AcceptedTaskStatus = "in_progress" | "submitted" | "rejected" | "completed";

export interface AcceptedTaskRecord {
  status: AcceptedTaskStatus;
  acceptedAt: string;
  submittedAt?: string;
  proofUrl?: string;
  proofNote?: string;
  platformUsed?: string;
  rejectionReason?: string;
}

export interface TaskWorkstationModalProps {
  task: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitProof: (task: any) => void;
  onShare: (task: any, platformKey: string) => void;
  exchangeRate?: number;
  taskState?: AcceptedTaskRecord;
}

const WORKSTATION_STEPS = [
  {
    step: 1,
    title: "Download Flyer & Copy Caption",
    description: "Download the promotional flyer image and copy the marketing caption.",
    icon: Download,
  },
  {
    step: 2,
    title: "Publish on Your Socials",
    description: "Post the flyer and caption to your WhatsApp Status, Facebook, or group.",
    icon: Share2,
  },
  {
    step: 3,
    title: "Capture Proof Screenshot",
    description: "Keep it up and take a clear screenshot showing your status/post with views or timestamp.",
    icon: Camera,
  },
  {
    step: 4,
    title: "Upload & Get Paid",
    description: "Return here anytime to upload your screenshot and receive credit payment.",
    icon: CheckCircle2,
  },
];

const getCategoryMeta = (task: any) => {
  if (task?.is_official) {
    return { label: "Official Campaign", className: "bg-orange-500/15 text-orange-400 border-orange-500/30" };
  }
  switch (task?.task_type) {
    case "flyer_link":
      return { label: "Flyer & Link", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
    case "description":
      return { label: "Copy & Post", className: "bg-purple-500/15 text-purple-400 border-purple-500/30" };
    case "youtube":
      return { label: "YouTube Promo", className: "bg-red-500/15 text-red-400 border-red-500/30" };
    case "social":
      return { label: "Social Boost", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
    default:
      return { label: "Full Promo", className: "bg-orange-500/15 text-orange-400 border-orange-500/30" };
  }
};

export const TaskWorkstationModal: React.FC<TaskWorkstationModalProps> = ({
  task,
  isOpen,
  onClose,
  onSubmitProof,
  onShare,
  exchangeRate = 100,
  taskState,
}) => {
  const [smartShareUrl, setSmartShareUrl] = useState<string>("");
  const [downloadingFlyer, setDownloadingFlyer] = useState(false);
  const [flyerDownloaded, setFlyerDownloaded] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [flyerLoadError, setFlyerLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    setFlyerDownloaded(false);
    setCopiedCaption(false);
    setFlyerLoadError(false);

    if (!isOpen || !task) {
      setSmartShareUrl("");
      return;
    }

    const fallbackUrl = task.share_url || "";
    setSmartShareUrl(fallbackUrl);

    if (task.id && task.share_url) {
      getOrCreateTaskShareUrl(task.id)
        .then((resolved) => {
          if (active && resolved) {
            setSmartShareUrl(resolved);
          }
        })
        .catch(() => {
          // Keep original share_url if smart link generation fails
        });
    }

    return () => {
      active = false;
    };
  }, [isOpen, task?.id, task?.share_url]);

  const effectiveUrl = smartShareUrl || task?.share_url || "";

  const captionPayload = useMemo(() => {
    if (!task) return "";
    return [task.title, task.description, effectiveUrl].filter(Boolean).join("\n\n");
  }, [task, effectiveUrl]);

  if (!task) return null;

  const rewardCredits = Number(task.reward_credits || 5);
  const rewardNaira = rewardCredits * (exchangeRate || 100);
  const spotsLeft =
    typeof task.max_completions === "number"
      ? Math.max(0, task.max_completions - (task.completions_count || 0))
      : null;
  const category = getCategoryMeta(task);

  const handleDownloadFlyer = async () => {
    if (!task.flyer_url || downloadingFlyer) return;
    setDownloadingFlyer(true);

    const safeSlug =
      (task.title || "ggd-campaign")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 42) || "ggd-campaign";

    try {
      const response = await fetch(task.flyer_url, { mode: "cors" });
      if (!response.ok) throw new Error("Unable to fetch flyer image");
      const blob = await response.blob();
      const rawExt = blob.type.split("/")[1]?.split("+")[0] || "jpg";
      const ext = rawExt === "jpeg" ? "jpg" : rawExt;
      const fileName = `${safeSlug}-flyer.${ext}`;
      const blobUrl = URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 2500);
      setFlyerDownloaded(true);
      toast.success("📥 Flyer downloaded to your device!");
    } catch {
      // Fallback for strict CORS asset URLs
      const anchor = document.createElement("a");
      anchor.href = task.flyer_url;
      anchor.download = `${safeSlug}-flyer.jpg`;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setFlyerDownloaded(true);
      toast.info("Flyer opened — save image to your gallery if prompted.");
    } finally {
      setDownloadingFlyer(false);
    }
  };

  const handleCopyCaptionAndLink = async () => {
    if (!captionPayload) return;
    try {
      await navigator.clipboard.writeText(captionPayload);
      setCopiedCaption(true);
      toast.success("📋 Caption & link copied to clipboard!");
      setTimeout(() => setCopiedCaption(false), 2500);
    } catch {
      toast.error("Could not copy automatically. Please select and copy the text.");
    }
  };

  const handleOpenTargetLink = () => {
    const target = effectiveUrl || task.share_url;
    if (!target) return;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const handleDoItLater = () => {
    toast.success("💾 Progress saved! This task stays in your In Progress list anytime you return.");
    onClose();
  };

  const quickPlatforms = [
    {
      key: "whatsapp_status",
      label: "WhatsApp Status",
      icon: MessageCircle,
      className: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500/40",
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: Facebook,
      className: "bg-blue-600 hover:bg-blue-700 text-white border-blue-500/40",
    },
    {
      key: "twitter",
      label: "X / Twitter",
      icon: Share2,
      className: "bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-700",
    },
    {
      key: "telegram",
      label: "Telegram",
      icon: Send,
      className: "bg-sky-600 hover:bg-sky-700 text-white border-sky-500/40",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-lg max-h-[92dvh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl bg-card border border-border text-foreground shadow-2xl">
        {/* Sticky Workstation Header */}
        <DialogHeader className="shrink-0 bg-gradient-to-br from-card via-card to-orange-500/10 border-b border-border px-4 pt-4 pb-3.5 pr-11 text-left space-y-2">
          <div className="flex items-center flex-wrap gap-1.5">
            <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 ${category.className}`}>
              {category.label}
            </Badge>
            {taskState?.status === "in_progress" && (
              <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0.5 bg-amber-500/15 text-amber-400 border-amber-500/30">
                ⏳ In Progress
              </Badge>
            )}
            {taskState?.status === "rejected" && (
              <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0.5 bg-red-500/15 text-red-400 border-red-500/30">
                Needs Re-submission
              </Badge>
            )}
          </div>

          <DialogTitle className="text-base sm:text-lg font-bold text-foreground leading-snug break-words">
            {task.title}
          </DialogTitle>

          <DialogDescription className="sr-only">
            Complete the promotion workflow steps, download assets, share to social platforms, and upload screenshot proof to earn credits.
          </DialogDescription>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-500/20 to-amber-600/20 border border-orange-500/30 px-2.5 py-1 text-xs font-bold text-orange-400 tabular-nums">
              <Coins className="h-3.5 w-3.5 text-orange-400 shrink-0" />
              <span>+{rewardCredits} GGG credits</span>
              <span className="text-muted-foreground font-normal">·</span>
              <span className="text-amber-300">₦{rewardNaira.toLocaleString()}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-lg bg-muted/60 border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground tabular-nums">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span>
                {spotsLeft !== null
                  ? `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} remaining`
                  : "Open spots"}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Workstation Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Rejection Notice if previously rejected */}
          {taskState?.status === "rejected" && taskState.rejectionReason && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300 space-y-1">
              <p className="font-bold text-red-400">Previous Proof Rejected</p>
              <p className="leading-relaxed">{taskState.rejectionReason}</p>
            </div>
          )}

          {/* Step-by-Step Professional Instructions */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Job Execution Steps
              </h3>
              <span className="text-[11px] text-orange-400 font-medium">4 steps to payout</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {WORKSTATION_STEPS.map(({ step, title, description, icon: StepIcon }) => (
                <Card
                  key={step}
                  className="bg-muted/30 border-border/80 rounded-xl p-3 flex items-start gap-3 shadow-none"
                >
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-600/20 border border-orange-500/30 flex items-center justify-center shrink-0 text-orange-400 font-bold text-xs tabular-nums">
                    {step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <StepIcon className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                      <p className="text-xs font-bold text-foreground leading-tight">{title}</p>
                    </div>
                    <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed">
                      {description}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Assets & Download Kit */}
          <section className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-3.5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Assets & Download Kit
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Grab your campaign flyer, caption, and tracked link below.
              </p>
            </div>

            {/* Flyer Asset & Download */}
            {task.flyer_url ? (
              <div className="space-y-2">
                {!flyerLoadError ? (
                  <div className="relative rounded-xl overflow-hidden border border-border bg-background/60">
                    <img
                      src={task.flyer_url}
                      alt={task.title}
                      referrerPolicy="no-referrer"
                      onError={() => setFlyerLoadError(true)}
                      className="w-full max-h-48 object-cover"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <ImageIcon className="h-4 w-4 shrink-0" />
                    <span>Promotional flyer ready to download</span>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadFlyer}
                  disabled={downloadingFlyer}
                  className="w-full min-h-[44px] rounded-xl border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 text-foreground font-semibold text-xs sm:text-sm"
                >
                  {downloadingFlyer ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin text-orange-400" />
                      Downloading Flyer...
                    </>
                  ) : flyerDownloaded ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-emerald-400" />
                      Flyer Downloaded — Tap to Download Again
                    </>
                  ) : (
                    <>📥 Download Flyer</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 bg-background/50 px-3 py-2.5 text-xs text-muted-foreground">
                No flyer image attached — copy the marketing caption and link below to post.
              </div>
            )}

            {/* Caption & Copy Text Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-foreground">
                  Marketing Caption & Link
                </span>
                {effectiveUrl && (
                  <span className="text-[10px] text-orange-400 truncate max-w-[190px]">
                    {effectiveUrl}
                  </span>
                )}
              </div>

              <Textarea
                readOnly
                value={captionPayload}
                rows={4}
                aria-label="Marketing caption and link"
                className="text-xs leading-relaxed bg-background border-border text-foreground rounded-xl resize-none focus-visible:ring-orange-500"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyCaptionAndLink}
                  className={`min-h-[44px] rounded-xl font-semibold text-xs border-border ${
                    copiedCaption
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                      : "bg-background hover:bg-muted text-foreground"
                  }`}
                >
                  {copiedCaption ? "✅ Copied!" : "📋 Copy Caption & Link"}
                </Button>

                {effectiveUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOpenTargetLink}
                    className="min-h-[44px] rounded-xl font-semibold text-xs bg-background hover:bg-muted border-border text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                    🔗 Open Target Link
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    disabled
                    className="min-h-[44px] rounded-xl font-semibold text-xs opacity-50"
                  >
                    No External Link
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Social Share Triggers */}
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-semibold text-muted-foreground">
                Quick Social Share Triggers
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickPlatforms.map((platform) => {
                  const Icon = platform.icon;
                  return (
                    <button
                      key={platform.key}
                      type="button"
                      onClick={() => onShare(task, platform.key)}
                      className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${platform.className}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{platform.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Sticky Thumb-Zone Footer Actions */}
        <div className="shrink-0 border-t border-border bg-card px-4 py-3 flex flex-col gap-2">
          <Button
            type="button"
            onClick={() => onSubmitProof(task)}
            className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm shadow-lg shadow-orange-500/25 active:scale-[0.99] transition"
          >
            📸 Upload & Submit Proof
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDoItLater}
            className="w-full min-h-[44px] rounded-xl border-border bg-muted/40 hover:bg-muted text-foreground font-semibold text-xs"
          >
            💾 Do It Later (Save Progress)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskWorkstationModal;
