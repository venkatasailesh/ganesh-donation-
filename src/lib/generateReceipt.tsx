import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { Donor } from "./types";
import path from "path";

const colors = {
  saffron: "#FF6B00",
  deepOrange: "#E65100",
  gold: "#FFB300",
  lightGold: "#FFF8E1",
  warmBg: "#FFFDF5",
  darkText: "#2D1B00",
  bodyText: "#4A3520",
  mutedText: "#8D7B6B",
  border: "#F0E0C8",
  accent: "#D84315",
  emerald: "#2E7D32",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: colors.warmBg,
    padding: 0,
  },
  /* ---- Header Band ---- */
  headerBand: {
    backgroundColor: colors.deepOrange,
    paddingTop: 28,
    paddingBottom: 18,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  headerApartmentName: {
    fontSize: 22,
    fontWeight: 700,
    color: "#FFFFFF",
    letterSpacing: 1.5,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  headerLocation: {
    fontSize: 11,
    fontWeight: 400,
    color: "#FFE0B2",
    letterSpacing: 2,
    marginBottom: 8,
  },
  headerDivider: {
    width: 80,
    height: 1,
    backgroundColor: "#FFB300",
    marginBottom: 8,
  },
  headerEventTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#FFD54F",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  /* ---- Ganesh Image Section ---- */
  imageSection: {
    alignItems: "center",
    marginTop: -10,
    marginBottom: 8,
  },
  ganeshImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  /* ---- Receipt Body ---- */
  body: {
    paddingHorizontal: 50,
    paddingTop: 8,
  },
  receiptLabel: {
    fontSize: 10,
    fontWeight: 500,
    color: colors.mutedText,
    textTransform: "uppercase",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 4,
  },
  receiptNumber: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.deepOrange,
    textAlign: "center",
    marginBottom: 3,
  },
  receiptDate: {
    fontSize: 10,
    fontWeight: 400,
    color: colors.mutedText,
    textAlign: "center",
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  /* ---- Donor Details ---- */
  detailsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#F5EFE6",
  },
  detailRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: 500,
    color: colors.mutedText,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  detailValue: {
    fontSize: 11,
    fontWeight: 500,
    color: colors.darkText,
  },
  /* ---- Amount Highlight ---- */
  amountContainer: {
    backgroundColor: colors.lightGold,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.gold,
    padding: 18,
    alignItems: "center",
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 9,
    fontWeight: 500,
    color: colors.mutedText,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 34,
    fontWeight: 700,
    color: colors.deepOrange,
  },
  amountRupee: {
    fontSize: 22,
    fontWeight: 400,
    color: colors.saffron,
  },
  /* ---- Badge Row ---- */
  badgeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  /* ---- Thank You Section ---- */
  thankYouSection: {
    alignItems: "center",
    marginBottom: 14,
  },
  thankYouText: {
    fontSize: 13,
    fontWeight: 500,
    color: colors.darkText,
    marginBottom: 4,
  },
  thankYouSubtext: {
    fontSize: 10,
    fontWeight: 300,
    color: colors.mutedText,
    textAlign: "center",
    lineHeight: 1.5,
  },
  /* ---- Footer ---- */
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.deepOrange,
    paddingVertical: 12,
    paddingHorizontal: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    fontWeight: 300,
    color: "#FFE0B2",
  },
  footerBold: {
    fontSize: 9,
    fontWeight: 500,
    color: "#FFFFFF",
  },
});

interface ReceiptProps {
  donor: Donor;
  ganeshImagePath: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-IN");
}

