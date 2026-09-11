"use client";

import React, { useState, useMemo } from "react";
import { Donor } from "@/lib/types";
import { buildWhatsAppMessage, getWhatsAppDeepLink } from "@/lib/whatsapp";

interface DonorTableProps {
  donors: Donor[];
  onRefresh?: () => void;
  onEdit?: (donor: Donor) => void;
}

type SortField = "receiptId" | "name" | "phone" | "flatNumber" | "amount" | "createdAt";
type SortDir = "asc" | "desc";
type FilterSort = "all" | "recent" | "highest" | "flats";

export default function DonorTable({ donors, onEdit }: DonorTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterSort, setFilterSort] = useState<FilterSort>("all");

  // State for resending WhatsApp
  const [sendingReceiptId, setSendingReceiptId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ id: string; success: boolean; message: string } | null>(null);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const sortArrow = (field: SortField) => {
    if (sortField !== field) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  function getDonorWhatsAppUrl(donor: Donor) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fullReceiptUrl = `${origin}/api/receipt/${donor.receiptId}.pdf`;
    const dateFormatted = new Date(donor.createdAt).toLocaleDateString("en-IN");
    const msg = buildWhatsAppMessage({
      toPhone: donor.phone,
      donorName: donor.name,
      receiptId: donor.receiptId,
      amount: donor.amount,
      flatNumber: donor.flatNumber,
      residentType: donor.residentType,
      paymentMode: donor.paymentMode,
      dateStr: dateFormatted,
      receiptDownloadUrl: fullReceiptUrl,
    });
    return getWhatsAppDeepLink(donor.phone, msg);
  }

  async function handleResendWhatsApp(donor: Donor) {
    setSendingReceiptId(donor.receiptId);
    setActionNotice(null);

    // Also trigger background worker if available
    try {
      fetch("/api/whatsapp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptId: donor.receiptId }),
      }).catch(() => {});
    } catch {}

    setActionNotice({
      id: donor.receiptId,
      success: true,
      message: `✓ Opening WhatsApp chat for ${donor.name} (+91 ${donor.phone})...`,
    });
    setTimeout(() => {
      setSendingReceiptId(null);
      setActionNotice(null);
    }, 4000);
  }

  function handleFilterSortChange(val: FilterSort) {
    setFilterSort(val);
    if (val === "recent") {
      setSortField("createdAt");
      setSortDir("desc");
    } else if (val === "highest") {
      setSortField("amount");
      setSortDir("desc");
    } else if (val === "flats") {
      setSortField("flatNumber");
      setSortDir("asc");
    } else {
      setSortField("createdAt");
      setSortDir("desc");
    }
  }

  const filtered = useMemo(() => {
    let list = [...donors];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.flatNumber.toLowerCase().includes(q) ||
          d.phone.includes(q) ||
          d.receiptId.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === "amount") {
        return sortDir === "asc" ? valA - valB : valB - valA;
      }
      if (sortField === "createdAt") {
        return sortDir === "asc"
          ? new Date(valA).getTime() - new Date(valB).getTime()
          : new Date(valB).getTime() - new Date(valA).getTime();
      }

      valA = String(valA || "").toLowerCase();
      valB = String(valB || "").toLowerCase();
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [donors, search, sortField, sortDir]);

  if (donors.length === 0) {
    return (
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "60px 20px",
          textAlign: "center",
          background: "rgba(28, 14, 4, 0.75)",
          borderRadius: "16px",
          border: "1px dashed rgba(255, 179, 0, 0.3)",
        }}
      >
        <p style={{ fontSize: "1.1rem", color: "#FFB300", fontWeight: 600 }}>
          No donations recorded yet
        </p>
        <p style={{ fontSize: "0.85rem", color: "#BCAAA4", marginTop: "6px" }}>
          Click &ldquo;+ Add Donation&rdquo; above to record the first contribution.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Search & Filter Controls */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto 20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
        }}
      >
        {/* Search Bar */}
        <div className="search-wrapper" style={{ flex: "1 1 280px" }}>
          <span className="search-icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFB300"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="search-input"
            placeholder="Search resident, flat (e.g. 301), phone, or receipt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter / Sort Chips */}
        <div className="filter-chips-container" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {[
            { id: "all", label: `All (${donors.length})` },
            { id: "recent", label: "Most Recent" },
            { id: "highest", label: "Highest Amount" },
            { id: "flats", label: "By Flat" },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => handleFilterSortChange(chip.id as FilterSort)}
              style={{
                background:
                  filterSort === chip.id
                    ? "linear-gradient(135deg, #FF6B00, #E65100)"
                    : "rgba(35, 18, 5, 0.65)",
                color: filterSort === chip.id ? "#FFFFFF" : "#D7CCC8",
                border:
                  filterSort === chip.id
                    ? "1px solid #FFB300"
                    : "1px solid rgba(255, 179, 0, 0.25)",
                padding: "8px 16px",
                borderRadius: "20px",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Toast Alert */}
      {actionNotice && (
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto 16px",
            padding: "10px 18px",
            borderRadius: "12px",
            fontSize: "0.88rem",
            fontWeight: 600,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: actionNotice.success ? "rgba(37, 211, 102, 0.2)" : "rgba(255, 82, 82, 0.2)",
            border: `1px solid ${actionNotice.success ? "#25D366" : "#FF5252"}`,
            color: actionNotice.success ? "#69F0AE" : "#FF8A80",
            backdropFilter: "blur(10px)",
          }}
        >
          <span>{actionNotice.message}</span>
          <button
            onClick={() => setActionNotice(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. MOBILE DONOR CARDS VIEW (ACTIVE ON PHONES / MOBILE ONLY)  */}
      {/* ============================================================ */}
      <div className="mobile-donor-cards">
        {filtered.map((donor) => (
          <div key={donor.id} className="mobile-donor-card">
            {/* Top Bar: Royal Receipt Badge + Bold Gold Amount */}
            <div className="mobile-card-top">
              <div className="receipt-badge">
                <span className="receipt-star">✦</span>
                <span className="receipt-text">{donor.receiptId}</span>
              </div>
              <div className="mobile-amount">
                ₹{donor.amount.toLocaleString("en-IN")}
              </div>
            </div>

            {/* Resident & Apartment Details */}
            <div className="mobile-card-body">
              <div className="mobile-resident-row">
                <div className="mobile-resident-name">
                  <span
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #FF6B00, #FFB300)",
                      color: "#1A0C00",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.85rem",
                      fontWeight: 800,
                      flexShrink: 0,
                      boxShadow: "0 2px 8px rgba(255, 107, 0, 0.35)",
                    }}
                  >
                    {donor.name.charAt(0).toUpperCase()}
                  </span>
                  <span>{donor.name}</span>
                </div>

                <span className="mobile-flat-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                    <path d="M9 22v-4h6v4" />
                    <line x1="8" y1="6" x2="8.01" y2="6" />
                    <line x1="16" y1="6" x2="16.01" y2="6" />
                    <line x1="12" y1="6" x2="12.01" y2="6" />
                    <line x1="8" y1="10" x2="8.01" y2="10" />
                    <line x1="12" y1="10" x2="12.01" y2="10" />
                    <line x1="16" y1="10" x2="16.01" y2="10" />
                  </svg>
                  Flat {donor.flatNumber}
                </span>
              </div>

              {/* Owner/Rent & Cash/UPI Badges */}
              <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  padding: "3px 8px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 600,
                  background: (donor.residentType || 'Owner') === 'Owner' ? 'rgba(102, 187, 106, 0.15)' : 'rgba(66, 165, 245, 0.15)',
                  border: `1px solid ${(donor.residentType || 'Owner') === 'Owner' ? 'rgba(102, 187, 106, 0.4)' : 'rgba(66, 165, 245, 0.4)'}`,
                  color: (donor.residentType || 'Owner') === 'Owner' ? '#81C784' : '#64B5F6',
                }}>
                  {(donor.residentType || 'Owner') === 'Owner' ? 'Owner' : 'Tenant'}
                </span>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  padding: "3px 8px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 600,
                  background: (donor.paymentMode || 'Cash') === 'Cash' ? 'rgba(255, 179, 0, 0.15)' : 'rgba(171, 71, 188, 0.15)',
                  border: `1px solid ${(donor.paymentMode || 'Cash') === 'Cash' ? 'rgba(255, 179, 0, 0.4)' : 'rgba(171, 71, 188, 0.4)'}`,
                  color: (donor.paymentMode || 'Cash') === 'Cash' ? '#FFB300' : '#CE93D8',
                }}>
                  {donor.paymentMode || 'Cash'}
                </span>
              </div>

              {/* Meta: Phone & Timestamp */}
              <div className="mobile-meta-row">
                <a
                  href={`https://wa.me/91${donor.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mobile-phone-link"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.155.57 4.175 1.564 5.923l-1.564 5.905 6.079-1.595c1.679.914 3.593 1.434 5.626 1.434 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span>+91 {donor.phone}</span>
                </a>

                <div className="mobile-date-text">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>
                    {new Date(donor.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })}
                    ,{" "}
                    {new Date(donor.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Action Buttons: Edit, PDF, WhatsApp */}
            <div className="mobile-card-actions">
              {/* Edit Donation */}
              <button
                className="btn-mobile-action"
                onClick={() => onEdit && onEdit(donor)}
                style={{
                  background: "rgba(33, 150, 243, 0.15)",
                  border: "1px solid rgba(33, 150, 243, 0.45)",
                  color: "#90CAF9",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Edit</span>
              </button>

              {/* Download PDF */}
              <a
                href={`/api/receipt/${donor.receiptId}.pdf`}
                download={`${donor.receiptId}.pdf`}
                className="btn-mobile-action"
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.22)",
                  color: "#FFFFFF",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>PDF</span>
              </a>

              {/* Direct WhatsApp Deep-Link */}
              <a
                href={getDonorWhatsAppUrl(donor)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleResendWhatsApp(donor)}
                className="btn-mobile-action btn-mobile-whatsapp"
                style={{
                  background:
                    sendingReceiptId === donor.receiptId
                      ? "rgba(37, 211, 102, 0.3)"
                      : "linear-gradient(135deg, #25D366, #128C7E)",
                  border: "1px solid rgba(37, 211, 102, 0.6)",
                  color: "#FFFFFF",
                  boxShadow: "0 2px 10px rgba(18, 140, 126, 0.35)",
                  textDecoration: "none",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.155.57 4.175 1.564 5.923l-1.564 5.905 6.079-1.595c1.679.914 3.593 1.434 5.626 1.434 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z" />
                </svg>
                <span>Send WhatsApp Receipt</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* ============================================================ */}
      {/* 2. DESKTOP TABLE VIEW (ACTIVE ON SCREENS >= 768px)           */}
      {/* ============================================================ */}
      <div className="desktop-table-container table-container">
        <div style={{ overflowX: "auto" }}>
          <table className="donor-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("receiptId")} style={{ width: "160px", whiteSpace: "nowrap" }}>
                  Receipt No {sortArrow("receiptId")}
                </th>
                <th onClick={() => handleSort("name")}>
                  Resident Name {sortArrow("name")}
                </th>
                <th onClick={() => handleSort("flatNumber")} style={{ width: "130px" }}>
                  Flat No {sortArrow("flatNumber")}
                </th>
                <th onClick={() => handleSort("phone")}>
                  Phone Number {sortArrow("phone")}
                </th>
                <th style={{ width: "90px" }}>Type</th>
                <th style={{ width: "90px" }}>Payment</th>
                <th onClick={() => handleSort("amount")} style={{ textAlign: "right" }}>
                  Amount {sortArrow("amount")}
                </th>
                <th onClick={() => handleSort("createdAt")}>
                  Date & Time {sortArrow("createdAt")}
                </th>
                <th style={{ textAlign: "center", minWidth: "260px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((donor) => (
                <tr key={donor.id}>
                  {/* Receipt ID - Royal Gold Badge */}
                  <td>
                    <div className="receipt-badge">
                      <span className="receipt-star">✦</span>
                      <span className="receipt-text">{donor.receiptId}</span>
                    </div>
                  </td>

                  {/* Donor Name */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #FF6B00, #FFB300)",
                          color: "#1A0C00",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.85rem",
                          fontWeight: 800,
                          flexShrink: 0,
                          boxShadow: "0 2px 8px rgba(255, 107, 0, 0.3)",
                        }}
                      >
                        {donor.name.charAt(0).toUpperCase()}
                      </span>
                      <span style={{ fontWeight: 600, color: "#FFFFFF" }}>{donor.name}</span>
                    </div>
                  </td>

                  {/* Flat Number */}
                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "rgba(255, 215, 0, 0.1)",
                        border: "1px solid rgba(255, 215, 0, 0.3)",
                        padding: "4px 10px",
                        borderRadius: "8px",
                        fontSize: "0.84rem",
                        fontWeight: 700,
                        color: "#FFE082",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                        <path d="M9 22v-4h6v4" />
                        <line x1="8" y1="6" x2="8.01" y2="6" />
                        <line x1="16" y1="6" x2="16.01" y2="6" />
                        <line x1="12" y1="6" x2="12.01" y2="6" />
                        <line x1="8" y1="10" x2="8.01" y2="10" />
                        <line x1="12" y1="10" x2="12.01" y2="10" />
                        <line x1="16" y1="10" x2="16.01" y2="10" />
                      </svg>
                      {donor.flatNumber}
                    </span>
                  </td>

                  {/* Phone with WhatsApp SVG */}
                  <td>
                    <a
                      href={`https://wa.me/91${donor.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#EDE3D2",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "0.88rem",
                      }}
                      title="Open WhatsApp Chat"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.155.57 4.175 1.564 5.923l-1.564 5.905 6.079-1.595c1.679.914 3.593 1.434 5.626 1.434 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z" />
                      </svg>
                      +91 {donor.phone}
                    </a>
                  </td>

                  {/* Resident Type */}
                  <td>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      padding: "4px 10px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 600,
                      background: (donor.residentType || 'Owner') === 'Owner' ? 'rgba(102, 187, 106, 0.15)' : 'rgba(66, 165, 245, 0.15)',
                      border: `1px solid ${(donor.residentType || 'Owner') === 'Owner' ? 'rgba(102, 187, 106, 0.4)' : 'rgba(66, 165, 245, 0.4)'}`,
                      color: (donor.residentType || 'Owner') === 'Owner' ? '#81C784' : '#64B5F6',
                    }}>
                      {(donor.residentType || 'Owner') === 'Owner' ? 'Owner' : 'Tenant'}
                    </span>
                  </td>

                  {/* Payment Mode */}
                  <td>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      padding: "4px 10px", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 600,
                      background: (donor.paymentMode || 'Cash') === 'Cash' ? 'rgba(255, 179, 0, 0.15)' : 'rgba(171, 71, 188, 0.15)',
                      border: `1px solid ${(donor.paymentMode || 'Cash') === 'Cash' ? 'rgba(255, 179, 0, 0.4)' : 'rgba(171, 71, 188, 0.4)'}`,
                      color: (donor.paymentMode || 'Cash') === 'Cash' ? '#FFB300' : '#CE93D8',
                    }}>
                      {donor.paymentMode || 'Cash'}
                    </span>
                  </td>

                  {/* Amount */}
                  <td style={{ textAlign: "right" }}>
                    <span className="amount-cell">
                      ₹{donor.amount.toLocaleString("en-IN")}
                    </span>
                  </td>

                  {/* Date */}
                  <td style={{ fontSize: "0.85rem", color: "#D7CCC8" }}>
                    <div>
                      {new Date(donor.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "#A1887F" }}>
                      {new Date(donor.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </div>
                  </td>

                  {/* Desktop Action Buttons */}
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      {/* Edit Donation */}
                      <button
                        onClick={() => onEdit && onEdit(donor)}
                        title="Edit Resident Donation Details"
                        style={{
                          background: "rgba(33, 150, 243, 0.15)",
                          border: "1px solid rgba(33, 150, 243, 0.4)",
                          color: "#64B5F6",
                          padding: "6px 10px",
                          borderRadius: "8px",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          transition: "all 0.2s",
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>Edit</span>
                      </button>

                      {/* Download PDF */}
                      <a
                        href={`/api/receipt/${donor.receiptId}.pdf`}
                        download={`${donor.receiptId}.pdf`}
                        title="Download PDF Receipt"
                        style={{
                          background: "rgba(255, 255, 255, 0.08)",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          color: "#FFFFFF",
                          padding: "6px 10px",
                          borderRadius: "8px",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          transition: "all 0.2s",
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span>PDF</span>
                      </a>

                      {/* Direct WhatsApp Deep-Link */}
                      <a
                        href={getDonorWhatsAppUrl(donor)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleResendWhatsApp(donor)}
                        title="Send Official Receipt via WhatsApp"
                        style={{
                          background:
                            sendingReceiptId === donor.receiptId
                              ? "rgba(37, 211, 102, 0.3)"
                              : "linear-gradient(135deg, #25D366, #128C7E)",
                          border: "1px solid rgba(37, 211, 102, 0.5)",
                          color: "#FFFFFF",
                          padding: "6px 11px",
                          borderRadius: "8px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          boxShadow: "0 2px 8px rgba(18, 140, 126, 0.3)",
                          textDecoration: "none",
                          transition: "all 0.2s",
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.155.57 4.175 1.564 5.923l-1.564 5.905 6.079-1.595c1.679.914 3.593 1.434 5.626 1.434 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z" />
                        </svg>
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
