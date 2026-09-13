export interface FeaturedAdPayload {
  id?: string;
  sponsorName: string;
  badge?: string;
  title: string;
  description: string;
  imageUrl: string;
  ctaText: string;
  ctaUrl: string;
  tagline?: string;
}

export interface EmailTemplateOptions {
  title: string;
  subtitle?: string;
  message: string;
  brandName?: string;
  brandLogoUrl?: string;
  recipientName?: string;
  activityKey?: string;
  ctaButton?: {
    text: string;
    url: string;
    color?: string;
  };
  keyStats?: Array<{
    label: string;
    value: string;
    icon?: string;
  }>;
  featuredAd?: FeaturedAdPayload | null;
  includeFeaturedAd?: boolean;
}

export const DEFAULT_FEATURED_ADS: FeaturedAdPayload[] = [
  {
    id: 'youtube-watchhours',
    sponsorName: 'GGD Creator Studio',
    badge: '🚀 VIRAL SPOTLIGHT',
    title: 'Unlock 4,000 Watch Hours & 1,000 Subscribers',
    description: 'Skyrocket your YouTube channel monetization with organic syndicate engagement and genuine high-retention 4K views.',
    imageUrl: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=800&q=80',
    ctaText: 'Boost My Channel Now',
    ctaUrl: 'https://ais-dev-3vvav7h6yin5adk2dkctkf-140076625502.europe-west1.run.app/?tab=syndicate',
    tagline: 'Trusted by over 10,000+ creators worldwide',
  },
  {
    id: 'syndicate-70percent',
    sponsorName: 'GGD Syndicate Elite',
    badge: '💰 70% COMMISSION OFFER',
    title: 'Earn 70% Recurring Commissions as a Promoter',
    description: 'Promote verified merchant campaigns and receive automatic instant Paystack subaccount direct bank payouts every single day.',
    imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80',
    ctaText: 'Join VIP Syndicate',
    ctaUrl: 'https://ais-dev-3vvav7h6yin5adk2dkctkf-140076625502.europe-west1.run.app/?tab=syndicate-register',
    tagline: 'Zero hidden fees • Instant NUBAN settlements',
  },
  {
    id: 'business-storefront',
    sponsorName: 'GGD Marketplace & Verified Ads',
    badge: '🛍️ FEATURED MERCHANT',
    title: 'Launch Your Global Digital Storefront in 60s',
    description: 'Showcase products, digital downloads, and coaching services to high-intent buyers across the entire ad network.',
    imageUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80',
    ctaText: 'Explore Storefronts',
    ctaUrl: 'https://ais-dev-3vvav7h6yin5adk2dkctkf-140076625502.europe-west1.run.app/?tab=store',
    tagline: 'Verified Badge & Free Escrow Protection',
  },
  {
    id: 'ai-blog-marketing',
    sponsorName: 'BlogMate AI & Editorial Network',
    badge: '✍️ CONTENT REVOLUTION',
    title: 'Auto-Generate SEO-Dominant Blog Articles & 3D Covers',
    description: 'Create high-converting long-form editorial posts with Gemini AI and publish them directly to our high-traffic community feed.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    ctaText: 'Create AI Blog Now',
    ctaUrl: 'https://ais-dev-3vvav7h6yin5adk2dkctkf-140076625502.europe-west1.run.app/?tab=feed',
    tagline: 'Rank on Google • Drive 10x More Clicks',
  },
];

/**
 * Generates an email HTML string designed with:
 * - Sleek, mobile-first responsive layout (Dark / Charcoal Luxury aesthetic)
 * - Brand gradient header with glowing logo emblem
 * - High-contrast readable typography
 * - Key Statistics / Summary highlights badge
 * - Prominent Call-To-Action (CTA) Button
 * - High-Converting Featured Ads Banner / Card Section
 * - Professional footer with security note & un-subscribe links
 */
