/**
 * Dynamic Open Graph (OG) Image Generator
 * Generates 1200x630 high-resolution branded OG cards with clean typography,
 * gradients, category badges, and GGD Ad Network branding.
 */

export interface OgImageOptions {
  title: string;
  description?: string | null;
  category?: string | null;
  badge?: string | null;
  siteName?: string;
  theme?: 'orange' | 'emerald' | 'purple' | 'dark' | 'gradient';
}

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text: string, maxCharsPerLine: number = 42, maxLines: number = 2): string[] {
  const words = (text || '').trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }
  return lines;
}

export function generateDynamicOgSvgUri(options: OgImageOptions): string {
  const {
    title = 'GGD Ad Network',
    description = 'Promote your business across WhatsApp, Telegram, TikTok & Facebook with verified local syndicates.',
    category = 'Ad Network & Marketplace',
    badge = 'GGD DIRECT',
    siteName = 'GGD AD NETWORK',
    theme = 'orange',
  } = options;

  const safeTitle = escapeXml(title.slice(0, 80));
  const titleLines = wrapText(title, 34, 3);
  const safeDescLines = wrapText(description || '', 55, 2);
  const safeBadge = escapeXml((badge || category || 'GGD AD NETWORK').toUpperCase().slice(0, 24));
  const safeSite = escapeXml(siteName.toUpperCase());

  // Themes
  const themeGradients: Record<string, { bg1: string; bg2: string; accent1: string; accent2: string; sphere1: string; sphere2: string }> = {
    orange: {
      bg1: '#0f172a',
      bg2: '#1e1b4b',
      accent1: '#f97316',
      accent2: '#ef4444',
      sphere1: 'rgba(249, 115, 22, 0.25)',
      sphere2: 'rgba(239, 68, 68, 0.20)',
    },
    emerald: {
      bg1: '#064e3b',
      bg2: '#022c22',
      accent1: '#10b981',
      accent2: '#059669',
      sphere1: 'rgba(16, 185, 129, 0.3)',
      sphere2: 'rgba(5, 150, 105, 0.25)',
    },
    purple: {
      bg1: '#1e1b4b',
      bg2: '#0f172a',
      accent1: '#8b5cf6',
      accent2: '#ec4899',
      sphere1: 'rgba(139, 92, 246, 0.3)',
      sphere2: 'rgba(236, 72, 153, 0.2)',
    },
    dark: {
      bg1: '#09090b',
      bg2: '#18181b',
      accent1: '#ea580c',
      accent2: '#f59e0b',
      sphere1: 'rgba(234, 88, 12, 0.25)',
      sphere2: 'rgba(245, 158, 11, 0.15)',
    },
    gradient: {
      bg1: '#18181b',
      bg2: '#09090b',
      accent1: '#f97316',
      accent2: '#ec4899',
      sphere1: 'rgba(249, 115, 22, 0.35)',
      sphere2: 'rgba(236, 72, 153, 0.25)',
    },
  };

  const currentTheme = themeGradients[theme] || themeGradients.orange;

  const svgContent = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${currentTheme.bg1}" />
      <stop offset="100%" stop-color="${currentTheme.bg2}" />
    </linearGradient>
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${currentTheme.accent1}" />
      <stop offset="100%" stop-color="${currentTheme.accent2}" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="80" result="blur" />
    </filter>
  </defs>

  <!-- Background base -->
  <rect width="1200" height="630" fill="url(#bg)" />

  <!-- Ambient glowing spheres -->
  <circle cx="1050" cy="150" r="320" fill="${currentTheme.sphere1}" filter="url(#glow)" />
  <circle cx="150" cy="500" r="280" fill="${currentTheme.sphere2}" filter="url(#glow)" />

  <!-- Grid overlay -->
  <g opacity="0.05">
    <path d="M0,70 H1200 M0,140 H1200 M0,210 H1200 M0,280 H1200 M0,350 H1200 M0,420 H1200 M0,490 H1200 M0,560 H1200" stroke="#ffffff" stroke-width="1" />
    <path d="M75,0 V630 M150,0 V630 M225,0 V630 M300,0 V630 M375,0 V630 M450,0 V630 M525,0 V630 M600,0 V630 M675,0 V630 M750,0 V630 M825,0 V630 M900,0 V630 M975,0 V630 M1050,0 V630 M1125,0 V630" stroke="#ffffff" stroke-width="1" />
  </g>

  <!-- Content Card Container -->
  <rect x="70" y="60" width="1060" height="510" rx="28" fill="rgba(255, 255, 255, 0.03)" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1.5" />

  <!-- Top bar: Badge & Brand -->
  <g transform="translate(120, 120)">
    <!-- Pill Badge -->
    <rect x="0" y="0" width="${Math.max(140, safeBadge.length * 12 + 40)}" height="38" rx="19" fill="url(#brandGrad)" />
    <text x="${Math.max(140, safeBadge.length * 12 + 40) / 2}" y="24" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" letter-spacing="1.5" text-anchor="middle">${safeBadge}</text>

    <!-- Site Name Right-aligned -->
    <text x="960" y="26" fill="rgba(255, 255, 255, 0.75)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" letter-spacing="2" text-anchor="end">${safeSite}</text>
  </g>

  <!-- Main Headline (Title) -->
  <g transform="translate(120, 220)">
    ${titleLines.map((line, idx) => `
      <text x="0" y="${idx * 62}" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="900" letter-spacing="-1">${escapeXml(line)}</text>
    `).join('')}
  </g>

  <!-- Description / Subtext -->
  <g transform="translate(120, ${220 + titleLines.length * 62 + 20})">
    ${safeDescLines.map((line, idx) => `
      <text x="0" y="${idx * 30}" fill="rgba(255, 255, 255, 0.70)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="400">${escapeXml(line)}</text>
    `).join('')}
  </g>

  <!-- Bottom Bar: Verified Features / Platform Tags -->
  <g transform="translate(120, 510)">
    <!-- Brand Logo Circle -->
    <circle cx="20" cy="0" r="16" fill="url(#brandGrad)" />
    <text x="20" y="6" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="900" text-anchor="middle">⚡</text>

    <text x="48" y="5" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="700">Verified Platform &amp; Syndicate Network</text>

    <!-- Channels tags -->
    <text x="960" y="5" fill="rgba(255, 255, 255, 0.6)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="600" text-anchor="end">WhatsApp • Telegram • Facebook • TikTok • Web</text>
  </g>
</svg>
`.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
}

/**
 * Universal helper that returns a guaranteed valid OG image URL.
 * If a custom image exists, it is returned. Otherwise, generates a dynamic OG SVG.
 */
export function getUniversalOgImage(options: {
  image?: string | null;
  title: string;
  description?: string | null;
  category?: string | null;
  badge?: string | null;
  theme?: 'orange' | 'emerald' | 'purple' | 'dark' | 'gradient';
}): string {
  if (options.image && typeof options.image === 'string' && options.image.trim().length > 0) {
    // If it's a relative URL, qualify with origin if possible
    if (options.image.startsWith('/') && typeof window !== 'undefined') {
      return `${window.location.origin}${options.image}`;
    }
    return options.image;
  }

  return generateDynamicOgSvgUri({
    title: options.title,
    description: options.description,
    category: options.category,
    badge: options.badge,
    theme: options.theme,
  });
}
