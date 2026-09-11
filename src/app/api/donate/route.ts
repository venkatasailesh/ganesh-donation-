import { NextRequest, NextResponse } from "next/server";
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

    // Save donor to storage first
    await addDonor(donor);

    const pdfFilename = `${receiptId}.pdf`;
    const receiptUrl = `/api/receipt/${pdfFilename}`;
    const baseUrl = request.nextUrl.origin;
    const fullReceiptUrl = `${baseUrl}${receiptUrl}`;

    // Build WhatsApp deep-link (100% reliable, zero external dependencies)
    const dateFormatted = new Date(donor.createdAt).toLocaleDateString("en-IN");
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

    // Optional automated WhatsApp delivery via Gateway if configured and available
    let whatsappSent = false;
    let whatsappStatusMessage = "WhatsApp direct chat link generated.";
    try {
      const pdfBuffer = await generateReceiptBuffer(donor);
      const { sendReceiptViaGateway } = await import("@/lib/whatsappGateway");
      const gatewayResult = await sendReceiptViaGateway(
        donor,
        pdfBuffer,
        pdfFilename,
        fullReceiptUrl
      );
      whatsappSent = gatewayResult.success;
      whatsappStatusMessage = gatewayResult.message;
    } catch (gwErr) {
      console.warn("Automated gateway skipped/offline:", gwErr);
    }

    return NextResponse.json({
      success: true,
      message: "Donation recorded successfully!",
      receiptId,
      receiptUrl,
      whatsappUrl,
      donor,
      whatsappSent,
      whatsappStatusMessage,
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
