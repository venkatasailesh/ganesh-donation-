import fs from "fs/promises";
import path from "path";
import { Donor } from "./types";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const DONORS_FILE = path.join(DATA_DIR, "donors.json");

async function ensureLocalDataFile(): Promise<void> {
  try {
    await fs.access(DONORS_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DONORS_FILE, "[]", "utf-8");
  }
}

/**
 * Fetch all donors from persistent JSON storage
 */
export async function getDonors(): Promise<Donor[]> {
  try {
    await ensureLocalDataFile();
    const data = await fs.readFile(DONORS_FILE, "utf-8");
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? (parsed as Donor[]) : [];
  } catch (err) {
    console.error("Error reading donors storage:", err);
    return [];
  }
}

/**
 * Save full donors array to persistent JSON storage
 */
export async function saveDonors(donors: Donor[]): Promise<void> {
  try {
    await ensureLocalDataFile();
    await fs.writeFile(DONORS_FILE, JSON.stringify(donors, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving donors storage:", err);
  }
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
 * Update an existing donor by ID or receiptId
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
  await saveDonors([]);
}

/**
 * Get next receipt sequence number
 */
export async function getNextReceiptNumber(): Promise<number> {
  const donors = await getDonors();
  if (donors.length === 0) return 1;

  const numbers = donors
    .map((d) => {
      const match = d.receiptId.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));

  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

/**
 * Get donor by ID or receiptId
 */
export async function getDonorById(id: string): Promise<Donor | null> {
  const donors = await getDonors();
  return donors.find((d) => d.id === id || d.receiptId === id) || null;
}

export const getDonorByReceiptId = getDonorById;
