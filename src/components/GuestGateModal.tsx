import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onRegister: () => void;
  headline?: string;
}

/** Guest gate — shown when a not-logged-in visitor tries to interact with
 *  storefront tracking, share-to-earn, or task-level data on the landing page.
 */
const GuestGateModal: React.FC<Props> = ({ open, onClose, onRegister, headline }) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-3">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <DialogTitle className="text-center text-xl font-black">
            {headline || "Create your free GGD profile to unlock this storefront, view active tasks, and start earning!"}
          </DialogTitle>
          <DialogDescription className="text-center">
            Join thousands of Nigerian businesses & syndicates on GGD Ad Network.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 mt-2">
          <Button
            onClick={onRegister}
            className="h-14 text-base font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
          >
            <Briefcase className="h-5 w-5 mr-2" /> Register as Business
          </Button>
          <Button
            onClick={onRegister}
            variant="outline"
            className="h-14 text-base font-bold border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
          >
            <Users className="h-5 w-5 mr-2" /> Register as Syndicate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestGateModal;