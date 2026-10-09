import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';

interface StructuredChatMessageProps {
  text: string;
  isMine?: boolean;
  className?: string;
}

// Regex to detect URLs (http, https, www, or standard domain formats)
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;

function normalizeUrl(urlStr: string): string {
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
    return urlStr;
  }
  return `https://${urlStr}`;
}

function getDomainName(urlStr: string): string {
  try {
    const full = normalizeUrl(urlStr);
    const parsed = new URL(full);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return urlStr;
  }
}

export const StructuredChatMessage: React.FC<StructuredChatMessageProps> = ({
  text,
  isMine = false,
  className = '',
}) => {
  if (!text) return null;

  // Find all URLs in the message
  const urls: string[] = [];
  const parts: { type: 'text' | 'link'; content: string; url?: string }[] = [];
  
  let lastIndex = 0;
  const matches = Array.from(text.matchAll(URL_REGEX));

  for (const match of matches) {
    const matchStr = match[0];
    const matchIndex = match.index ?? 0;

    // Filter out simple trailing punctuations like . , ! ? ) ]
    let cleanUrl = matchStr;
    let trailingPunct = '';
    const punctMatch = cleanUrl.match(/[.,!?:;)\]]+$/);
    if (punctMatch) {
      trailingPunct = punctMatch[0];
      cleanUrl = cleanUrl.slice(0, -trailingPunct.length);
    }

    if (matchIndex > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, matchIndex),
      });
    }

    if (cleanUrl.length > 3 && (cleanUrl.includes('.') || cleanUrl.startsWith('http'))) {
      const fullUrl = normalizeUrl(cleanUrl);
      urls.push(fullUrl);
      parts.push({
        type: 'link',
        content: cleanUrl,
        url: fullUrl,
      });
    } else {
      parts.push({
        type: 'text',
        content: cleanUrl,
      });
    }

    if (trailingPunct) {
      parts.push({
        type: 'text',
        content: trailingPunct,
      });
    }

    lastIndex = matchIndex + matchStr.length;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  const primaryUrl = urls.length > 0 ? urls[0] : null;
  const primaryDomain = primaryUrl ? getDomainName(primaryUrl) : '';

  return (
    <div dir="ltr" className={`space-y-1.5 text-left [direction:ltr] ${className}`}>
      {/* Formatted Text with Clickable Links */}
      <p dir="ltr" className="whitespace-pre-wrap break-words leading-relaxed text-left [direction:ltr]">
        {parts.map((part, idx) => {
          if (part.type === 'link' && part.url) {
            return (
              <a
                key={idx}
                href={part.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`inline-flex items-baseline gap-0.5 font-bold underline transition-opacity hover:opacity-80 break-all ${
                  isMine
                    ? 'text-white underline-offset-2 decoration-white/70 hover:text-white'
                    : 'text-blue-600 dark:text-blue-400 underline-offset-2 decoration-blue-500/60 hover:text-blue-700'
                }`}
              >
                <span>{part.content}</span>
                <ExternalLink className="h-3 w-3 inline-block shrink-0 self-center opacity-80" />
              </a>
            );
          }
          return <React.Fragment key={idx}>{part.content}</React.Fragment>;
        })}
      </p>

      {/* Structured Link Preview Card for Chat Links */}
      {primaryUrl && (
        <a
          href={primaryUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`group mt-2 block rounded-xl border p-2 text-left transition-all duration-200 no-underline shadow-xs ${
            isMine
              ? 'bg-black/20 hover:bg-black/30 border-white/25 text-white'
              : 'bg-background/80 hover:bg-background border-border/80 text-foreground hover:border-orange-500/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${
                isMine ? 'bg-white/20' : 'bg-muted'
              }`}
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                  primaryDomain
                )}&sz=64`}
                alt=""
                className="h-4 w-4 rounded-xs object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <Globe className="h-4 w-4 opacity-60 hidden" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-xs ${
                    isMine ? 'bg-white/20 text-white' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                  }`}
                >
                  Link
                </span>
                <span
                  className={`text-xs font-bold truncate ${
                    isMine ? 'text-white' : 'text-foreground'
                  }`}
                >
                  {primaryDomain}
                </span>
              </div>
              <p
                className={`text-[11px] truncate mt-0.5 ${
                  isMine ? 'text-white/80' : 'text-muted-foreground'
                }`}
              >
                {primaryUrl}
              </p>
            </div>

            <div
              className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                isMine ? 'bg-white/20 text-white' : 'bg-orange-500/10 text-orange-600'
              }`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </div>
          </div>
        </a>
      )}
    </div>
  );
};

export default StructuredChatMessage;
