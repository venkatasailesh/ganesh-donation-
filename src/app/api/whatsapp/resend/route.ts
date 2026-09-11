import { NextRequest, NextResponse } from "next/server";
import { getDonorByReceiptId, getDonors } from "@/lib/storage";
import { generateReceiptBuffer } from "@/lib/generateReceipt";
import { sendReceiptViaGateway } from "@/lib/whatsappGateway";
import { buildWhatsAppMessage, getWhatsAppDeepLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { receiptId, donorId } = body;

    let donor = null;
    if (receiptId) {
      donor = await getDonorByReceiptId(receiptId);
    } else if (donorId) {
      const all = await getDonors();
      donor = all.find((d) => d.id === donorId) || null;
    }

    if (!donor) {
      return NextResponse.json(
        { success: false, message: "Donor record not found." },
        { status: 404 }
      );
    }

    const pdfFilename = `${donor.receiptId}.pdf`;
    const baseUrl = request.nextUrl.origin;
    const fullReceiptUrl = `${baseUrl}/api/receipt/${pdfFilename}`;

    // Prepare deep-link message (100% reliable)
    const dateFormatted = new Date(donor.createdAt).toLocaleDateString("en-IN");
    const message = buildWhatsAppMessage({
      toPhone: donor.phone,
      donorName: donor.name,
      receiptId: donor.receiptId,
      amount: donor.amount,
      flatNumber: donor.flatNumber,
      residentType: donor.residentType,
      paymentMode: donor.paymentMode,
      dateStr: dateFormatted,
      receiptDownloadUrl: fullReceiptUrl,
    });
    const whatsappUrl = getWhatsAppDeepLink(donor.phone, message);

    // Optional dispatch via local gateway worker if active
    let gatewaySuccess = false;
    let gatewayMessage = "Open chat via direct WhatsApp link.";
    try {
      const pdfBuffer = await generateReceiptBuffer(donor);
      const gatewayResult = await sendReceiptViaGateway(
        donor,
        pdfBuffer,
        pdfFilename,
        fullReceiptUrl
      );
      gatewaySuccess = gatewayResult.success;
      if (gatewayResult.message) gatewayMessage = gatewayResult.message;
    } catch {
      // Local gateway offline or not in use
    }

    return NextResponse.json({
      success: gatewaySuccess,
      message: gatewaySuccess
        ? `Receipt sent directly to +91 ${donor.phone} via WhatsApp!`
        : `Ready to send: Click to open WhatsApp chat.`,
      whatsappUrl,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Resend WhatsApp error:", err);
    return NextResponse.json(
      { success: false, message: `Error: ${errMsg}` },
      { status: 500 }
    );
  }
}
