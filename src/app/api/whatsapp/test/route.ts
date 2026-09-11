import { NextRequest, NextResponse } from "next/server";
import { generateReceiptBuffer } from "@/lib/generateReceipt";
import { sendReceiptViaGateway } from "@/lib/whatsappGateway";
import { Donor } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const phone = body.phone?.replace(/\s/g, "");

    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid 10-digit phone number for testing." },
        { status: 400 }
      );
    }

    // Create a dummy test donor
    const testDonor: Donor = {
      id: "test_" + Date.now(),
      receiptId: "GC-TEST-001",
      name: body.name || "Test Donor",
      phone: phone,
      amount: 1001,
      flatNumber: "TEST-101",
      residentType: "Owner",
      paymentMode: "Cash",
      createdAt: new Date().toISOString(),
    };

    // Generate test PDF
    const pdfBuffer = await generateReceiptBuffer(testDonor);
    const pdfFilename = `${testDonor.receiptId}.pdf`;

    // Attempt delivery via gateway
    const overrideGatewayUrl = body.gatewayUrl || request.headers.get("x-gateway-url") || undefined;
    const result = await sendReceiptViaGateway(
      testDonor,
      pdfBuffer,
      pdfFilename,
      `${request.nextUrl.origin}/api/receipt/${pdfFilename}`,
      overrideGatewayUrl
    );

    return NextResponse.json({
      success: result.success,
      message: result.message,
      provider: result.provider,
      details: result.details,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Test WhatsApp send error:", err);
    return NextResponse.json(
      { success: false, message: `Error sending test: ${errMsg}` },
      { status: 500 }
    );
  }
}
