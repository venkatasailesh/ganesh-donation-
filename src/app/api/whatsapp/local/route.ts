import { NextRequest, NextResponse } from "next/server";

const LOCAL_SERVICE_URL = process.env.WHATSAPP_LOCAL_URL || "http://localhost:5001";

export async function GET() {
  try {
    const res = await fetch(`${LOCAL_SERVICE_URL}/status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      return NextResponse.json({
        available: false,
        connected: false,
        message: "Direct WhatsApp link mode active.",
      });
    }
    const data = await res.json();
    return NextResponse.json({
      available: true,
      ...data,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      available: false,
      connected: false,
      message: `Local WhatsApp service not reachable: ${errMsg}`,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || "status";

    if (action === "logout") {
      const res = await fetch(`${LOCAL_SERVICE_URL}/logout`, {
        method: "POST",
      });
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ success: false, message: "Invalid action" });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message: errMsg },
      { status: 500 }
    );
  }
}
