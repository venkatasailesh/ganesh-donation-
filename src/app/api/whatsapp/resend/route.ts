import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getDonorByReceiptId, getDonors } from "@/lib/storage";
import { generateReceiptBuffer } from "@/lib/generateReceipt";
import { sendReceiptViaGateway } from "@/lib/whatsappGateway";
import { buildWhatsAppMessage, getWhatsAppDeepLink } from "@/lib/whatsapp";

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
    const receiptsDir = path.join(process.cwd(), "public", "receipts");
    const pdfPath = path.join(receiptsDir, pdfFilename);

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await fs.readFile(pdfPath);
    } catch {
      pdfBuffer = await generateReceiptBuffer(donor);
      await fs.mkdir(receiptsDir, { recursive: true });
      await fs.writeFile(pdfPath, pdfBuffer);
    }

    const baseUrl = request.nextUrl.origin;
    const fullReceiptUrl = `${baseUrl}/api/receipt/${pdfFilename}`;

    // Attempt direct dispatch via local WhatsApp worker
    const gatewayResult = await sendReceiptViaGateway(
      donor,
      pdfBuffer,
      pdfFilename,
      fullReceiptUrl
    );

    // Also prepare deep-link
    const dateFormatted = new Date(donor.createdAt).toLocaleDateString("en-IN");
    const message = buildWhatsAppMessage({
      toPhone: donor.phone,
      donorName: donor.name,
      receiptId: donor.receiptId,
      amount: donor.amount,
      flatNumber: donor.flatNumber,
      dateStr: dateFormatted,
      receiptDownloadUrl: fullReceiptUrl,
    });
    const whatsappUrl = getWhatsAppDeepLink(donor.phone, message);

    return NextResponse.json({
      success: gatewayResult.success,
      message: gatewayResult.success
        ? `Receipt sent directly to +91 ${donor.phone} via your WhatsApp!`
        : `WhatsApp not yet paired: Open chat via WhatsApp link.`,
      whatsappUrl,
      details: gatewayResult,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Resend WhatsApp error:", err);
    return NextResponse.json(
      { success: false, message: `Error sending WhatsApp: ${errMsg}` },
      { status: 500 }
    );
  }
}
