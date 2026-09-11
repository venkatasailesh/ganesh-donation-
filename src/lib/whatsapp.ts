/**
 * WhatsApp Notification Service
 * 
 * Supports two modes:
 * 1. Deep-link generation (Free, zero-setup: opens WhatsApp with pre-filled message)
 * 2. Automated Server-side Delivery (via WhatsApp Business Cloud API / Meta Graph API)
 *    To enable automatic delivery, configure in .env.local:
 *    - WHATSAPP_API_TOKEN: Meta Graph API System User Token
 *    - WHATSAPP_PHONE_NUMBER_ID: Sender Phone Number ID from Meta WhatsApp Business dashboard
 */

export interface WhatsAppMessagePayload {
  toPhone: string; // 10-digit Indian phone number
  donorName: string;
  receiptId: string;
  amount: number;
  flatNumber: string;
  residentType?: string;
  paymentMode?: string;
  dateStr: string;
  receiptDownloadUrl?: string;
}

export function buildWhatsAppMessage(payload: WhatsAppMessagePayload): string {
  const payMode = payload.paymentMode || 'Cash';
  const resType = payload.residentType || 'Owner';
  
  let msg =
    `═══════════════════════\n` +
    `\u{1F3E0} *IRA HILL VIEW*\n` +
    `*APARTMENTS, TIRUPATI*\n` +
    `═══════════════════════\n\n` +
    `\u{1F549}\u{FE0F} *Ganesh Chaturthi Mahotsavam 2026*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Namaste *${payload.donorName}* ji \u{1F64F}\n\n` +
    `Thank you for your generous contribution towards our community Ganesh Chaturthi celebrations!\n\n` +
    `┌─────────────────────┐\n` +
    `│  \u{1F4CB} *RECEIPT DETAILS*        │\n` +
    `├─────────────────────┤\n` +
    `│ Receipt : *${payload.receiptId}*\n` +
    `│ Amount  : *\u20B9${payload.amount.toLocaleString("en-IN")}*\n` +
    `│ Flat      : *${payload.flatNumber}*\n` +
    `│ Type     : *${resType}*\n` +
    `│ Payment: *${payMode}*\n` +
    `│ Date     : *${payload.dateStr}*\n` +
    `└─────────────────────┘\n\n`;

  if (payload.receiptDownloadUrl) {
    msg += `\u{1F4CE} *Download Official Receipt:*\n${payload.receiptDownloadUrl}\n\n`;
  }

  msg +=
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `May Lord Ganesha & Sri Venkateswara Swamy bless your family with health, prosperity, and happiness! \u{2728}\n\n` +
    `\u{1F389} *Ganpati Bappa Morya!*\n` +
    `\u{1F64F} *Om Gam Ganapataye Namaha!*\n\n` +
    `_Ira Hill View Apartments_\n` +
    `_Settipalli, Tirupati - 517506_\n` +
    `═══════════════════════`;

  return msg;
}

export function getWhatsAppDeepLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Sends automated WhatsApp message via Meta WhatsApp Business Cloud API if configured.
 * Returns true if sent automatically, false otherwise.
 */
export async function sendAutomatedWhatsApp(
  payload: WhatsAppMessagePayload
): Promise<{ sent: boolean; message: string }> {
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!apiToken || !phoneNumberId) {
    return {
      sent: false,
      message: "WhatsApp Business API credentials not configured. Using pre-filled deep-link.",
    };
  }

  try {
    const cleanPhone = payload.toPhone.replace(/\D/g, "");
    const recipient = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const bodyText = buildWhatsAppMessage(payload);

    const res = await fetch(
      `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "text",
          text: { body: bodyText },
        }),
      }
    );

    if (res.ok) {
      return { sent: true, message: "Automated WhatsApp sent successfully!" };
    } else {
      const errData = await res.json();
      console.warn("WhatsApp Business API response:", errData);
      return { sent: false, message: "Automated delivery failed; falling back to deep-link." };
    }
  } catch (err) {
    console.error("WhatsApp delivery error:", err);
    return { sent: false, message: "Network error during WhatsApp API dispatch." };
  }
}
