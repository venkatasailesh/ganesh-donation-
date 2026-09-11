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

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

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
          const terminalQR = await QRCode.toString(qr, { type: "terminal", small: true });
          console.log("\n=======================================================");
          console.log("👉 SCAN THIS WHATSAPP QR CODE IN TERMINAL / LOGS 👈");
          console.log("=======================================================");
          console.log(terminalQR);
          console.log("=======================================================\n");
        } catch (err) {
          console.error("Error generating QR:", err);
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

// Health check endpoint for cloud hosts (Render, Railway, Fly.io)
app.get("/health", (req, res) => {
  res.json({ status: "ok", connected: isConnected, state: connectionState });
});

// Beautiful Web UI to view & scan the QR code in any browser
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IRA Hill View — WhatsApp Gateway</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background: #0f172a; color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; width: 100%; max-width: 480px; padding: 32px 24px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
    .badge-connected { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }
    .badge-waiting { background: rgba(234, 179, 8, 0.15); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.3); }
    .badge-disconnected { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 6px; color: #fff; }
    p.sub { font-size: 14px; color: #94a3b8; margin-bottom: 24px; }
    .qr-container { background: #fff; border-radius: 12px; padding: 16px; display: inline-block; margin-bottom: 20px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); min-height: 250px; min-width: 250px; display: flex; align-items: center; justify-content: center; }
    .qr-container img { width: 250px; height: 250px; display: block; }
    .instructions { text-align: left; background: #0f172a; border-radius: 10px; padding: 16px; margin-bottom: 20px; font-size: 13px; color: #cbd5e1; line-height: 1.6; }
    .instructions ol { padding-left: 20px; }
    .instructions li { margin-bottom: 6px; }
    .btn { background: #dc2626; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; transition: background 0.2s; }
    .btn:hover { background: #b91c1c; }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .dot-green { background: #4ade80; box-shadow: 0 0 8px #4ade80; }
    .dot-yellow { background: #facc15; box-shadow: 0 0 8px #facc15; }
    .dot-red { background: #f87171; }
    .pulse { animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  </style>
</head>
<body>
  <div class="card">
    <div id="status-badge" class="badge badge-waiting">
      <span class="dot dot-yellow pulse"></span>
      <span id="status-text">Checking WhatsApp Service...</span>
    </div>
    <h1>IRA Hill View WhatsApp Gateway</h1>
    <p class="sub">Automated Ganesh Chaturthi Receipt Delivery</p>

    <div id="content-area">
      <div class="qr-container">
        <div id="qr-placeholder" style="color: #64748b; font-size: 14px;">Loading QR code...</div>
      </div>
      <div class="instructions">
        <strong style="color:#fff; display:block; margin-bottom:8px;">How to Connect:</strong>
        <ol>
          <li>Open <strong>WhatsApp</strong> on your phone.</li>
          <li>Tap <strong>Menu (⋮)</strong> or <strong>Settings</strong> ➔ <strong>Linked Devices</strong>.</li>
          <li>Tap <strong>Link a Device</strong> and point your camera at this QR code.</li>
        </ol>
      </div>
    </div>

    <div id="connected-area" style="display:none; padding: 20px 0;">
      <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
      <h2 style="font-size: 18px; color: #4ade80; margin-bottom: 8px;">WhatsApp Connected!</h2>
      <p style="color: #cbd5e1; font-size: 14px; margin-bottom: 20px;">
        Phone: <strong id="connected-phone" style="color:#fff;"></strong><br/>
        Service is active and ready to deliver receipts automatically.
      </p>
      <button class="btn" onclick="logoutWhatsApp()">Disconnect Phone</button>
    </div>
  </div>

  <script>
    async function updateStatus() {
      try {
        const res = await fetch('/status');
        const data = await res.json();

        const badge = document.getElementById('status-badge');
        const statusText = document.getElementById('status-text');
        const contentArea = document.getElementById('content-area');
        const connectedArea = document.getElementById('connected-area');

        if (data.connected) {
          badge.className = 'badge badge-connected';
          badge.innerHTML = '<span class="dot dot-green"></span> Connected';
          contentArea.style.display = 'none';
          connectedArea.style.display = 'block';
          document.getElementById('connected-phone').innerText = '+' + data.phone;
        } else if (data.qrCodeDataUrl) {
          badge.className = 'badge badge-waiting';
          badge.innerHTML = '<span class="dot dot-yellow pulse"></span> Ready to Scan';
          contentArea.style.display = 'block';
          connectedArea.style.display = 'none';
          document.querySelector('.qr-container').innerHTML = '<img src="' + data.qrCodeDataUrl + '" alt="WhatsApp QR Code" />';
        } else {
          badge.className = 'badge badge-disconnected';
          badge.innerHTML = '<span class="dot dot-red"></span> ' + (data.state || 'Initializing...');
        }
      } catch (e) {
        console.error('Error fetching status:', e);
      }
    }

    async function logoutWhatsApp() {
      if (!confirm('Are you sure you want to disconnect this WhatsApp number?')) return;
      try {
        await fetch('/logout', { method: 'POST' });
        location.reload();
      } catch (e) {
        alert('Logout error: ' + e.message);
      }
    }

    updateStatus();
    setInterval(updateStatus, 3000);
  </script>
</body>
</html>`);
});

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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[WhatsApp Service] Local gateway listening on http://0.0.0.0:${PORT}`);
  startWhatsApp();
});
