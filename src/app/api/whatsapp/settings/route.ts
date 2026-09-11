import { NextRequest, NextResponse } from "next/server";
import { getGatewaySettings, saveGatewaySettings } from "@/lib/settings";
import { WhatsAppGatewaySettings } from "@/lib/types";

function maskToken(token: string): string {
  if (!token) return "";
  if (token.length <= 6) return "******";
  return `${token.substring(0, 3)}••••••${token.substring(token.length - 3)}`;
}

export async function GET() {
  try {
    const settings = await getGatewaySettings();
    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        maskedToken: maskToken(settings.token),
        hasToken: Boolean(settings.token && settings.token.trim().length > 0),
      },
    });
  } catch (err) {
    console.error("Error reading WhatsApp settings:", err);
    return NextResponse.json(
      { success: false, message: "Failed to read settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<WhatsAppGatewaySettings>;
    const current = await getGatewaySettings();

    // If token not changed or left blank/masked, keep existing token
    let newToken = body.token;
    if (newToken && (newToken.includes("••••") || newToken.trim() === "")) {
      newToken = current.token;
    }

    const updated = await saveGatewaySettings({
      provider: body.provider || current.provider,
      enabled: body.enabled !== undefined ? body.enabled : current.enabled,
      instanceId: body.instanceId !== undefined ? body.instanceId.trim() : current.instanceId,
      token: newToken !== undefined ? newToken.trim() : current.token,
      phonePrefix: body.phonePrefix || current.phonePrefix,
    });

    return NextResponse.json({
      success: true,
      message: "WhatsApp Gateway settings saved successfully!",
      settings: {
        ...updated,
        maskedToken: maskToken(updated.token),
        hasToken: Boolean(updated.token && updated.token.trim().length > 0),
      },
    });
  } catch (err) {
    console.error("Error saving WhatsApp settings:", err);
    return NextResponse.json(
      { success: false, message: "Failed to save settings" },
      { status: 500 }
    );
  }
}
