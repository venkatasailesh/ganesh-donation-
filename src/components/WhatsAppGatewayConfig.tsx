"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface LocalStatus {
  available: boolean;
  connected: boolean;
  state: string;
  qrCodeDataUrl?: string | null;
  phone?: string | null;
  message?: string;
}

export default function WhatsAppGatewayConfig() {
  const [localStatus, setLocalStatus] = useState<LocalStatus>({
    available: false,
    connected: false,
    state: "loading",
  });

  const [isLoading, setIsLoading] = useState(false);

  // Test send state
  const [testPhone, setTestPhone] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchLocalStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/local");
      const data = await res.json();
      setLocalStatus(data);
    } catch {
      setLocalStatus({
        available: false,
        connected: false,
        state: "offline",
        message: "Local WhatsApp worker starting...",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocalStatus();

    // Poll status every 3 seconds
    const interval = setInterval(() => {
      fetchLocalStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchLocalStatus]);

  async function handleLogoutLocal() {
    if (!confirm("Are you sure you want to disconnect this WhatsApp number?")) return;
    try {
      await fetch("/api/whatsapp/local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      fetchLocalStatus();
    } catch (err) {
      console.error("Error logging out:", err);
    }
  }

  async function handleTestSend() {
    if (!testPhone || testPhone.replace(/\D/g, "").length < 10) {
      setTestResult({ success: false, message: "Please enter a valid 10-digit phone number." });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? "Test PDF receipt sent successfully!" : "Failed to send test PDF."),
      });
    } catch {
      setTestResult({
        success: false,
        message: "Network error during test send.",
      });
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div
      style={{
        background: "rgba(22, 11, 4, 0.78)",
        backdropFilter: "blur(20px)",
        borderRadius: "24px",
        padding: "32px",
        boxShadow: "0 16px 48px rgba(0, 0, 0, 0.45)",
        border: "1px solid rgba(255, 179, 0, 0.3)",
        marginTop: "36px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
          borderBottom: "1px solid rgba(255, 179, 0, 0.2)",
          paddingBottom: "20px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(37, 211, 102, 0.2), rgba(18, 140, 126, 0.3))",
                border: "1px solid rgba(37, 211, 102, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.4rem",
              }}
            >
              📱
            </div>
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-outfit), sans-serif",
                  fontSize: "1.45rem",
                  fontWeight: 800,
                  color: "#FFF8E1",
                  margin: 0,
                  letterSpacing: "0.5px",
                }}
              >
                Direct WhatsApp Automated PDF Sender
              </h2>
              <p style={{ color: "#D7CCC8", margin: "4px 0 0", fontSize: "0.88rem" }}>
                Sends customized PDF receipts automatically from <strong style={{ color: "#FFE082" }}>your personal phone</strong> without third-party fees.
              </p>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {localStatus.connected ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(37, 211, 102, 0.18)",
                color: "#69F0AE",
                padding: "8px 18px",
                borderRadius: "30px",
                fontWeight: 700,
                fontSize: "0.88rem",
                border: "1px solid rgba(37, 211, 102, 0.5)",
                boxShadow: "0 0 16px rgba(37, 211, 102, 0.25)",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#00E676",
                  boxShadow: "0 0 8px #00E676",
                  animation: "pulse 1.5s infinite",
                }}
              />
              Active (+{localStatus.phone})
            </span>
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(37, 211, 102, 0.15)",
                color: "#69F0AE",
                padding: "8px 18px",
                borderRadius: "30px",
                fontWeight: 700,
                fontSize: "0.88rem",
                border: "1px solid rgba(37, 211, 102, 0.4)",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#00E676",
                  boxShadow: "0 0 8px #00E676",
                }}
              />
              1-Click Direct WhatsApp Active
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "36px", color: "#FFD54F" }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: "3px solid rgba(255,179,0,0.2)",
              borderTopColor: "#FFB300",
              borderRadius: "50%",
              margin: "0 auto 12px",
              animation: "spin 0.8s linear infinite",
            }}
          />
          Initializing WhatsApp connection state...
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
          }}
        >
          {/* Left Box: Live QR Code or Connected Phone Card */}
          <div
            style={{
              background: "rgba(35, 18, 5, 0.65)",
              borderRadius: "18px",
              padding: "24px",
              border: "1px solid rgba(255, 179, 0, 0.2)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            {localStatus.connected ? (
              <div style={{ width: "100%", padding: "12px 0" }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(37, 211, 102, 0.2), rgba(18, 140, 126, 0.4))",
                    border: "2px solid #25D366",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2.2rem",
                    margin: "0 auto 16px",
                    boxShadow: "0 0 20px rgba(37, 211, 102, 0.3)",
                  }}
                >
                  ✓
                </div>
                <h3
                  style={{
                    color: "#69F0AE",
                    fontSize: "1.25rem",
                    margin: "0 0 6px",
                    fontWeight: 700,
                  }}
                >
                  WhatsApp Connected!
                </h3>
                <p style={{ color: "#E0E0E0", fontSize: "0.95rem", margin: "0 0 16px" }}>
                  Linked Number: <strong style={{ color: "#FFF8E1" }}>+{localStatus.phone}</strong>
                </p>
                <div
                  style={{
                    background: "rgba(37, 211, 102, 0.08)",
                    border: "1px solid rgba(37, 211, 102, 0.25)",
                    borderRadius: "12px",
                    padding: "14px",
                    fontSize: "0.85rem",
                    color: "#D7CCC8",
                    textAlign: "left",
                    lineHeight: 1.5,
                    marginBottom: "20px",
                  }}
                >
                  ✨ <strong>Auto-Dispatch Active:</strong> Every time a resident of Ira Hill View Apartments submits a donation, your WhatsApp will automatically send the branded PDF receipt directly to their chat.
                </div>
                <button
                  onClick={handleLogoutLocal}
                  style={{
                    background: "rgba(198, 40, 40, 0.2)",
                    border: "1px solid rgba(239, 83, 80, 0.4)",
                    color: "#FF8A80",
                    padding: "10px 20px",
                    borderRadius: "10px",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(198, 40, 40, 0.4)";
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(198, 40, 40, 0.2)";
                  }}
                >
                  Disconnect This Phone
                </button>
              </div>
            ) : localStatus.qrCodeDataUrl ? (
              <div>
                <div
                  style={{
                    display: "inline-block",
                    padding: "12px",
                    background: "#FFFFFF",
                    borderRadius: "16px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.5), 0 0 20px rgba(255, 179, 0, 0.3)",
                    border: "3px solid #FFB300",
                    marginBottom: "16px",
                  }}
                >
                  <Image
                    src={localStatus.qrCodeDataUrl}
                    alt="Scan WhatsApp QR Code"
                    width={220}
                    height={220}
                    style={{ display: "block", borderRadius: "8px" }}
                    unoptimized
                  />
                </div>
                <h4
                  style={{
                    margin: "0 0 8px",
                    fontSize: "1.05rem",
                    color: "#FFE082",
                    fontWeight: 700,
                  }}
                >
                  Scan with WhatsApp on Your Phone
                </h4>
                <div
                  style={{
                    textAlign: "left",
                    color: "#D7CCC8",
                    fontSize: "0.84rem",
                    lineHeight: 1.6,
                    background: "rgba(20, 10, 3, 0.5)",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 179, 0, 0.15)",
                  }}
                >
                  <div>1. Open <strong>WhatsApp</strong> on your mobile</div>
                  <div>2. Tap <strong>⋮ Menu</strong> or <strong>Settings</strong> → <strong>Linked Devices</strong></div>
                  <div>3. Tap <strong>Link a Device</strong> & scan this QR code</div>
                </div>
                <div
                  style={{
                    marginTop: "12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.78rem",
                    color: "#BDBDBD",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#FFB300",
                      display: "inline-block",
                      animation: "pulse 1s infinite",
                    }}
                  />
                  Auto-refreshing QR code every few seconds
                </div>
              </div>
            ) : (
              <div style={{ width: "100%", padding: "16px 8px", textAlign: "center" }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(37, 211, 102, 0.25), rgba(18, 140, 126, 0.45))",
                    border: "2px solid #25D366",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.8rem",
                    margin: "0 auto 14px",
                    boxShadow: "0 0 20px rgba(37, 211, 102, 0.35)",
                  }}
                >
                  ⚡
                </div>
                <h3
                  style={{
                    color: "#69F0AE",
                    fontSize: "1.18rem",
                    margin: "0 0 6px",
                    fontWeight: 700,
                  }}
                >
                  Direct 1-Click WhatsApp Active
                </h3>
                <p style={{ color: "#E0E0E0", fontSize: "0.85rem", margin: "0 0 14px", lineHeight: 1.5 }}>
                  Receipts are sent directly to resident WhatsApp numbers with zero pairing or QR scanning needed.
                </p>
                <div
                  style={{
                    background: "rgba(37, 211, 102, 0.08)",
                    border: "1px solid rgba(37, 211, 102, 0.25)",
                    borderRadius: "12px",
                    padding: "14px",
                    fontSize: "0.82rem",
                    color: "#D7CCC8",
                    textAlign: "left",
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ color: "#69F0AE", fontWeight: 700, marginBottom: "4px" }}>
                    ✓ 100% Ready on Mobile & Desktop
                  </div>
                  <div>• Clicking <strong>WhatsApp</strong> on any donor opens their chat with the official receipt text & link.</div>
                  <div>• No background daemon or phone pairing needed in production.</div>
                  <div>• Zero third-party fees, unlimited free receipt sharing.</div>
                </div>
              </div>
            )}
          </div>

          {/* Right Box: Test Sender & Message Preview */}
          <div
            style={{
              background: "rgba(35, 18, 5, 0.65)",
              borderRadius: "18px",
              padding: "24px",
              border: "1px solid rgba(255, 179, 0, 0.2)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3
                style={{
                  margin: "0 0 6px",
                  fontSize: "1.1rem",
                  color: "#FFE082",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>🧪</span> Verify Instant Delivery
              </h3>
              <p style={{ color: "#D7CCC8", fontSize: "0.85rem", margin: "0 0 16px" }}>
                Send a sample devotional PDF receipt to any phone number to test WhatsApp delivery right now.
              </p>

              <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                <input
                  type="tel"
                  placeholder="Enter 10-digit number (e.g. 9849740645)"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    background: "rgba(20, 10, 3, 0.7)",
                    border: "1px solid rgba(255, 179, 0, 0.3)",
                    borderRadius: "10px",
                    color: "#FFFFFF",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                />
                <button
                  onClick={handleTestSend}
                  disabled={isTesting}
                  style={{
                    background: isTesting
                      ? "rgba(255, 179, 0, 0.3)"
                      : "linear-gradient(135deg, #FF6B00, #E65100)",
                    border: "1px solid rgba(255, 215, 0, 0.4)",
                    color: "#FFFFFF",
                    padding: "12px 18px",
                    borderRadius: "10px",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    cursor: isTesting ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 4px 14px rgba(230, 81, 0, 0.3)",
                  }}
                >
                  {isTesting ? "Sending..." : "Send Test PDF"}
                </button>
              </div>

              {testResult && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "10px",
                    fontSize: "0.86rem",
                    marginBottom: "16px",
                    background: testResult.success
                      ? "rgba(37, 211, 102, 0.15)"
                      : "rgba(255, 82, 82, 0.15)",
                    border: `1px solid ${
                      testResult.success ? "rgba(37, 211, 102, 0.4)" : "rgba(255, 82, 82, 0.4)"
                    }`,
                    color: testResult.success ? "#69F0AE" : "#FF8A80",
                  }}
                >
                  {testResult.message}
                </div>
              )}
            </div>

            {/* Devotional Message Preview Card */}
            <div
              style={{
                background: "rgba(18, 9, 2, 0.7)",
                borderRadius: "12px",
                padding: "14px 16px",
                border: "1px solid rgba(255, 179, 0, 0.15)",
              }}
            >
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "#FFD54F",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  marginBottom: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>SACRED WHATSAPP MESSAGE FORMAT</span>
                <span style={{ color: "#A7D8A9" }}>Auto-attached PDF</span>
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.78rem",
                  color: "#EDE3D2",
                  lineHeight: 1.5,
                  whiteSpace: "pre-line",
                }}
              >
                {`🙏 *IRA HILL VIEW APARTMENTS — TIRUPATI*
🕉️ *Ganesh Chaturthi Mahotsavam 2026*

Dear *Resident*,
Thank you for your sacred contribution!
📋 *Receipt No:* GC-2026-XXXX
💰 *Amount:* ₹5,001
🏠 *Flat:* 301 (Ira Hill View)

📎 *Official PDF Receipt Attached*
🎉 *Ganpati Bappa Morya!* 🙏`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
