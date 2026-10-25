import React, { useState, useEffect } from 'react';
import { 
  UserCheck, UserPlus, Phone, MessageSquare, Check, Sparkles, 
  ExternalLink, Copy, Download, ShieldCheck, HeartHandshake
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  chatContactMatchmakerService, 
  MatchmakerContact 
} from '@/services/chatContactMatchmakerService';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { toast } from 'sonner';

interface ChatContactMatchmakerProps {
  currentUserId: string;
  contact: MatchmakerContact;
  className?: string;
  compact?: boolean;
}

export const ChatContactMatchmaker: React.FC<ChatContactMatchmakerProps> = ({
  currentUserId,
  contact,
  className = '',
  compact = false,
}) => {
  const [isSaved, setIsSaved] = useState<boolean>(() => {
    return chatContactMatchmakerService.isContactSavedSync(currentUserId, contact.userId);
  });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check persistent status on mount & whenever contact changes
  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      const saved = await chatContactMatchmakerService.isContactSaved(currentUserId, contact.userId);
      if (mounted) {
        setIsSaved(saved);
      }
    };
    checkStatus();

    // Listen for cross-component matchmaker updates
    const handleUpdate = (e: any) => {
      if (e?.detail?.otherUserId === contact.userId) {
        setIsSaved(true);
      }
    };
    window.addEventListener('ggd_matchmaker_contact_changed', handleUpdate);

    return () => {
      mounted = false;
      window.removeEventListener('ggd_matchmaker_contact_changed', handleUpdate);
    };
  }, [currentUserId, contact.userId]);

  const handleSaveContact = async () => {
    if (loading || isSaved) return;
    setLoading(true);
    try {
      const success = await chatContactMatchmakerService.saveContact(currentUserId, contact);
      if (success) {
        setIsSaved(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const effectivePhone = contact.phone || contact.whatsapp || '';
  const cleanPhone = effectivePhone.replace(/[^\d+]/g, '');

  const copyPhoneNumber = () => {
    if (!cleanPhone) {
      toast.info("No phone number registered for this contact yet.");
      return;
    }
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(cleanPhone);
      setCopied(true);
      toast.success("Phone number copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayName = contact.name || contact.businessName || 'Contact';

  return (
    <div className={`w-full overflow-hidden transition-all duration-300 ${className}`}>
      {/* 3D Matchmaker Banner */}
      <div className={`relative rounded-2xl p-[1.5px] transition-all shadow-xs ${
        isSaved 
          ? 'bg-gradient-to-r from-emerald-500/40 via-teal-500/30 to-green-500/40' 
          : 'bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 shadow-md'
      }`}>
        <div className={`rounded-[14px] px-3 py-2 sm:px-3.5 sm:py-2.5 backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5 ${
          isSaved 
            ? 'bg-emerald-500/10 dark:bg-emerald-950/30 text-foreground border border-emerald-500/20' 
            : 'bg-card/95 text-foreground'
        }`}>
          {/* Left: Contact Info & Status Indicator */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`relative h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm transition-transform ${
              isSaved
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                : 'bg-gradient-to-br from-orange-500 via-rose-500 to-amber-500 text-white group-hover:scale-105'
            }`}>
              {contact.avatarUrl ? (
                <img 
                  src={contact.avatarUrl} 
                  alt={displayName} 
                  className="h-full w-full object-cover rounded-xl" 
                />
              ) : (
                <span>{displayName.slice(0, 2).toUpperCase()}</span>
              )}
              <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${
                isSaved ? 'bg-emerald-400 animate-pulse' : 'bg-orange-500'
              }`} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-xs sm:text-sm truncate text-foreground">
                  {displayName}
                </span>

                {isSaved ? (
                  <Badge className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                    <Check className="h-3 w-3 stroke-[3]" />
                    <span>Connected</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5 text-orange-500" />
                    <span>Matchmaker</span>
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                {contact.businessName && contact.businessName !== contact.name && (
                  <span className="font-semibold text-foreground/80 truncate max-w-[130px] sm:max-w-[200px]">
                    {contact.businessName} •
                  </span>
                )}
                {cleanPhone ? (
                  <span className="font-mono text-muted-foreground truncate">
                    {cleanPhone}
                  </span>
                ) : (
                  <span className="italic text-[10px]">GGD Network Member</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {isSaved ? (
              // Connected State: Contact is already saved! Persistently shows Connected and quick outreach options
              <div className="flex items-center gap-1.5">
                {cleanPhone && (
                  <>
                    <button
                      type="button"
                      onClick={copyPhoneNumber}
                      className="inline-flex items-center gap-1 h-7 sm:h-8 px-2.5 rounded-lg bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] font-bold border border-border/80 transition-colors cursor-pointer"
                      title="Copy Phone Number"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    <a
                      href={buildWhatsAppLink(cleanPhone, { message: `Hello ${displayName}, reaching out from GGD Ad Network!` })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 h-7 sm:h-8 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                      title="Chat on WhatsApp"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </a>
                  </>
                )}

                <div className="hidden min-[420px]:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-black">
                  <UserCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Contact In Phonebook</span>
                </div>
              </div>
            ) : (
              // Not Saved State: 1-Click Save Contact Button
              <Button
                type="button"
                size="sm"
                disabled={loading}
                onClick={handleSaveContact}
                className="bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 hover:from-orange-600 hover:to-rose-600 text-white font-extrabold text-xs h-8 sm:h-9 px-3 sm:px-4 rounded-xl shadow-md shadow-orange-500/30 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                title="1-Click Save Contact to your phone & connect"
              >
                <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Save Contact</span>
                <Download className="h-3 w-3 opacity-80" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatContactMatchmaker;
