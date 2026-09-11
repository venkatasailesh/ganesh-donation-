import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { addDonor, getNextReceiptNumber } from "@/lib/storage";
import { generateReceiptBuffer } from "@/lib/generateReceipt";
import { Donor, DonationFormData, DonationResponse } from "@/lib/types";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function validateForm(data: DonationFormData): string | null {
  if (!data.name || data.name.trim().length < 2) {
    return "Name must be at least 2 characters long";
  }
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!data.phone || !phoneRegex.test(data.phone.replace(/\s/g, ""))) {
    return "Please enter a valid 10-digit Indian phone number";
  }
  if (!data.amount || data.amount < 1) {
    return "Donation amount must be at least ₹1";
  }
  if (!data.flatNumber || data.flatNumber.trim().length < 1) {
    return "Please enter your flat number";
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DonationFormData;

    // Validate
    const error = validateForm(body);
    if (error) {
      return NextResponse.json(
        { success: false, message: error } as DonationResponse,
        { status: 400 }
      );
    }

    // Generate receipt ID
    const receiptNum = await getNextReceiptNumber();
    const receiptId = `GC-2026-${String(receiptNum).padStart(4, "0")}`;
    const id = generateId();

    // Create donor record
    const donor: Donor = {
      id,
      receiptId,
      name: body.name.trim(),
      phone: body.phone.replace(/\s/g, ""),
      amount: body.amount,
      flatNumber: body.flatNumber.trim().toUpperCase(),
      residentType: body.residentType || 'Owner',
      paymentMode: body.paymentMode || 'Cash',
      createdAt: new Date().toISOString(),
    };

    // Generate PDF receipt
    const pdfBuffer = await generateReceiptBuffer(donor);
    const receiptsDir = path.join(process.cwd(), "public", "receipts");
    await fs.mkdir(receiptsDir, { recursive: true });
    const pdfFilename = `${receiptId}.pdf`;
    await fs.writeFile(path.join(receiptsDir, pdfFilename), pdfBuffer);

    // Save donor to storage
    await addDonor(donor);

    // Build WhatsApp deep-link & attempt automated dispatch
    const dateFormatted = new Date(donor.createdAt).toLocaleDateString("en-IN");
    const receiptUrl = `/api/receipt/${pdfFilename}`;
    const baseUrl = request.nextUrl.origin;
    const fullReceiptUrl = `${baseUrl}${receiptUrl}`;

    // 1. Build WhatsApp deep-link as fallback
    const { buildWhatsAppMessage, getWhatsAppDeepLink } = await import("@/lib/whatsapp");
    const messagePayload = {
      toPhone: donor.phone,
      donorName: donor.name,
      receiptId: donor.receiptId,
      amount: donor.amount,
      flatNumber: donor.flatNumber,
      residentType: donor.residentType,
      paymentMode: donor.paymentMode,
      dateStr: dateFormatted,
      receiptDownloadUrl: fullReceiptUrl,
    };

    const whatsappMessage = buildWhatsAppMessage(messagePayload);
    const whatsappUrl = getWhatsAppDeepLink(donor.phone, whatsappMessage);

    // 2. Automated WhatsApp delivery via Gateway (UltraMsg / Green API)
    const { sendReceiptViaGateway } = await import("@/lib/whatsappGateway");
    const gatewayResult = await sendReceiptViaGateway(
      donor,
      pdfBuffer,
      pdfFilename,
      fullReceiptUrl
    );

    return NextResponse.json({
      success: true,
      message: "Donation recorded successfully!",
      receiptId,
      receiptUrl,
      whatsappUrl,
      donor,
      whatsappSent: gatewayResult.success,
      whatsappStatusMessage: gatewayResult.message,
    } as DonationResponse);
  } catch (err) {
    console.error("Donation error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong. Please try again.",
      } as DonationResponse,
      { status: 500 }
    );
  }
}