export function ReceiptDocument({ donor, ganeshImagePath }: ReceiptProps) {
  const residentType = donor.residentType || "Owner";
  const paymentMode = donor.paymentMode || "Cash";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Band */}
        <View style={styles.headerBand}>
          <Text style={styles.headerApartmentName}>Ira Hill View Apartments</Text>
          <Text style={styles.headerLocation}>Settipalli, Tirupati - 517506</Text>
          <View style={styles.headerDivider} />
          <Text style={styles.headerEventTitle}>Ganesh Chaturthi 2026</Text>
        </View>

        {/* Ganesh Image */}
        <View style={styles.imageSection}>
          <Image src={ganeshImagePath} style={styles.ganeshImage} />
        </View>

        {/* Receipt Body */}
        <View style={styles.body}>
          {/* Receipt Number */}
          <Text style={styles.receiptLabel}>Official Donation Receipt</Text>
          <Text style={styles.receiptNumber}>{donor.receiptId}</Text>
          <Text style={styles.receiptDate}>
            {formatDate(donor.createdAt)} at {formatTime(donor.createdAt)}
          </Text>

          <View style={styles.divider} />

          {/* Donor Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Donor Name</Text>
              <Text style={styles.detailValue}>{donor.name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone Number</Text>
              <Text style={styles.detailValue}>+91 {donor.phone}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Flat Number</Text>
              <Text style={styles.detailValue}>{donor.flatNumber} (Ira Hill View)</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Resident Type</Text>
              <Text style={styles.detailValue}>{residentType}</Text>
            </View>
            <View style={styles.detailRowLast}>
              <Text style={styles.detailLabel}>Payment Mode</Text>
              <Text style={styles.detailValue}>{paymentMode}</Text>
            </View>
          </View>

          {/* Amount Highlight */}
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Donation Amount</Text>
            <Text style={styles.amountValue}>
              <Text style={styles.amountRupee}>Rs. </Text>
              {formatAmount(donor.amount)}
            </Text>
          </View>

          {/* Resident Type & Payment Mode Badges */}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: residentType === "Owner" ? "#E8F5E9" : "#E3F2FD", borderColor: residentType === "Owner" ? "#66BB6A" : "#42A5F5" }]}>
              <Text style={[styles.badgeText, { color: residentType === "Owner" ? "#2E7D32" : "#1565C0" }]}>
                {residentType === "Owner" ? "Owner" : "Tenant"}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: paymentMode === "Cash" ? "#FFF3E0" : "#F3E5F5", borderColor: paymentMode === "Cash" ? "#FF9800" : "#AB47BC" }]}>
              <Text style={[styles.badgeText, { color: paymentMode === "Cash" ? "#E65100" : "#7B1FA2" }]}>
                Paid via {paymentMode}
              </Text>
            </View>
          </View>

          {/* Thank You */}
          <View style={styles.thankYouSection}>
            <Text style={styles.thankYouText}>
              Thank you for your generous contribution!
            </Text>
            <Text style={styles.thankYouSubtext}>
              Your sacred contribution supports our Ira Hill View community celebration
              in the holy foothills of Tirupati. May Lord Ganesha and Sri Venkateswara Swamy
              bless you and your loved ones with health, peace, and prosperity.
            </Text>
          </View>

          <View style={styles.thankYouSection}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: colors.deepOrange,
              }}
            >
              Ganpati Bappa Morya! • Om Gam Ganapataye Namaha!
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Ira Hill View Apartments, Settipalli, Tirupati - 517506
          </Text>
          <Text style={styles.footerBold}>
            Ira Hill View Utsav Committee
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateReceiptBuffer(donor: Donor): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const fs = await import("fs/promises");
  const ganeshImagePath = path.join(process.cwd(), "public", "ganesh.jpg");
  
  let imageSrc = ganeshImagePath;
  try {
    const imgBuffer = await fs.readFile(ganeshImagePath);
    imageSrc = `data:image/jpeg;base64,${imgBuffer.toString("base64")}`;
  } catch (err) {
    console.warn("Could not read ganesh.jpg for base64 embed:", err);
  }

  const buffer = await renderToBuffer(
    <ReceiptDocument donor={donor} ganeshImagePath={imageSrc} />
  );

  return Buffer.from(buffer);
}
