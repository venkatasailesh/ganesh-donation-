import { NextResponse } from "next/server";
import { getDonors } from "@/lib/storage";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const donors = await getDonors();

    const totalAmount = donors.reduce((sum, d) => sum + d.amount, 0);
    const uniqueFlats = new Set(donors.map((d) => d.flatNumber.toUpperCase())).size;
    const ownerCount = donors.filter((d) => (d.residentType || "Owner") === "Owner").length;
    const rentCount = donors.filter((d) => d.residentType === "Rent").length;
    const cashTotal = donors.filter((d) => (d.paymentMode || "Cash") === "Cash").reduce((s, d) => s + d.amount, 0);
    const upiTotal = donors.filter((d) => d.paymentMode === "UPI").reduce((s, d) => s + d.amount, 0);

    // ==========================================
    // SHEET 1: Main Donation Records Register
    // ==========================================
    const recordsAoa: (string | number)[][] = [
      // Row 1 (A1:J1): Main Title Banner
      ["🕉 IRA HILL VIEW APARTMENTS — GANESH CHATURTHI UTSAV 2026 🕉"],
      // Row 2 (A2:J2): Subtitle
      ["Settipalli, Tirupati | Official Devotee Contribution Register"],
      // Row 3: Blank spacing
      [],
      // Row 4: Summary Highlight Banner
      [
        `Total Collection: ₹${totalAmount.toLocaleString("en-IN")}`,
        "",
        `Total Donors: ${donors.length}`,
        "",
        `Contributing Flats: ${uniqueFlats}`,
        "",
        `Cash: ₹${cashTotal.toLocaleString("en-IN")}`,
        `UPI: ₹${upiTotal.toLocaleString("en-IN")}`,
        `Report Date: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`,
        "",
      ],
      // Row 5: Blank spacing
      [],
      // Row 6: Table Column Headers
      [
        "S.No",
        "Receipt No",
        "Devotee / Resident Name",
        "Flat No",
        "Resident Type",
        "Payment Mode",
        "Donation Amount (₹)",
        "Contact Number",
        "Date",
        "Time",
      ],
    ];

    // Add donor rows
    donors.forEach((donor, index) => {
      const d = new Date(donor.createdAt);
      recordsAoa.push([
        index + 1,
        donor.receiptId,
        donor.name,
        donor.flatNumber,
        donor.residentType || "Owner",
        donor.paymentMode || "Cash",
        donor.amount,
        `+91 ${donor.phone}`,
        d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      ]);
    });

    // Totals Row
    recordsAoa.push([]);
    recordsAoa.push([
      "",
      "",
      "",
      "",
      "",
      "TOTAL COLLECTION (₹):",
      totalAmount,
      "",
      "",
      "",
    ]);
    recordsAoa.push([]);
    recordsAoa.push([
      `Ira Hill View Welfare Association • Settipalli, Tirupati • Ganesh Utsav Committee 2026 • Exported: ${new Date().toLocaleString("en-IN")}`,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(recordsAoa);

    // Merges for header titles and summary highlights
    const totalRowIndex = recordsAoa.length - 3;
    const footerRowIndex = recordsAoa.length - 1;
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // A1:J1 Title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }, // A2:J2 Subtitle
      { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } }, // Summary Box 1
      { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } }, // Summary Box 2
      { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } }, // Summary Box 3
      { s: { r: 3, c: 8 }, e: { r: 3, c: 9 } }, // Summary Box 4
      { s: { r: totalRowIndex, c: 0 }, e: { r: totalRowIndex, c: 4 } }, // Total label
      { s: { r: footerRowIndex, c: 0 }, e: { r: footerRowIndex, c: 9 } }, // Footer
    ];

    // Generous column widths for maximum legibility in Excel
    worksheet["!cols"] = [
      { wch: 8 },  // S.No
      { wch: 20 }, // Receipt No
      { wch: 28 }, // Devotee / Resident Name
      { wch: 14 }, // Flat No
      { wch: 16 }, // Resident Type
      { wch: 16 }, // Payment Mode
      { wch: 24 }, // Donation Amount (₹)
      { wch: 18 }, // Contact Number
      { wch: 16 }, // Date
      { wch: 14 }, // Time
    ];

    // ==========================================
    // SHEET 2: Executive Summary & Reconciliation
    // ==========================================
    const summaryAoa: (string | number)[][] = [
      ["IRA HILL VIEW APARTMENTS — GANESH UTSAV 2026"],
      ["Settipalli, Tirupati | Executive Summary & Reconciliation"],
      [],
      ["Key Metric / Parameter", "Value / Details"],
      ["Apartment Community", "Ira Hill View Apartments, Settipalli, Tirupati"],
      ["Festival Occasion", "Sri Varasiddhi Vinayaka Swamy Utsav 2026"],
      ["Total Collection Amount (₹)", totalAmount],
      ["Total Devotees / Donors", donors.length],
      ["Total Contributing Flats", uniqueFlats],
      ["Owner Contributions", ownerCount],
      ["Tenant (Rent) Contributions", rentCount],
      ["Cash Collection Total (₹)", cashTotal],
      ["UPI / Digital Collection Total (₹)", upiTotal],
      ["Average Contribution (₹)", donors.length > 0 ? Math.round(totalAmount / donors.length) : 0],
      ["Report Generation Time", new Date().toLocaleString("en-IN")],
      ["Register Status", "Official & Verified"],
      [],
      ["Published by Ira Hill View Welfare Association, Tirupati"],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryAoa);
    summarySheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
      { s: { r: summaryAoa.length - 1, c: 0 }, e: { r: summaryAoa.length - 1, c: 1 } },
    ];
    summarySheet["!cols"] = [{ wch: 32 }, { wch: 55 }];

    // Build workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Donation Register");
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Executive Summary");

    // Generate binary XLSX buffer
    const xlsxBuf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const uint8Array = new Uint8Array(xlsxBuf);

    return new Response(uint8Array, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="Ira_Hill_View_Ganesh_Donations_2026.xlsx"',
        "Content-Length": String(uint8Array.byteLength),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to export data" },
      { status: 500 }
    );
  }
}
