// GGD Ad Network — branded WhatsApp deep-link and checkout generator.
// Formats international and Nigerian numbers with correct country dialing code (+234)
// and generates formatted, high-converting WhatsApp checkout receipts.

const BRAND_TAG = "GGD Ad Network";

export interface WhatsAppOrderPayload {
  productTitle: string;
  unitPrice: number | string;
  quantity?: number;
  totalAmount?: number | string;
  listingType?: 'product' | 'service' | string;
  customerName?: string;
  customerPhone?: string;
  deliveryState?: string;
  deliveryAddress?: string;
  paymentMethod?: string;
  variant?: string;
  notes?: string;
  productUrl?: string;
  businessName?: string;
  orderId?: string;
}

/**
 * Clean a phone number to standard international WhatsApp format without leading + or 00.
 * Automatically handles Nigerian numbers (080..., 090..., 070..., 081..., 091...) by prefixing '234'.
 */
export function normalizePhone(phone?: string | null): string {
  if (!phone) return "";
  
  // Strip whitespace, dashes, brackets, pluses, dots
  let digits = String(phone).replace(/[^\d]/g, "");
  if (!digits) return "";

  // Strip international dialing prefix '00' (e.g. 00234...)
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // Handle common typo: '234080...' -> replace '2340' with '234'
  if (digits.startsWith("2340") && digits.length === 14) {
    digits = "234" + digits.slice(4);
  }

  // If starts with 0 and length is 11 (e.g. 08031234567, 090..., 070..., 081...)
  if (digits.startsWith("0") && digits.length === 11) {
    digits = "234" + digits.slice(1);
  }

  // If starts with 0 and length is 10 (e.g. 0803123456)
  else if (digits.startsWith("0") && digits.length === 10) {
    digits = "234" + digits.slice(1);
  }

  // If 10 digits starting with 7, 8, or 9 (Nigerian number missing leading 0 and country code: 8031234567)
  else if (digits.length === 10 && /^[789]/.test(digits)) {
    digits = "234" + digits;
  }

  return digits;
}

export const formatWhatsAppNumber = normalizePhone;

/** Default attribution message when no task context is provided. */
export function defaultWhatsAppMessage(taskName?: string | null): string {
  if (taskName && taskName.trim()) {
    return `Hello, I saw your ad for ${taskName.trim()} and got your contact from ${BRAND_TAG}.`;
  }
  return `Hello, I saw your offer on ${BRAND_TAG} and would like to get in touch.`;
}

/**
 * Build a URL-encoded https://wa.me/<phone>?text=... deep link with brand attribution.
 * If phone is missing/invalid, falls back to https://wa.me/?text=... for contact picker.
 */
export function buildWhatsAppLink(
  phone: string | null | undefined,
  opts?: { taskName?: string | null; message?: string | null }
): string {
  const digits = normalizePhone(phone);
  const text = opts?.message?.trim() || defaultWhatsAppMessage(opts?.taskName);
  
  if (digits && digits.length >= 7) {
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Generates a clean, professional, high-converting WhatsApp checkout receipt.
 */
export function buildWhatsAppOrderMessage(payload: WhatsAppOrderPayload): string {
  const isService = payload.listingType === 'service';
  const qty = payload.quantity && payload.quantity > 0 ? payload.quantity : 1;
  const unitP = Number(payload.unitPrice) || 0;
  const total = payload.totalAmount != null ? Number(payload.totalAmount) : (unitP > 0 ? unitP * qty : 0);
  
  const priceFormatted = unitP > 0 ? `₦${unitP.toLocaleString()}` : 'Price on Inquiry / Custom Quote';
  const totalFormatted = total > 0 ? `₦${total.toLocaleString()}` : (unitP > 0 ? `₦${(unitP * qty).toLocaleString()}` : 'Pending Quote');

  const lines: string[] = [
    `🛍️ *${isService ? 'NEW SERVICE INQUIRY & ORDER' : 'NEW ORDER VIA GGD AD NETWORK'}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📦 *Item:* ${payload.productTitle.trim()}`,
    `🏷️ *Unit Price:* ${priceFormatted}`,
  ];

  if (!isService) {
    lines.push(`🔢 *Quantity:* ${qty}`);
    lines.push(`💰 *Total Amount:* ${totalFormatted}`);
  }

  if (payload.variant && payload.variant.trim()) {
    lines.push(`🎨 *Selected Option:* ${payload.variant.trim()}`);
  }

  lines.push(`\n👤 *CUSTOMER ORDER DETAILS:*`);

  if (payload.customerName && payload.customerName.trim()) {
    lines.push(`• *Name:* ${payload.customerName.trim()}`);
  }
  if (payload.customerPhone && payload.customerPhone.trim()) {
    lines.push(`• *Phone:* ${payload.customerPhone.trim()}`);
  }
  if (payload.deliveryState && payload.deliveryState.trim()) {
    lines.push(`• *State / Location:* ${payload.deliveryState.trim()}`);
  }
  if (payload.deliveryAddress && payload.deliveryAddress.trim()) {
    lines.push(`• *Delivery Address:* ${payload.deliveryAddress.trim()}`);
  }
  if (payload.paymentMethod && payload.paymentMethod.trim()) {
    lines.push(`• *Payment Choice:* ${payload.paymentMethod.trim()}`);
  }
  if (payload.notes && payload.notes.trim()) {
    lines.push(`• *Order Notes:* ${payload.notes.trim()}`);
  }

  if (payload.productUrl && payload.productUrl.trim()) {
    lines.push(`\n🔗 *Product Page:* ${payload.productUrl.trim()}`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`_Dispatched via GGD Verified Merchant Checkout._`);
  lines.push(`_Please confirm stock availability & order processing._`);

  return lines.join('\n');
}

/**
 * Builds the full direct WhatsApp Checkout URL with normalized international phone.
 */
export function buildWhatsAppOrderLink(
  phone: string | null | undefined,
  payload: WhatsAppOrderPayload
): string {
  const digits = normalizePhone(phone);
  const text = buildWhatsAppOrderMessage(payload);
  
  if (digits && digits.length >= 7) {
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
