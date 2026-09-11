import { getGatewaySettings } from "./settings";
import { Donor } from "./types";

export interface SendReceiptResult {
  success: boolean;
  message: string;
  provider?: string;
  details?: unknown;
}

export function formatRecipientPhone(phone: string, defaultPrefix = "91"): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${defaultPrefix}${digits}`;
  }
  return digits;
}

export function buildReceiptCaption(donor: Donor, publicReceiptUrl?: string): string {
  const dateFormatted = new Date(donor.createdAt).toLocaleDateString("en-IN");
  let msg =
    `\u{1F64F} *IRA HILL VIEW APARTMENTS \u2014 TIRUPATI*\n` +
    `\u{1F549}\u{FE0F} *Ganesh Chaturthi Mahotsavam 2026*\n\n` +
    `Dear *${donor.name}*,\n` +
    `Thank you for your generous contribution to our Ganesh Utsav!\n\n` +
    `\u{1F4CB} *Receipt No:* ${donor.receiptId}\n` +
    `\u{1F4B0} *Amount:* \u20B9${donor.amount.toLocaleString("en-IN")}\n` +
    `\u{1F3E0} *Flat:* ${donor.flatNumber} (Ira Hill View)\n` +
    `\u{1F4C5} *Date:* ${dateFormatted}\n\n` +
    `Please find your official PDF receipt attached to this message.\n\n` +
    `May Lord Ganesha and Sri Venkateswara Swamy bless you and your family!\n\n`;

  if (publicReceiptUrl && !publicReceiptUrl.includes("localhost")) {
    msg += `\u{1F4CE} *Online Link:* ${publicReceiptUrl}\n\n`;
  }

  msg += `\u{1F389} *Ganpati Bappa Morya!* \u{1F64F}`;
  return msg;
}

/**
 * Sends PDF receipt document automatically to the donor's WhatsApp number directly from user's phone.
 */
export async function sendReceiptViaGateway(
  donor: Donor,
  pdfBuffer: Buffer,
  pdfFilename: string,
  publicReceiptUrl?: string,
  overrideGatewayUrl?: string
): Promise<SendReceiptResult> {
  const settings = await getGatewaySettings();

  if (!settings.enabled || settings.provider === "disabled") {
    return {
      success: false,
      message: "WhatsApp sender is not enabled.",
      provider: "none",
    };
  }

  const recipientPhone = formatRecipientPhone(donor.phone, settings.phonePrefix);
  const caption = buildReceiptCaption(donor, publicReceiptUrl);

  return await sendViaLocalWhatsApp(
    recipientPhone,
    pdfBuffer,
    pdfFilename,
    caption,
    overrideGatewayUrl
  );
}

/**
 * Direct Local WhatsApp Sender (Multi-Device Baileys)
 * Connects directly to local WhatsApp service on http://localhost:5001 or cloud worker (Render)
 */
async function sendViaLocalWhatsApp(
  recipientPhone: string,
  pdfBuffer: Buffer,
  pdfFilename: string,
  caption: string,
  overrideGatewayUrl?: string
): Promise<SendReceiptResult> {
  try {
    const localUrl = (overrideGatewayUrl && overrideGatewayUrl.trim())
      ? overrideGatewayUrl.trim().replace(/\/$/, "")
      : (process.env.WHATSAPP_LOCAL_URL || "http://localhost:5001");
    const res = await fetch(`${localUrl}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: recipientPhone,
        pdfBase64: pdfBuffer.toString("base64"),
        filename: pdfFilename,
        caption: caption,
      }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      return {
        success: true,
        message: `Receipt PDF sent to +${recipientPhone} directly from your WhatsApp!`,
        provider: "local",
        details: data,
      };
    } else {
      return {
        success: false,
        message: data.message || "Failed to send via your WhatsApp. Check QR connection.",
        provider: "local",
        details: data,
      };
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Local WhatsApp service not running: ${errMsg}`,
      provider: "local",
    };
  }
}
