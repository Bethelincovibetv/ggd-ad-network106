import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { dispatchEmailViaActiveGateway } from '@/services/emailGatewayService';
import { triggerRealtimePush } from '@/services/pushNotificationService';

export interface VerificationEmailNotificationParams {
  userId: string;
  userEmail?: string;
  businessName: string;
  status: 'VERIFIED' | 'REJECTED' | 'UNDER_REVIEW' | 'PENDING' | 'REVOKED';
  documentType?: string;
  documentNumber?: string;
  adminNote?: string;
  rejectionReason?: string;
  actionUrl?: string;
}

export interface NewEnquiryEmailNotificationParams {
  recipientUserId: string;
  recipientEmail?: string;
  recipientName?: string;
  businessName?: string;
  senderUserId: string;
  senderName: string;
  senderEmail?: string;
  messageText: string;
  enquiryType?: 'general' | 'product_inquiry' | 'service_inquiry' | 'quote_request';
  itemTitle?: string;
  itemPrice?: number | string;
  chatUrl?: string;
}

/**
 * Helper to resolve user email from Supabase profiles, business profiles, or Firestore
 */
export async function resolveUserEmail(userId: string, fallbackEmail?: string): Promise<{ email: string; name: string }> {
  if (fallbackEmail && fallbackEmail.includes('@')) {
    return { email: fallbackEmail.trim(), name: 'Valued Merchant' };
  }

  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('email, display_name, business_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (prof?.email && prof.email.includes('@')) {
      return {
        email: prof.email.trim(),
        name: prof.business_name || prof.display_name || 'Valued Member',
      };
    }

    // Try business_profiles
    const { data: bizProf } = await (supabase.from('business_profiles') as any)
      .select('email, business_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (bizProf?.email && bizProf.email.includes('@')) {
      return {
        email: bizProf.email.trim(),
        name: bizProf.business_name || 'Valued Business',
      };
    }
  } catch (err) {
    console.warn('Could not resolve user email from Supabase:', err);
  }

  // Firestore fallback
  try {
    if (db) {
      const uRef = doc(db, 'users', userId);
      const uSnap = await getDoc(uRef);
      if (uSnap.exists()) {
        const uData = uSnap.data();
        if (uData.email) {
          return {
            email: uData.email,
            name: uData.displayName || uData.businessName || 'Valued Member',
          };
        }
      }
    }
  } catch {}

  return { email: fallbackEmail || '', name: 'Valued Member' };
}

/**
 * Generate responsive HTML email for Directory Verification Status Change
 */
