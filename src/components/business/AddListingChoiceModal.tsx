import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Package, Zap, ArrowRight, Sparkles } from "lucide-react";

interface AddListingChoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectType: (type: 'product' | 'service') => void;
}

/**
 * Unified "Add Listing" entry point modal.
 * Clearly asks the user:
 * "What do you want to add?"
 * [ Product ] [ Service ]
 */
export const AddListingChoiceModal: React.FC<AddListingChoiceModalProps> = ({
  open,
  onOpenChange,
  onSelectType,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-3xl sm:rounded-3xl border-border/70 shadow-2xl">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-orange-500/10 text-orange-600 grid place-items-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <DialogTitle className="text-xl font-black text-foreground">
              What do you want to add?
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Choose the type of listing to add to your business catalog and public storefront.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3.5 pt-3">
          {/* Option 1: Product */}
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onSelectType('product');
            }}
            className="group p-4 rounded-2xl border-2 border-border/60 hover:border-blue-500/80 bg-card hover:bg-blue-50/40 dark:hover:bg-blue-950/20 text-left transition-all active:scale-[0.98] shadow-sm hover:shadow-md flex items-center justify-between"
          >
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white grid place-items-center shadow-lg shadow-blue-500/20 shrink-0 group-hover:scale-105 transition-transform">
                <Package className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Add a Product
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    Physical & Digital
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Merchandise, gadgets, fashion, retail goods, or digital downloads with fixed pricing and inventory.
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
          </button>

          {/* Option 2: Service */}
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onSelectType('service');
            }}
            className="group p-4 rounded-2xl border-2 border-border/60 hover:border-purple-500/80 bg-card hover:bg-purple-50/40 dark:hover:bg-purple-950/20 text-left transition-all active:scale-[0.98] shadow-sm hover:shadow-md flex items-center justify-between"
          >
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white grid place-items-center shadow-lg shadow-purple-500/20 shrink-0 group-hover:scale-105 transition-transform">
                <Zap className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Add a Service
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                    Professional
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Consultation, repairs, agency work, creative services, or custom jobs with hourly, starting, or quote rates.
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddListingChoiceModal;
