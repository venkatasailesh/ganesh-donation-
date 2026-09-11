import { NextRequest, NextResponse } from "next/server";
import { getDonors, updateDonor, deleteDonor, clearAllDonors } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const donors = await getDonors();
    return NextResponse.json(
      { success: true, donors },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err) {
    console.error("Error fetching donors:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch donors" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, phone, flatNumber, amount, residentType, paymentMode } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Donor ID or Receipt ID is required" },
        { status: 400 }
      );
    }

    if (name && name.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: "Resident name must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (phone && !/^[6-9]\d{9}$/.test(phone.replace(/\s/g, ""))) {
      return NextResponse.json(
        { success: false, message: "Enter a valid 10-digit Indian phone number" },
        { status: 400 }
      );
    }

    if (amount !== undefined && (isNaN(Number(amount)) || Number(amount) < 1)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid donation amount" },
        { status: 400 }
      );
    }

    const updated = await updateDonor({
      id,
      name,
      phone,
      flatNumber,
      amount: amount !== undefined ? Number(amount) : undefined,
      residentType,
      paymentMode,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Donation record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      donor: updated,
      message: `Donation ${updated.receiptId} updated successfully`,
    });
  } catch (err) {
    console.error("Error updating donor:", err);
    return NextResponse.json(
      { success: false, message: "Failed to update donation" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const clearAll = url.searchParams.get("clearAll") === "true";
    const id = url.searchParams.get("id");

    if (clearAll) {
      await clearAllDonors();
      return NextResponse.json({
        success: true,
        message: "All donation records cleared successfully.",
      });
    }

    if (id) {
      const deleted = await deleteDonor(id);
      if (!deleted) {
        return NextResponse.json(
          { success: false, message: "Donor record not found." },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: "Donation record deleted.",
      });
    }

    return NextResponse.json(
      { success: false, message: "Specify ?id=<id> or ?clearAll=true" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Error deleting donor:", err);
    return NextResponse.json(
      { success: false, message: "Failed to delete donation record" },
      { status: 500 }
    );
  }
}
