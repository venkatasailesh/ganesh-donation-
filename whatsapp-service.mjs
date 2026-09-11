import express from "express";
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "50mb" }));

const PORT = process.env.PORT || process.env.WHATSAPP_PORT || 5001;
const AUTH_DIR = path.join(__dirname, "src", "data", "baileys-auth");

let sock = null;
let qrCodeDataUrl = null;
let isConnected = false;
let connectedUser = null;
let connectionState = "starting";
let reconnectAttempts = 0;

const logger = pino({ level: "error" });

async function startWhatsApp() {
  try {
    await fs.mkdir(AUTH_DIR, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }));

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger,
      browser: ["Ganesh Utsav Community", "Chrome", "120.0.0"],
      syncFullHistory: false,
      markOnlineOnConnect: true,
      keepAliveIntervalMs: 30000,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        connectionState = "qr_ready";
        isConnected = false;
        try {
          qrCodeDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
          console.log("[WhatsApp] Fresh QR code generated. Waiting for scan...");
        } catch (err) {
          console.error("Error generating QR data URL:", err);
        }
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`[WhatsApp] Connection closed (status: ${statusCode}). Reconnecting: ${shouldReconnect}`);

        isConnected = false;
        connectionState = "disconnected";

        if (statusCode === DisconnectReason.loggedOut) {
          console.log("[WhatsApp] Logged out. Clearing local session keys.");
          qrCodeDataUrl = null;
          connectedUser = null;
          try {
            await fs.rm(AUTH_DIR, { recursive: true, force: true });
          } catch {}
          setTimeout(startWhatsApp, 3000);
        } else if (shouldReconnect) {
          reconnectAttempts++;
          const delay = Math.min(reconnectAttempts * 2000, 10000);
          setTimeout(startWhatsApp, delay);
        }
      } else if (connection === "open") {
        reconnectAttempts = 0;
        isConnected = true;
        qrCodeDataUrl = null;
        connectionState = "connected";
        const userJid = sock.user?.id || "";
        connectedUser = userJid.split(":")[0] || userJid.split("@")[0];
        console.log(`[WhatsApp] ✅ Connected successfully to your phone: +${connectedUser}!`);
      }
    });
  } catch (err) {
    console.error("[WhatsApp] Initialization error:", err);
    setTimeout(startWhatsApp, 5000);
  }
}

// REST Endpoints
app.get("/status", (req, res) => {
  res.json({
    connected: isConnected,
    state: connectionState,
    qrCodeDataUrl: isConnected ? null : qrCodeDataUrl,
    phone: connectedUser,
  });
});

app.post("/send", async (req, res) => {
  try {
    const { phone, pdfBase64, filename, caption } = req.body;

    if (!isConnected || !sock) {
      return res.status(503).json({
        success: false,
        message: "WhatsApp is not connected. Please scan the QR code on the Admin dashboard first.",
      });
    }

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required." });
    }

    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    let targetJid = `${formattedPhone}@s.whatsapp.net`;

    // Resolve WhatsApp JID
    try {
      const results = await sock.onWhatsApp(targetJid);
      if (results && results.length > 0 && results[0]?.jid) {
        targetJid = results[0].jid;
      }
    } catch (checkErr) {
      console.warn("[WhatsApp] onWhatsApp check warning:", checkErr?.message);
    }

    const pdfBuffer = Buffer.from(pdfBase64, "base64");

    const sentMsg = await sock.sendMessage(targetJid, {
      document: pdfBuffer,
      mimetype: "application/pdf",
      fileName: filename || "donation-receipt.pdf",
      caption: caption || "Ganesh Chaturthi 2026 Donation Receipt",
    });

    console.log(`[WhatsApp] PDF sent to ${targetJid} (Msg ID: ${sentMsg?.key?.id})`);

    res.json({
      success: true,
      messageId: sentMsg?.key?.id,
      recipient: formattedPhone,
    });
  } catch (err) {
    console.error("[WhatsApp] Error sending document:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to send message via WhatsApp",
    });
  }
});

app.post("/logout", async (req, res) => {
  try {
    if (sock) {
      await sock.logout().catch(() => {});
    }
    try {
      await fs.rm(AUTH_DIR, { recursive: true, force: true });
    } catch {}
    isConnected = false;
    connectedUser = null;
    qrCodeDataUrl = null;
    connectionState = "disconnected";
    setTimeout(startWhatsApp, 2000);
    res.json({ success: true, message: "Logged out. New QR code generating..." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[WhatsApp Service] Local gateway listening on http://localhost:${PORT}`);
  startWhatsApp();
});
