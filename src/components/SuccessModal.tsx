"use client";

import React from "react";
import { DonationResponse } from "@/lib/types";

interface SuccessModalProps {
  data: DonationResponse;
  onClose: () => void;
}

export default function SuccessModal({ data, onClose }: SuccessModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Checkmark */}
        <div className="checkmark-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 12 10 16 18 8" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="modal-title">Donation Successful!</h2>
        <p className="modal-subtitle">
          Thank you, <strong>{data.donor?.name}</strong>! Your contribution has been recorded for Ira Hill View Apartments.
        </p>

        {/* Amount */}
        <div className="modal-amount">
          ₹{data.donor?.amount.toLocaleString("en-IN")}
        </div>
        <div style={{ display: "flex", justifyContent: "center", margin: "8px 0 16px" }}>
          <div className="receipt-badge">
            <span className="receipt-star">✦</span>
            <span className="receipt-text">{data.receiptId}</span>
          </div>
        </div>

        {/* WhatsApp Delivery Status Banner */}
        {data.whatsappSent ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 16px",
              background: "rgba(37, 211, 102, 0.15)",
              border: "1px solid rgba(37, 211, 102, 0.4)",
              borderRadius: "12px",
              color: "#128C7E",
              fontWeight: 600,
              fontSize: "0.88rem",
              margin: "16px 0 8px",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span>PDF receipt automatically sent to WhatsApp (+91 {data.donor?.phone})!</span>
          </div>
        ) : (
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(255, 179, 0, 0.1)",
              border: "1px solid rgba(255, 179, 0, 0.3)",
              borderRadius: "10px",
              fontSize: "0.84rem",
              color: "#B7410E",
              margin: "14px 0 8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Receipt generated. WhatsApp can also be sent directly below.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="modal-buttons">
          {/* Download PDF */}
          <a
            href={data.receiptUrl}
            download
            className="btn-download"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Receipt (PDF)
          </a>

          {/* WhatsApp */}
          <a
            href={data.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp"
            id="whatsapp-share-btn"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.155.57 4.175 1.564 5.923l-1.564 5.905 6.079-1.595c1.679.914 3.593 1.434 5.626 1.434 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z" />
            </svg>
            Send via WhatsApp
          </a>

          {/* Close */}
          <button className="btn-done" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
