import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getDonorByReceiptId } from "@/lib/storage";
import { generateReceiptBuffer } from "@/lib/generateReceipt";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let safeName = id.replace(/[^a-zA-Z0-9\-\.]/g, "");

    if (!safeName.endsWith(".pdf")) {
      safeName = `${safeName}.pdf`;
    }

    const receiptsDir = path.join(process.cwd(), "public", "receipts");
    const filePath = path.join(receiptsDir, safeName);

    // Check if file exists; if not, try to regenerate from database
    let fileExists = false;
    try {
      await fs.access(filePath);
      fileExists = true;
    } catch {
      fileExists = false;
    }

    if (!fileExists) {
      const receiptId = safeName.replace(/\.pdf$/, "");
      const donor = await getDonorByReceiptId(receiptId);
      if (donor) {
        await fs.mkdir(receiptsDir, { recursive: true });
        const newPdfBuffer = await generateReceiptBuffer(donor);
        await fs.writeFile(filePath, newPdfBuffer);
        fileExists = true;
      }
    }

    if (!fileExists) {
      return NextResponse.json(
        { error: "Receipt not found" },
        { status: 404 }
      );
    }

    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Content-Length": String(fileBuffer.length),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Receipt download error:", err);
    return NextResponse.json(
      { error: "Failed to download receipt" },
      { status: 500 }
    );
  }
}
