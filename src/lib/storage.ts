import fs from "fs/promises";
import path from "path";
import { Donor } from "./types";
import { getStore } from "@netlify/blobs";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const DONORS_FILE = path.join(DATA_DIR, "donors.json");

/**
 * Safe accessor for Netlify Blobs key-value store.
 * Automatically active on Netlify without any configuration.
 */
function getNetlifyStore() {
  try {
    return getStore("ganesh-donations");
  } catch {
    return null;
  }
}

async function ensureLocalDataFile(): Promise<void> {
  try {
    await fs.access(DONORS_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DONORS_FILE, "[]", "utf-8");
  }
}

async function readLocalDonors(): Promise<Donor[]> {
  try {
    await ensureLocalDataFile();
    const data = await fs.readFile(DONORS_FILE, "utf-8");
    return JSON.parse(data) as Donor[];
  } catch {
    return [];
  }
}

async function writeLocalDonors(donors: Donor[]): Promise<void> {
  try {
    await ensureLocalDataFile();
    await fs.writeFile(DONORS_FILE, JSON.stringify(donors, null, 2), "utf-8");
  } catch (err) {
    console.error("Local file write error:", err);
  }
}

/**
 * Fetch all donors:
 * 1. Tries Netlify Blobs (permanent serverless cloud storage on Netlify).
 * 2. Falls back to local donors.json when running on local machine.
 */
export async function getDonors(): Promise<Donor[]> {
  const store = getNetlifyStore();
  if (store) {
    try {
      const data = await store.get("donors", { type: "json" });
      if (Array.isArray(data)) {
        return data as Donor[];
      }
      return [];
    } catch (err) {
      console.warn("Netlify Blobs read error, falling back to local file:", err);
    }
  }

  // Local filesystem fallback
  return await readLocalDonors();
}

/**
 * Save full donors array:
 * Persists to Netlify Blobs (permanent cloud key-value) AND local file.
 */
export async function saveDonors(donors: Donor[]): Promise<void> {
  const store = getNetlifyStore();
  if (store) {
    try {
      await store.setJSON("donors", donors);
    } catch (err) {
      console.error("Netlify Blobs save error:", err);
    }
  }

  // Also write to local file if available
  await writeLocalDonors(donors);
}

/**
 * Add a new donor
 */
export async function addDonor(donor: Donor): Promise<void> {
  const donors = await getDonors();
  donors.push(donor);
  await saveDonors(donors);
}

/**
 * Update an existing donor by ID
 */
export async function updateDonor(updated: {
  id: string;
  name?: string;
  phone?: string;
  flatNumber?: string;
  amount?: number;
  residentType?: "Owner" | "Rent";
  paymentMode?: "Cash" | "UPI";
}): Promise<Donor | null> {
  const donors = await getDonors();
  const idx = donors.findIndex((d) => d.id === updated.id || d.receiptId === updated.id);
  if (idx === -1) return null;

  donors[idx] = {
    ...donors[idx],
    ...(updated.name && { name: updated.name.trim() }),
    ...(updated.phone && { phone: updated.phone.replace(/\s/g, "") }),
    ...(updated.flatNumber && { flatNumber: updated.flatNumber.trim() }),
    ...(updated.amount !== undefined && { amount: Number(updated.amount) }),
    ...(updated.residentType && { residentType: updated.residentType }),
    ...(updated.paymentMode && { paymentMode: updated.paymentMode }),
  };

  await saveDonors(donors);
  return donors[idx];
}

/**
 * Delete a donor by ID or receiptId
 */
export async function deleteDonor(id: string): Promise<boolean> {
  const donors = await getDonors();
  const filtered = donors.filter((d) => d.id !== id && d.receiptId !== id);
  if (filtered.length === donors.length) return false;
  await saveDonors(filtered);
  return true;
}

/**
 * Clear all donors (wipe database clean for fresh production use)
 */
export async function clearAllDonors(): Promise<void> {
  const store = getNetlifyStore();
  if (store) {
    try {
      await store.setJSON("donors", []);
    } catch (err) {
      console.error("Netlify Blobs clear error:", err);
    }
  }
  await writeLocalDonors([]);
}

/**
 * Get donor by receiptId
 */
export async function getDonorByReceiptId(
  receiptId: string
): Promise<Donor | null> {
  const donors = await getDonors();
  return donors.find((d) => d.receiptId === receiptId) || null;
}

/**
 * Get next sequential receipt number
 */
export async function getNextReceiptNumber(): Promise<number> {
  const donors = await getDonors();
  return donors.length + 1;
}
