import { NextRequest, NextResponse } from "next/server";
import { getDonorByReceiptId } from "@/lib/storage";
import { generateReceiptBuffer } from "@/lib/generateReceipt";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let safeName = id.replace(/[^a-zA-Z0-9\-\.]/g, "");
    const receiptId = safeName.replace(/\.pdf$/i, "");

    const donor = await getDonorByReceiptId(receiptId);
    if (!donor) {
      return NextResponse.json(
        { error: `Receipt "${receiptId}" not found in database.` },
        { status: 404 }
      );
    }

    // In-memory PDF buffer generation (100% serverless compatible, zero read-only filesystem writes)
    const pdfBuffer = await generateReceiptBuffer(donor);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${receiptId}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (err) {
    console.error("Receipt generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate receipt PDF" },
      { status: 500 }
    );
  }
}