export function generateModernEmailHtml(options: EmailTemplateOptions): string {
  const {
    title,
    subtitle,
    message,
    brandName = 'GGD Ad Network',
    brandLogoUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
    recipientName = 'Valued Member',
    ctaButton,
    keyStats,
    featuredAd = DEFAULT_FEATURED_ADS[0],
    includeFeaturedAd = true,
  } = options;

  const currentYear = new Date().getFullYear();
  const selectedAd = featuredAd || DEFAULT_FEATURED_ADS[0];

  // Render Key Stats Rows if provided
  let statsHtml = '';
  if (keyStats && keyStats.length > 0) {
    statsHtml = `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background: #22272e; border: 1px solid #374151; border-radius: 12px; overflow: hidden;">
        <tr>
          ${keyStats
            .map(
              (stat, i) => `
            <td align="center" style="padding: 14px 10px; ${i > 0 ? 'border-left: 1px solid #374151;' : ''}">
              <div style="font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px;">${stat.label}</div>
              <div style="font-size: 16px; font-weight: 800; color: #f97316; margin-top: 4px;">${stat.value}</div>
            </td>
          `
            )
            .join('')}
        </tr>
      </table>
    `;
  }

  // Render Primary Action Button
  let ctaHtml = '';
  if (ctaButton && ctaButton.text && ctaButton.url) {
    ctaHtml = `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0 12px;">
        <tr>
          <td align="center">
            <a href="${ctaButton.url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
              ${ctaButton.text} &rarr;
            </a>
          </td>
        </tr>
      </table>
    `;
  }

  // Render Featured Ads Section (High-Converting Sponsor Banner)
  let adSectionHtml = '';
  if (includeFeaturedAd && selectedAd) {
    adSectionHtml = `
      <!-- ================= FEATURED SPONSOR AD PLACEMENT ================= -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 28px; border-top: 1px dashed #374151; padding-top: 24px;">
        <tr>
          <td>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <span style="display: inline-block; font-size: 10px; font-weight: 900; color: #fbbf24; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                ${selectedAd.badge || '🌟 FEATURED SPONSOR AD'}
              </span>
              <span style="font-size: 11px; color: #6b7280; font-weight: 600;">Promoted Partner</span>
            </div>

            <!-- Ad Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1e1b4b 0%, #172554 50%, #0f172a 100%); border: 1px solid #6366f1; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
              ${
                selectedAd.imageUrl
                  ? `
                <tr>
                  <td>
                    <a href="${selectedAd.ctaUrl}" target="_blank" style="text-decoration: none; display: block;">
                      <img src="${selectedAd.imageUrl}" alt="${selectedAd.title}" width="100%" style="width: 100%; max-height: 180px; object-fit: cover; display: block; border-bottom: 1px solid rgba(99, 102, 241, 0.4);" />
                    </a>
                  </td>
                </tr>
              `
                  : ''
              }
              <tr>
                <td style="padding: 20px 22px;">
                  <div style="font-size: 11px; font-weight: 700; color: #a5b4fc; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                    ${selectedAd.sponsorName}
                  </div>
                  <h3 style="margin: 0 0 8px; font-size: 17px; font-weight: 800; color: #ffffff; line-height: 1.35;">
                    ${selectedAd.title}
                  </h3>
                  <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.55; color: #cbd5e1;">
                    ${selectedAd.description}
                  </p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <a href="${selectedAd.ctaUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 800; padding: 10px 22px; border-radius: 10px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);">
                          ${selectedAd.ctaText} &rarr;
                        </a>
                      </td>
                      ${
                        selectedAd.tagline
                          ? `
                        <td align="right" style="font-size: 10px; color: #94a3b8; font-style: italic;">
                          ${selectedAd.tagline}
                        </td>
                      `
                          : ''
                      }
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <!-- ================= END FEATURED AD PLACEMENT ================= -->
    `;
  }

  // Format message lines into paragraphs
  const formattedMessage = message
    .split('\n\n')
    .map((p) => `<p style="margin: 0 0 14px; font-size: 14px; line-height: 1.65; color: #e2e8f0;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    img { border: 0; outline: none; text-decoration: none; }
    table { border-collapse: collapse; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .content-cell { padding: 20px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0f19; padding: 32px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color: #111827; border: 1px solid #1f2937; border-radius: 20px; overflow: hidden; max-width: 600px; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          
          <!-- Header with Gradient Accent & Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%); padding: 22px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                      ⚡ ${brandName}
                    </div>
                    <div style="font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.9); margin-top: 2px;">
                      Official Community & Partner Notifications
                    </div>
                  </td>
                  <td align="right">
                    <span style="background: rgba(0,0,0,0.25); color: #ffffff; font-size: 10px; font-weight: 800; padding: 5px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid rgba(255,255,255,0.2);">
                      VERIFIED
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td class="content-cell" style="padding: 32px 28px; color: #f1f5f9;">
              <div style="font-size: 12px; font-weight: 700; color: #f97316; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">
                Hello, ${recipientName}
              </div>

              <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.35; letter-spacing: -0.3px;">
                ${title}
              </h1>

              ${
                subtitle
                  ? `
                <p style="margin: 0 0 18px; font-size: 14px; font-style: italic; color: #94a3b8; line-height: 1.5;">
                  "${subtitle}"
                </p>
              `
                  : ''
              }

              ${statsHtml}

              <!-- Body Copy -->
              <div style="margin: 16px 0;">
                ${formattedMessage}
              </div>

              ${ctaHtml}

              ${adSectionHtml}
            </td>
          </tr>

          <!-- Modern Footer -->
          <tr>
            <td style="background-color: #0c121e; padding: 22px 28px; border-top: 1px solid #1e293b; color: #64748b; font-size: 11px; line-height: 1.6;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 6px; color: #94a3b8; font-weight: 600;">
                      ${brandName} • Secure Ad & Syndicate Network
                    </p>
                    <p style="margin: 0;">
                      You received this email because activity notifications are enabled for your account.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 12px; border-top: 1px solid #1f2937; margin-top: 12px;">
                    <span style="color: #475569;">© ${currentYear} ${brandName}. All rights reserved. • Instant Paystack Settlement</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
