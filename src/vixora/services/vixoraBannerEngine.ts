// Vixora AI Banner Advert & Professional Graphic Designer Engine

export type BannerFormat = '300x250' | '728x90' | '1080x1080' | '1080x1350' | '1080x1920' | '320x100';

export interface BannerDesignOptions {
  headline: string;
  subheadline?: string;
  ctaText?: string;
  brandName?: string;
  badgeText?: string;
  format?: BannerFormat;
  themeColor?: 'orange' | 'gold' | 'emerald' | 'cyber' | 'dark' | 'blue';
  backgroundImageUrl?: string;
  backgroundImageElement?: HTMLImageElement;
}

export interface GeneratedBannerResult {
  dataUrl: string;
  width: number;
  height: number;
  format: BannerFormat;
  headline: string;
  ctaText: string;
}

export function generateBannerAdvertCanvas(options: BannerDesignOptions): GeneratedBannerResult {
  const format = options.format || '300x250';
  
  let width = 300;
  let height = 250;
  if (format === '728x90') {
    width = 728;
    height = 90;
  } else if (format === '1080x1080') {
    width = 1080;
    height = 1080;
  } else if (format === '1080x1350') {
    width = 1080;
    height = 1350;
  } else if (format === '1080x1920') {
    width = 1080;
    height = 1920;
  } else if (format === '320x100') {
    width = 320;
    height = 100;
  }

  // Use 2x scale for ultra-crisp retina display
  const scale = width < 500 ? 2 : 1;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { dataUrl: '', width, height, format, headline: options.headline, ctaText: options.ctaText || 'Learn More' };
  }

  ctx.scale(scale, scale);

  const theme = options.themeColor || 'orange';

  // 1. Draw Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  if (theme === 'gold') {
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.4, '#261b07');
    bgGrad.addColorStop(1, '#d97706');
  } else if (theme === 'emerald') {
    bgGrad.addColorStop(0, '#022c22');
    bgGrad.addColorStop(0.4, '#064e3b');
    bgGrad.addColorStop(1, '#059669');
  } else if (theme === 'cyber') {
    bgGrad.addColorStop(0, '#0b0f19');
    bgGrad.addColorStop(0.5, '#4c1d95');
    bgGrad.addColorStop(1, '#ec4899');
  } else if (theme === 'blue') {
    bgGrad.addColorStop(0, '#030712');
    bgGrad.addColorStop(0.4, '#1e3a8a');
    bgGrad.addColorStop(1, '#0284c7');
  } else {
    // Vixora signature dark orange
    bgGrad.addColorStop(0, '#080c14');
    bgGrad.addColorStop(0.5, '#1e1b4b');
    bgGrad.addColorStop(1, '#ea580c');
  }

  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Draw Optional Background Image overlay
  if (options.backgroundImageElement) {
    try {
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.drawImage(options.backgroundImageElement, 0, 0, width, height);
      ctx.restore();
    } catch (e) {}
  }

  // 3. Decorative Mesh Orbs
  ctx.save();
  ctx.filter = 'blur(40px)';
  ctx.fillStyle = theme === 'gold' ? 'rgba(245, 158, 11, 0.25)' : theme === 'emerald' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(249, 115, 22, 0.3)';
  ctx.beginPath();
  ctx.arc(width * 0.85, height * 0.2, Math.min(width, height) * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
  ctx.beginPath();
  ctx.arc(width * 0.15, height * 0.85, Math.min(width, height) * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Subtle Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Layout Rendering based on Format
  const brand = options.brandName || 'GGD Ad Network';
  const headline = options.headline || 'Accelerate Your Brand Today';
  const subheadline = options.subheadline || 'Reach verified targeted audiences & monetize viral traffic effortlessly.';
  const cta = options.ctaText || 'Get Started Now →';
  const badge = options.badgeText || '⚡ VERIFIED SPONSOR';

  if (format === '728x90') {
    // Leaderboard Layout (Horizontal)
    // Brand & Badge on Left
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.roundRect(16, 16, 130, 22, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 10px sans-serif';
    ctx.fillText(badge.slice(0, 20), 24, 31);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 18px sans-serif';
    ctx.fillText(headline.slice(0, 42), 160, 36);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 12px sans-serif';
    ctx.fillText((subheadline || brand).slice(0, 68), 160, 62);

    // CTA Button on Far Right
    const btnW = 150;
    const btnH = 46;
    const btnX = width - btnW - 20;
    const btnY = (height - btnH) / 2;
    drawGlossyButton(ctx, btnX, btnY, btnW, btnH, cta, theme);

  } else if (format === '300x250') {
    // Medium Rectangle Layout (Box)
    // Top Badge Header
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(14, 14, 120, 20, 10);
    ctx.fill();
    ctx.fillStyle = '#fdba74';
    ctx.font = '800 9px sans-serif';
    ctx.fillText(badge.slice(0, 20), 22, 28);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 9.5px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(brand.slice(0, 24), width - 16, 28);
    ctx.textAlign = 'left';

    // Headline (Wrapped)
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 19px sans-serif';
    const headlineLines = wrapText(ctx, headline, width - 28);
    let curY = 64;
    headlineLines.slice(0, 3).forEach(line => {
      ctx.fillText(line, 14, curY);
      curY += 24;
    });

    // Subheadline
    if (subheadline) {
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '500 11.5px sans-serif';
      const subLines = wrapText(ctx, subheadline, width - 28);
      curY += 4;
      subLines.slice(0, 2).forEach(line => {
        ctx.fillText(line, 14, curY);
        curY += 16;
      });
    }

    // CTA Button pinned near bottom
    const btnW = width - 28;
    const btnH = 44;
    const btnX = 14;
    const btnY = height - btnH - 14;
    drawGlossyButton(ctx, btnX, btnY, btnW, btnH, cta, theme);

  } else if (format === '320x100') {
    // Mobile Banner Layout
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.roundRect(10, 10, 85, 18, 5);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 8px sans-serif';
    ctx.fillText('⚡ FEATURED', 16, 22);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 13px sans-serif';
    const lines = wrapText(ctx, headline, 190);
    ctx.fillText(lines[0] || headline, 10, 45);
    if (lines[1]) ctx.fillText(lines[1], 10, 62);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 9px sans-serif';
    ctx.fillText(brand.slice(0, 24), 10, 82);

    // CTA
    drawGlossyButton(ctx, width - 105, 28, 95, 42, cta, theme, 10);

  } else {
    // Large Social Posters / Flyers (1080x1080, 1080x1350, 1080x1920)
    // Scale factor
    const pad = 64;
    // Top Bar
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.roundRect(pad, pad, 260, 52, 26);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px sans-serif';
    ctx.fillText(`⚡ ${badge.toUpperCase()}`, pad + 24, pad + 33);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 24px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(brand.toUpperCase(), width - pad, pad + 35);
    ctx.textAlign = 'left';

    // Massive High-Impact Headline
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 68px sans-serif';
    const headLines = wrapText(ctx, headline, width - pad * 2);
    let textY = pad + 160;
    headLines.slice(0, 4).forEach(line => {
      ctx.fillText(line, pad, textY);
      textY += 82;
    });

    // Subheadline
    if (subheadline) {
      textY += 24;
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '500 34px sans-serif';
      const subLines = wrapText(ctx, subheadline, width - pad * 2);
      subLines.slice(0, 3).forEach(line => {
        ctx.fillText(line, pad, textY);
        textY += 48;
      });
    }

    // Feature Card in center
    const cardH = 240;
    const cardY = textY + 40;
    if (cardY + cardH < height - 200) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(pad, cardY, width - pad * 2, cardH, 28);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fdba74';
      ctx.font = '800 28px sans-serif';
      ctx.fillText('✨ POWERED BY GGD AD NETWORK & VIXORA AI', pad + 36, cardY + 60);

      ctx.fillStyle = '#ffffff';
      ctx.font = '500 24px sans-serif';
      ctx.fillText('• 100% Verified Community Reach & Instant Social Syndication', pad + 36, cardY + 115);
      ctx.fillText('• High CTR Retention Graphics & Video Sequences', pad + 36, cardY + 165);
    }

    // Mega Call To Action Button
    const btnW = width - pad * 2;
    const btnH = 92;
    const btnX = pad;
    const btnY = height - pad - btnH;
    drawGlossyButton(ctx, btnX, btnY, btnW, btnH, cta, theme, 30);
  }

  const dataUrl = canvas.toDataURL('image/png', 0.95);
  return {
    dataUrl,
    width,
    height,
    format,
    headline,
    ctaText: cta
  };
}

function drawGlossyButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  theme: string,
  fontSize?: number
) {
  ctx.save();
  // Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;

  const btnGrad = ctx.createLinearGradient(x, y, x, y + h);
  if (theme === 'gold') {
    btnGrad.addColorStop(0, '#fbbf24');
    btnGrad.addColorStop(1, '#d97706');
  } else if (theme === 'emerald') {
    btnGrad.addColorStop(0, '#34d399');
    btnGrad.addColorStop(1, '#059669');
  } else if (theme === 'cyber') {
    btnGrad.addColorStop(0, '#f472b6');
    btnGrad.addColorStop(1, '#db2777');
  } else if (theme === 'blue') {
    btnGrad.addColorStop(0, '#38bdf8');
    btnGrad.addColorStop(1, '#0284c7');
  } else {
    btnGrad.addColorStop(0, '#fb923c');
    btnGrad.addColorStop(1, '#ea580c');
  }

  ctx.fillStyle = btnGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();

  ctx.restore();

  // Subtle top highlight
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x + 1, y + 1, w - 2, h - 2, h / 2);
  ctx.stroke();
  ctx.restore();

  // Button Text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const calculatedFont = fontSize || (h < 50 ? 12 : 16);
  ctx.font = `900 ${calculatedFont}px sans-serif`;
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}