export function buildVerificationStatusEmailHtml(params: {
  businessName: string;
  status: 'VERIFIED' | 'REJECTED' | 'UNDER_REVIEW' | 'PENDING' | 'REVOKED';
  documentType?: string;
  documentNumber?: string;
  adminNote?: string;
  rejectionReason?: string;
  actionUrl?: string;
}): { html: string; subject: string } {
  const isApproved = params.status === 'VERIFIED';
  const isRejected = params.status === 'REJECTED' || params.status === 'REVOKED';

  let subject = '';
  let statusBadgeColor = '#10B981';
  let statusTitle = '';
  let heroMessage = '';

  if (isApproved) {
    subject = `✅ Congratulations! ${params.businessName} Directory Verification Approved - GGD Network`;
    statusBadgeColor = '#10B981';
    statusTitle = 'VERIFIED ACCREDITED MERCHANT';
    heroMessage = `Great news! Your business directory verification for <strong>${params.businessName}</strong> has been officially approved. Your verified badge is now live across the GGD Directory, search rankings, and business storefront.`;
  } else if (isRejected) {
    subject = `⚠️ Directory Verification Update: Action Needed for ${params.businessName} - GGD Network`;
    statusBadgeColor = '#EF4444';
    statusTitle = 'VERIFICATION NOT APPROVED';
    heroMessage = `We have reviewed your business verification submission for <strong>${params.businessName}</strong>. Additional information or document re-submission is required to activate your verified directory badge.`;
  } else {
    subject = `📋 Business Directory Verification Under Review: ${params.businessName} - GGD Network`;
    statusBadgeColor = '#F59E0B';
    statusTitle = 'VERIFICATION UNDER MANUAL REVIEW';
    heroMessage = `Your directory verification submission for <strong>${params.businessName}</strong> is currently undergoing review by our compliance team.`;
  }

  const appBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-vlkquyovvesnmpcfmnn7sn-774292950030.europe-west2.run.app';
  const targetUrl = params.actionUrl || `${appBaseUrl}/?tab=business-directory`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 24px auto; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08); border: 1px solid #E2E8F0; }
    .header { background: linear-gradient(135deg, #FF6A00 0%, #EE0979 100%); padding: 32px 24px; text-align: center; color: #FFFFFF; }
    .logo-text { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin: 0; }
    .logo-sub { font-size: 13px; opacity: 0.92; font-weight: 600; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
    .body-content { padding: 32px 28px; }
    .badge-card { background-color: ${isApproved ? '#ECFDF5' : isRejected ? '#FEF2F2' : '#FFFBEB'}; border: 1.5px solid ${statusBadgeColor}; border-radius: 16px; padding: 20px; text-align: center; margin: 20px 0; }
    .badge-pill { display: inline-block; background-color: ${statusBadgeColor}; color: #FFFFFF; font-size: 12px; font-weight: 800; padding: 6px 16px; border-radius: 9999px; letter-spacing: 0.5px; margin-bottom: 8px; }
    .details-table { width: 100%; border-collapse: collapse; margin: 24px 0; background: #F8FAFC; border-radius: 12px; overflow: hidden; }
    .details-table td { padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-size: 14px; }
    .details-table td:first-child { font-weight: 700; color: #64748B; width: 38%; }
    .details-table td:last-child { font-weight: 600; color: #0F172A; }
    .btn-cta { display: inline-block; background: linear-gradient(135deg, #FF6A00 0%, #EA580C 100%); color: #FFFFFF !important; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.35); text-align: center; }
    .note-box { background: #F1F5F9; border-left: 4px solid #64748B; padding: 14px; border-radius: 8px; font-size: 13px; color: #334155; margin: 18px 0; }
    .footer { background: #0F172A; color: #94A3B8; text-align: center; padding: 24px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">GGD AD NETWORK</div>
      <div class="logo-sub">Official Directory Verification Notification</div>
    </div>

    <div class="body-content">
      <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin-top: 0;">Hello, ${params.businessName}</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">${heroMessage}</p>

      <div class="badge-card">
        <div class="badge-pill">${statusTitle}</div>
        <div style="font-size: 16px; font-weight: 800; color: #0F172A; margin-top: 4px;">${params.businessName}</div>
        <p style="font-size: 13px; color: #64748B; margin: 4px 0 0 0;">Directory Reference: ${params.documentNumber || 'CAC-NIN-VERIFIED'}</p>
      </div>

      <table class="details-table">
        <tr>
          <td>Business Name</td>
          <td>${params.businessName}</td>
        </tr>
        <tr>
          <td>Verification Status</td>
          <td><span style="color: ${statusBadgeColor}; font-weight: 800;">${params.status}</span></td>
        </tr>
        ${params.documentType ? `
        <tr>
          <td>Document Submitted</td>
          <td>${params.documentType} ${params.documentNumber ? `(${params.documentNumber})` : ''}</td>
        </tr>
        ` : ''}
        <tr>
          <td>Updated On</td>
          <td>${new Date().toUTCString()}</td>
        </tr>
      </table>

      ${params.adminNote || params.rejectionReason ? `
      <div class="note-box">
        <strong>Reviewer Comments & Feedback:</strong><br>
        ${params.adminNote || params.rejectionReason}
      </div>
      ` : ''}

      ${isApproved ? `
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <h4 style="margin: 0 0 8px 0; color: #166534; font-size: 14px; font-weight: 800;">🌟 Your Verified Merchant Perks Are Now Active:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #15803D; font-size: 13px; line-height: 1.6;">
          <li>Golden Verified Shield badge on your directory cards</li>
          <li>Higher ranking in the GGD Public Business Search Engine</li>
          <li>Instant trust boost for incoming customer leads and enquiries</li>
          <li>Access to featured marketplace spots and partner promotions</li>
        </ul>
      </div>
      ` : ''}

      <div style="text-align: center; margin: 30px 0 10px 0;">
        <a href="${targetUrl}" class="btn-cta">
          ${isApproved ? 'View Your Verified Directory Profile' : 'Access Verification Dashboard'}
        </a>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0; font-weight: 700; color: #E2E8F0;">GGD Ad Network & Business Directory</p>
      <p style="margin: 0 0 12px 0;">Connecting verified businesses, syndicates, and millions of customers across Africa.</p>
      <p style="margin: 0; font-size: 11px; opacity: 0.7;">This automated security alert was dispatched by GGD SMTP Gateway. To manage notification preferences, visit your account settings.</p>
    </div>
  </div>
</body>
</html>
  `;

  return { html, subject };
}

/**
 * Generate responsive HTML email for New Customer Enquiry
 */
export function buildNewEnquiryEmailHtml(params: {
  businessName?: string;
  recipientName?: string;
  senderName: string;
  senderEmail?: string;
  messageText: string;
  enquiryType?: string;
  itemTitle?: string;
  itemPrice?: number | string;
  chatUrl?: string;
}): { html: string; subject: string } {
  const senderDisplayName = params.senderName || 'A Potential Customer';
  const itemHeader = params.itemTitle ? ` Regarding "${params.itemTitle}"` : '';
  const subject = `📩 New Business Enquiry from ${senderDisplayName}${itemHeader} - GGD Network`;

  const appBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-vlkquyovvesnmpcfmnn7sn-774292950030.europe-west2.run.app';
  const targetChatUrl = params.chatUrl 
    ? (params.chatUrl.startsWith('http') ? params.chatUrl : `${appBaseUrl}${params.chatUrl.startsWith('/') ? '' : '/'}${params.chatUrl}`)
    : `${appBaseUrl}/?tab=inbox`;

  const priceTag = params.itemPrice ? `₦${Number(params.itemPrice).toLocaleString()}` : '';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 24px auto; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08); border: 1px solid #E2E8F0; }
    .header { background: linear-gradient(135deg, #0284C7 0%, #2563EB 100%); padding: 32px 24px; text-align: center; color: #FFFFFF; }
    .logo-text { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin: 0; }
    .logo-sub { font-size: 13px; opacity: 0.92; font-weight: 600; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
    .body-content { padding: 32px 28px; }
    .message-card { background-color: #F8FAFC; border: 1.5px solid #E2E8F0; border-left: 4px solid #0284C7; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .btn-cta { display: inline-block; background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%); color: #FFFFFF !important; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35); text-align: center; }
    .footer { background: #0F172A; color: #94A3B8; text-align: center; padding: 24px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">GGD BUSINESS INBOX</div>
      <div class="logo-sub">New Customer Enquiry Alert</div>
    </div>

    <div class="body-content">
      <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin-top: 0;">
        Hello, ${params.recipientName || params.businessName || 'Business Owner'} 👋
      </h2>
      <p style="font-size: 15px; line-height: 1.6; color: #334155;">
        You have received a new business customer enquiry on the GGD Network from <strong>${senderDisplayName}</strong>.
      </p>

      ${params.itemTitle ? `
      <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 14px 18px; margin: 16px 0;">
        <span style="font-size: 11px; font-weight: 800; color: #1D4ED8; text-transform: uppercase; letter-spacing: 0.5px;">Product / Service Inquired</span>
        <div style="font-size: 16px; font-weight: 800; color: #1E3A8A; margin-top: 2px;">
          ${params.itemTitle} ${priceTag ? `<span style="color: #EA580C; margin-left: 8px;">(${priceTag})</span>` : ''}
        </div>
      </div>
      ` : ''}

      <div class="message-card">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; font-weight: 700; color: #64748B;">
          <span>Sender: ${senderDisplayName}</span>
          <span>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div style="font-size: 15px; line-height: 1.6; color: #0F172A; font-style: italic; white-space: pre-wrap;">
          "${params.messageText}"
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0 14px 0;">
        <a href="${targetChatUrl}" class="btn-cta">
          💬 Reply to Enquiry in GGD Inbox
        </a>
      </div>

      <p style="font-size: 12px; color: #64748B; text-align: center; margin-top: 16px;">
        💡 <em>Fast response times increase order conversion rates by up to 300% on GGD Marketplace.</em>
      </p>
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0; font-weight: 700; color: #E2E8F0;">GGD Ad Network Messaging Engine</p>
      <p style="margin: 0 0 12px 0;">Instant live business chat & multi-channel notification infrastructure.</p>
      <p style="margin: 0; font-size: 11px; opacity: 0.7;">This automated alert was dispatched by GGD SMTP Gateway.</p>
    </div>
  </div>
</body>
</html>
  `;

  return { html, subject };
}

/**
 * Sends automated email notification and targeted in-app notification for verification changes
 */
export async function notifyVerificationStatusChange(params: VerificationEmailNotificationParams): Promise<boolean> {
  const { userId, businessName, status } = params;

  // 1. Resolve user email & name
  const { email: resolvedEmail } = await resolveUserEmail(userId, params.userEmail);

  // 2. Build email template
  const { html, subject } = buildVerificationStatusEmailHtml({
    businessName: businessName || 'Business Member',
    status,
    documentType: params.documentType,
    documentNumber: params.documentNumber,
    adminNote: params.adminNote,
    rejectionReason: params.rejectionReason,
    actionUrl: params.actionUrl,
  });

  // 3. Dispatch via SMTP Gateway if email resolved
  if (resolvedEmail && resolvedEmail.includes('@')) {
    try {
      await dispatchEmailViaActiveGateway({
        recipientEmail: resolvedEmail,
        subject,
        htmlContent: html,
        senderName: 'GGD Directory Verification',
        scenarioId: `verification_status_${status.toLowerCase()}`,
      });
    } catch (emailErr) {
      console.warn('Automated verification email dispatch note:', emailErr);
    }
  }

  // 4. Dispatch targeted in-app push notification strictly for this userId
  const title = status === 'VERIFIED'
    ? '✅ Directory Verification Approved!'
    : status === 'REJECTED' || status === 'REVOKED'
    ? '⚠️ Directory Verification Update'
    : '📋 Directory Verification Submitted';

  const body = status === 'VERIFIED'
    ? `Congratulations! ${businessName || 'Your business'} has been officially verified with the Golden Shield Badge.`
    : status === 'REJECTED' || status === 'REVOKED'
    ? `Your verification status has been updated. ${params.adminNote || params.rejectionReason || 'Please review requirements.'}`
    : `Your verification submission for ${businessName || 'your business'} is under review.`;

  await triggerRealtimePush({
    userId,
    title,
    body,
    type: 'system',
    url: '/?tab=business-directory',
    saveToDb: true,
  });

  return true;
}

/**
 * Sends automated email notification and targeted in-app notification when a new enquiry is received
 */
export async function notifyNewEnquiry(params: NewEnquiryEmailNotificationParams): Promise<boolean> {
  const { recipientUserId, senderUserId, senderName, messageText } = params;

  // Never notify if sender is the recipient
  if (senderUserId === recipientUserId) return true;

  // 1. Resolve recipient email
  const { email: resolvedEmail, name: resolvedRecipientName } = await resolveUserEmail(
    recipientUserId,
    params.recipientEmail
  );

  const chatUrl = params.chatUrl || `/inbox?chat=${senderUserId}`;

  // 2. Build email template
  const { html, subject } = buildNewEnquiryEmailHtml({
    businessName: params.businessName || resolvedRecipientName,
    recipientName: params.recipientName || resolvedRecipientName,
    senderName,
    senderEmail: params.senderEmail,
    messageText,
    enquiryType: params.enquiryType,
    itemTitle: params.itemTitle,
    itemPrice: params.itemPrice,
    chatUrl,
  });

  // 3. Dispatch via SMTP Gateway if email available
  if (resolvedEmail && resolvedEmail.includes('@')) {
    try {
      await dispatchEmailViaActiveGateway({
        recipientEmail: resolvedEmail,
        subject,
        htmlContent: html,
        senderName: 'GGD Business Inbox',
        scenarioId: 'new_customer_enquiry',
      });
    } catch (emailErr) {
      console.warn('Automated enquiry email dispatch note:', emailErr);
    }
  }

  // 4. Dispatch targeted in-app notification strictly for recipientUserId
  const itemTag = params.itemTitle ? ` for "${params.itemTitle}"` : '';
  const notifTitle = `💬 New Enquiry from ${senderName}${itemTag}`;
  const notifBody = messageText.length > 110 ? `${messageText.slice(0, 107)}...` : messageText;

  await triggerRealtimePush({
    userId: recipientUserId,
    title: notifTitle,
    body: notifBody,
    type: 'chat',
    url: chatUrl,
    saveToDb: true,
  });

  return true;
}
