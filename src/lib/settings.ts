import fs from "fs/promises";
import path from "path";
import { WhatsAppGatewaySettings } from "./types";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

const defaultSettings: WhatsAppGatewaySettings = {
  provider: (process.env.WHATSAPP_GATEWAY_PROVIDER as "local" | "disabled") || "local",
  enabled: process.env.WHATSAPP_GATEWAY_ENABLED !== "false",
  instanceId: "",
  token: "",
  phonePrefix: process.env.WHATSAPP_PHONE_PREFIX || "91",
};

async function ensureSettingsFile(): Promise<void> {
  try {
    await fs.access(SETTINGS_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      SETTINGS_FILE,
      JSON.stringify(defaultSettings, null, 2),
      "utf-8"
    );
  }
}

export async function getGatewaySettings(): Promise<WhatsAppGatewaySettings> {
  await ensureSettingsFile();
  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(data);
    return {
      ...defaultSettings,
      ...parsed,
    };
  } catch {
    return defaultSettings;
  }
}

export async function saveGatewaySettings(
  settings: Partial<WhatsAppGatewaySettings>
): Promise<WhatsAppGatewaySettings> {
  const current = await getGatewaySettings();
  const updated: WhatsAppGatewaySettings = {
    ...current,
    ...settings,
  };
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}
