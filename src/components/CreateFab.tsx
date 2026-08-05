import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Sparkles, ClipboardList, Megaphone, Users } from "lucide-react";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";

interface Props {
  onNavigate: (tab: string) => void;
}

/** Central floating "Create" button — the single entry point for creating
 *  anything on GGD. Each option is gated by its own admin feature toggle. */
const CreateFab: React.FC<Props> = ({ onNavigate }) => {
  const { isEnabled } = useFeatureToggles();
  const [open, setOpen] = useState(false);

  const options = [
    ...(isEnabled("community") && isEnabled("create_post")
      ? [{
          id: "post",
          icon: Sparkles,
          label: "Community Post",
          desc: "Share an update with the network",
          grad: "from-pink-500 to-fuchsia-600",
          run: () => { onNavigate("feed"); setTimeout(() => window.dispatchEvent(new CustomEvent("ggd-open-composer")), 250); },
        }]
      : []),
    ...(isEnabled("tasks") && isEnabled("create_credit_task")
      ? [{
          id: "task",
          icon: ClipboardList,
          label: "Credit Task",
          desc: "Pay credits for views, shares & watch time",
          grad: "from-emerald-500 to-teal-600",
          run: () => { onNavigate("feed"); setTimeout(() => window.dispatchEvent(new CustomEvent("ggd-open-task-composer")), 250); },
        }]
      : []),
    ...(isEnabled("ads") && isEnabled("create_banner_ad")
      ? [{
          id: "ad",
          icon: Megaphone,
          label: "Banner Advert",
          desc: "Run a display campaign across the network",
          grad: "from-orange-500 to-red-600",
          run: () => onNavigate("ads-create"),
        }]
      : []),
    ...(isEnabled("syndicate") && isEnabled("business_tasks") && isEnabled("create_syndicate_campaign")
      ? [{
          id: "syndicate",
          icon: Users,
          label: "Social Campaign",
          desc: "Hire syndicates to promote you on social media",
          grad: "from-violet-500 to-indigo-600",
          run: () => onNavigate("business-tasks"),
        }]
      : []),
  ];

  if (options.length === 0) return null;

  return (
    <>
      <button
        aria-label="Create"
        onClick={() => setOpen(true)}
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 7.25rem)' }}
        className="fixed right-4 z-[60] h-16 w-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-white
          shadow-[0_14px_30px_-8px_rgba(0,0,0,0.5)] grid place-items-center active:scale-90 hover:scale-105
          transition-transform duration-200 md:!bottom-6"
      >
        <Plus className="h-8 w-8" strokeWidth={3} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">What do you want to create?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {options.map(o => (
              <button
                key={o.id}
                onClick={() => { setOpen(false); o.run(); }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border hover:bg-muted/50 text-left active:scale-[0.98] transition-all"
              >
                <span className={`h-12 w-12 rounded-xl grid place-items-center bg-gradient-to-br ${o.grad} text-white flex-shrink-0 shadow-md`}>
                  <o.icon className="h-6 w-6" strokeWidth={2.6} />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-bold">{o.label}</span>
                  <span className="block text-xs text-muted-foreground">{o.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateFab;