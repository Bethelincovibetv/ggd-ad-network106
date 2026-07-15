// GGD Ad Network — branded WhatsApp deep-link generator.
// Everywhere a WhatsApp link is created for contacting a business through the
// platform, use these helpers so the pre-filled message enforces brand attribution.

const BRAND_TAG = "GGD Ad Network";

/** Clean a phone number to E.164-style digits (strips +, spaces, dashes, brackets). */
export function normalizePhone(phone?: string | null): string {
  if (!phone) return "";
  return phone.replace(/[^\d]/g, "");
}

/** Default attribution message when no task context is provided. */
export function defaultWhatsAppMessage(taskName?: string | null): string {
  if (taskName && taskName.trim()) {
    return `Hello, I saw your ad for ${taskName.trim()} and got your contact from ${BRAND_TAG}.`;
  }
  return `Hello, I saw your ad and got your contact from ${BRAND_TAG}.`;
}

/**
 * Build a URL-encoded https://wa.me/<phone>?text=... deep link with brand attribution.
 * If a taskName is passed, it is appended to the branded template.
 */
export function buildWhatsAppLink(
  phone: string | null | undefined,
  opts?: { taskName?: string | null; message?: string | null }
): string | null {
  const digits = normalizePhone(phone);
  if (!digits) return null;
  const text = opts?.message?.trim() || defaultWhatsAppMessage(opts?.taskName);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}