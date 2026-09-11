"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import DonorTable from "@/components/DonorTable";
import WhatsAppGatewayConfig from "@/components/WhatsAppGatewayConfig";
import SuccessModal from "@/components/SuccessModal";
import { Donor, DonationFormData, DonationResponse, ResidentType, PaymentMode } from "@/lib/types";

export default function AdminPage() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"donations" | "whatsapp">("donations");

  // WhatsApp connection status for header badge
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState<string | null>(null);

  // Add Donation Modal & Success Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [successData, setSuccessData] = useState<DonationResponse | null>(null);
  const [manualForm, setManualForm] = useState<DonationFormData>({
    name: "",
    phone: "",
    amount: 0,
    flatNumber: "",
    residentType: "Owner",
    paymentMode: "Cash",
  });
  const [manualAmountInput, setManualAmountInput] = useState("");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Edit Donation Modal State
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [editForm, setEditForm] = useState<DonationFormData>({
    name: "",
    phone: "",
    amount: 0,
    flatNumber: "",
    residentType: "Owner",
    paymentMode: "Cash",
  });
  const [editAmountInput, setEditAmountInput] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function handleStartEdit(donor: Donor) {
    setEditingDonor(donor);
    setEditForm({
      name: donor.name,
      phone: donor.phone,
      amount: donor.amount,
      flatNumber: donor.flatNumber,
      residentType: donor.residentType || "Owner",
      paymentMode: donor.paymentMode || "Cash",
    });
    setEditAmountInput(String(donor.amount));
    setEditError(null);
  }

  async function handleEditDonationSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDonor) return;
    setEditError(null);

    if (!editForm.name || editForm.name.trim().length < 2) {
      setEditError("Please enter resident full name.");
      return;
    }
    const cleanPhone = editForm.phone.replace(/\s/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setEditError("Please enter a valid 10-digit Indian phone number.");
      return;
    }
    if (!editForm.flatNumber || editForm.flatNumber.trim().length < 1) {
      setEditError("Please enter flat number.");
      return;
    }
    const parsedAmount = parseInt(editAmountInput, 10);
    if (isNaN(parsedAmount) || parsedAmount < 1) {
      setEditError("Please enter a valid donation amount.");
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await fetch("/api/donors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingDonor.id,
          name: editForm.name.trim(),
          phone: cleanPhone,
          flatNumber: editForm.flatNumber.trim(),
          amount: parsedAmount,
          residentType: editForm.residentType,
          paymentMode: editForm.paymentMode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingDonor(null);
        fetchDonors();
        setRefreshNotice(`✓ Updated donation for ${data.donor.name} (Flat ${data.donor.flatNumber})!`);
        setTimeout(() => setRefreshNotice(null), 3500);
      } else {
        setEditError(data.message || "Failed to update donation.");
      }
    } catch {
      setEditError("Network error updating donation.");
    } finally {
      setIsSubmittingEdit(false);
    }
  }

  const handleClearAllData = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all test records?\n\nThis will reset the database to 0 so you have a completely clean app for live production donations."
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/donors?clearAll=true", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setDonors([]);
        setRefreshNotice("✓ All test records cleared! Database is now fresh and clean.");
        setTimeout(() => setRefreshNotice(null), 4000);
      } else {
        alert(data.message || "Failed to clear records.");
      }
    } catch {
      alert("Network error clearing records.");
    }
  };

  const fetchDonors = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/donors?t=${Date.now()}`, {
        cache: "no-store",
        headers: { Pragma: "no-cache" },
      });
      const data = await res.json();
      if (data.success) {
        setDonors(data.donors);
        setRefreshNotice("✓ Live records refreshed successfully!");
        setTimeout(() => setRefreshNotice(null), 3000);
      }
    } catch (err) {
      console.error("Failed to load donors:", err);
      setRefreshNotice("Failed to refresh records.");
      setTimeout(() => setRefreshNotice(null), 3000);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Check WhatsApp status for header indicator
  const checkWhatsApp = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/local");
      const data = await res.json();
      setWhatsappConnected(Boolean(data.connected));
      setWhatsappPhone(data.phone || null);
    } catch {
      setWhatsappConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchDonors();
    checkWhatsApp();
    const interval = setInterval(checkWhatsApp, 5000);
    return () => clearInterval(interval);
  }, [fetchDonors, checkWhatsApp]);

  // Calculations & Analytics
  const totalAmount = donors.reduce((sum, d) => sum + d.amount, 0);
  const avgAmount = donors.length > 0 ? Math.round(totalAmount / donors.length) : 0;
  const uniqueFlats = new Set(donors.map((d) => d.flatNumber.toUpperCase())).size;

  const highestDonation = donors.reduce((max, d) => (d.amount > max.amount ? d : max), {
    amount: 0,
    name: "—",
    flatNumber: "—",
  } as { amount: number; name: string; flatNumber: string });

  // Handle Add Donation Submission
  async function handleAddDonationSubmit(e: React.FormEvent) {
    e.preventDefault();
    setManualError(null);

    if (!manualForm.name || manualForm.name.trim().length < 2) {
      setManualError("Please enter devotee / resident full name.");
      return;
    }
    const cleanPhone = manualForm.phone.replace(/\s/g, "");
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setManualError("Please enter a valid 10-digit Indian phone number.");
      return;
    }
    if (!manualForm.flatNumber || manualForm.flatNumber.trim().length < 1) {
      setManualError("Please enter flat number.");
      return;
    }
    const parsedAmount = parseInt(manualAmountInput, 10);
    if (isNaN(parsedAmount) || parsedAmount < 1) {
      setManualError("Please enter a valid donation amount.");
      return;
    }

    setIsSubmittingManual(true);
    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: manualForm.name.trim(),
          phone: cleanPhone,
          amount: parsedAmount,
          flatNumber: manualForm.flatNumber.trim(),
          residentType: manualForm.residentType,
          paymentMode: manualForm.paymentMode,
        }),
      });
      const data: DonationResponse = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setManualForm({ name: "", phone: "", amount: 0, flatNumber: "", residentType: "Owner", paymentMode: "Cash" });
        setManualAmountInput("");
        fetchDonors();
        setSuccessData(data);
      } else {
        setManualError(data.message || "Failed to record donation.");
      }
    } catch {
      setManualError("Network error recording donation.");
    } finally {
      setIsSubmittingManual(false);
    }
  }

  // Reusable Pill Toggle Component
  const PillToggle = ({ label, options, value, onChange }: {
    label: string;
    options: { value: string; label: string; icon: React.ReactNode; activeColor: string; activeBg: string }[];
    value: string;
    onChange: (val: string) => void;
  }) => (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ display: "block", color: "#FFE082", fontSize: "0.82rem", fontWeight: 600, marginBottom: "8px" }}>
        {label}
      </label>
      <div style={{ display: "flex", gap: "8px" }}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: "12px",
              border: value === opt.value ? `2px solid ${opt.activeColor}` : "1px solid rgba(255, 179, 0, 0.2)",
              background: value === opt.value ? opt.activeBg : "rgba(18, 9, 2, 0.6)",
              color: value === opt.value ? opt.activeColor : "#D7CCC8",
              fontSize: "0.88rem",
              fontWeight: value === opt.value ? 700 : 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  const residentTypeOptions = [
    {
      value: "Owner",
      label: "Owner",
      activeColor: "#66BB6A",
      activeBg: "rgba(102, 187, 106, 0.15)",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      value: "Rent",
      label: "Tenant",
      activeColor: "#42A5F5",
      activeBg: "rgba(66, 165, 245, 0.15)",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      ),
    },
  ];

  const paymentModeOptions = [
    {
      value: "Cash",
      label: "Cash",
      activeColor: "#FFB300",
      activeBg: "rgba(255, 179, 0, 0.15)",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <circle cx="12" cy="12" r="3" />
          <line x1="1" y1="10" x2="4" y2="10" />
          <line x1="20" y1="10" x2="23" y2="10" />
        </svg>
      ),
    },
    {
      value: "UPI",
      label: "UPI",
      activeColor: "#AB47BC",
      activeBg: "rgba(171, 71, 188, 0.15)",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
          <path d="M7 15h0M2 9h20" />
        </svg>
      ),
    },
  ];

  return (
    <div className="admin-container" style={{ position: "relative", minHeight: "100vh" }}>
      {/* Devotional Ambient Particles */}
      <div className="particles">
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
        <div className="particle" />
      </div>

      {/* Live Toast Notice for Refresh / Export */}
      {refreshNotice && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 99999,
            background: "rgba(20, 12, 4, 0.95)",
            border: "1px solid #FFD54F",
            color: "#69F0AE",
            padding: "12px 22px",
            borderRadius: "12px",
            fontSize: "0.88rem",
            fontWeight: 700,
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {refreshNotice}
        </div>
      )}

      {/* Sacred Invocation Banner */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto 12px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(28, 14, 4, 0.8)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 215, 0, 0.4)",
            padding: "5px 18px",
            borderRadius: "20px",
            color: "#FFE082",
            fontSize: "0.82rem",
            fontWeight: 700,
            letterSpacing: "0.5px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
          }}
        >
          <span>॥ ॐ శ్రీ వరసిద్ధి వినాయక స్వామియే నమః ॥</span>
        </div>
      </div>

      {/* Executive Clean Header */}
      <div className="admin-header" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          {/* Single Official Ira Hill View Apartments Emblem */}
          <div
            style={{
              position: "relative",
              width: 58,
              height: 58,
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid #FFD54F",
              boxShadow: "0 0 16px rgba(255, 179, 0, 0.4)",
              flexShrink: 0,
            }}
            title="Ira Hill View Apartments Crest"
          >
            <Image
              src="/ira-emblem.jpg"
              alt="Ira Hill View Apartments Tirupati Emblem"
              width={58}
              height={58}
              style={{ objectFit: "cover" }}
              priority
            />
          </div>

          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.8rem",
                color: "#FFE082",
                fontWeight: 700,
                letterSpacing: "0.5px",
                marginBottom: "2px",
              }}
            >
              <span>Ira Hill View Apartments</span>
              <span style={{ opacity: 0.5 }}>•</span>
              <span>Settipalli, Tirupati</span>
            </div>

            <h1 className="admin-title" style={{ fontSize: "1.7rem", margin: "2px 0 0" }}>
              Ganesh Utsav 2026 Admin Dashboard
            </h1>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="admin-actions">
          {/* Add Donation Button - Single Plus Icon */}
          <button
            className="btn-export btn-add-primary"
            onClick={() => setShowAddModal(true)}
            style={{
              background: "linear-gradient(135deg, #FF6B00, #E65100)",
              boxShadow: "0 4px 18px rgba(230, 81, 0, 0.45)",
              border: "1px solid rgba(255, 215, 0, 0.4)",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Donation</span>
          </button>

          {/* Official Excel Download Link */}
          <a
            href="/api/export/Ira_Hill_View_Ganesh_Donations_2026.xlsx"
            download="Ira_Hill_View_Ganesh_Donations_2026.xlsx"
            className="btn-export"
            style={{
              background: "linear-gradient(135deg, #2e7d32, #1b5e20)",
              boxShadow: "0 4px 15px rgba(46, 125, 50, 0.35)",
              textDecoration: "none",
              color: "#FFFFFF",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
            title="Download formatted Excel (.xlsx) spreadsheet with multiple sheets"
          >
            <svg
              width="15"
              height="15"
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
            <span>Excel (.xlsx)</span>
          </a>

          {/* Refresh */}
          <button
            className="btn-export"
            onClick={fetchDonors}
            disabled={isRefreshing}
            style={{
              background: "linear-gradient(135deg, #1565c0, #0d47a1)",
              boxShadow: "0 4px 15px rgba(13, 71, 161, 0.35)",
              cursor: isRefreshing ? "wait" : "pointer",
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: isRefreshing ? "spin 0.8s linear infinite" : "none" }}
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>

          {/* Reset Test Data */}
          {donors.length > 0 && (
            <button
              className="btn-export"
              onClick={handleClearAllData}
              title="Clear all test donation records to start fresh in production"
              style={{
                background: "rgba(211, 47, 47, 0.15)",
                border: "1px solid rgba(244, 67, 54, 0.4)",
                color: "#FF8A80",
                boxShadow: "none",
                cursor: "pointer",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Reset Test Data</span>
            </button>
          )}
        </div>
      </div>

      {/* Clean 4-Card KPI Strip */}
      <div
        className="stats-grid"
        style={{
          marginBottom: "28px",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Total Collection */}
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div className="stat-label" style={{ margin: 0 }}>Total Collection</div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD54F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3h12" />
              <path d="M6 8h12" />
              <path d="M6 13l8.5 8" />
              <path d="M6 13h3a4 4 0 0 0 0-8" />
            </svg>
          </div>
          <div className="stat-value gold">
            ₹{totalAmount.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#69F0AE", marginTop: "4px" }}>
            {donors.length} contributions recorded
          </div>
        </div>

        {/* Contributing Flats */}
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div className="stat-label" style={{ margin: 0 }}>Contributing Flats</div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD54F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="stat-value">
            {uniqueFlats} <span style={{ fontSize: "1.05rem", color: "#FFD54F" }}>Apartments</span>
          </div>
          <div style={{ fontSize: "0.8rem", color: "#D7CCC8", marginTop: "4px" }}>
            Ira Hill View community
          </div>
        </div>

        {/* Average Contribution */}
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div className="stat-label" style={{ margin: 0 }}>Average Donation</div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD54F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div className="stat-value">
            ₹{avgAmount.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#D7CCC8", marginTop: "4px" }}>
            Per resident average
          </div>
        </div>

        {/* Highest Contribution */}
        <div className="stat-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div className="stat-label" style={{ margin: 0 }}>Highest Donation</div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD54F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="stat-value" style={{ fontSize: "1.8rem", color: "#FFE082" }}>
            ₹{highestDonation.amount.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#D7CCC8", marginTop: "4px" }}>
            {highestDonation.name} {highestDonation.flatNumber !== "—" ? `(Flat ${highestDonation.flatNumber})` : ""}
          </div>
        </div>
      </div>

      {/* Clean Segmented Navigation Tabs */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto 24px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          borderBottom: "1px solid rgba(255, 179, 0, 0.2)",
          paddingBottom: "14px",
        }}
      >
        <button
          onClick={() => setActiveTab("donations")}
          style={{
            background:
              activeTab === "donations"
                ? "linear-gradient(135deg, rgba(255, 107, 0, 0.25), rgba(255, 179, 0, 0.15))"
                : "transparent",
            border:
              activeTab === "donations"
                ? "1px solid #FFB300"
                : "1px solid transparent",
            color: activeTab === "donations" ? "#FFE082" : "#D7CCC8",
            padding: "10px 22px",
            borderRadius: "14px",
            fontSize: "0.92rem",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s ease",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>Donation Records</span>
          <span
            style={{
              background: "rgba(255, 179, 0, 0.25)",
              color: "#FFF8E1",
              padding: "2px 8px",
              borderRadius: "10px",
              fontSize: "0.78rem",
            }}
          >
            {donors.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("whatsapp")}
          style={{
            background:
              activeTab === "whatsapp"
                ? "linear-gradient(135deg, rgba(37, 211, 102, 0.25), rgba(18, 140, 126, 0.15))"
                : "transparent",
            border:
              activeTab === "whatsapp"
                ? "1px solid #25D366"
                : "1px solid transparent",
            color: activeTab === "whatsapp" ? "#69F0AE" : "#D7CCC8",
            padding: "10px 22px",
            borderRadius: "14px",
            fontSize: "0.92rem",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s ease",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.155.57 4.175 1.564 5.923l-1.564 5.905 6.079-1.595c1.679.914 3.593 1.434 5.626 1.434 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z" />
          </svg>
          <span>WhatsApp Automation</span>
          <span
            style={{
              background: whatsappConnected ? "rgba(37, 211, 102, 0.25)" : "rgba(255, 179, 0, 0.25)",
              color: whatsappConnected ? "#69F0AE" : "#FFD54F",
              padding: "2px 8px",
              borderRadius: "10px",
              fontSize: "0.78rem",
            }}
          >
            {whatsappConnected ? `Linked (+${whatsappPhone})` : "Setup QR"}
          </span>
        </button>
      </div>

      {/* Main Content Area Based on Active Tab */}
      {activeTab === "donations" ? (
        <div>
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#FFE082" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  border: "3px solid rgba(255,179,0,0.2)",
                  borderTopColor: "#FFB300",
                  borderRadius: "50%",
                  margin: "0 auto 16px",
                  animation: "spin 0.7s linear infinite",
                }}
              />
              Loading resident records...
            </div>
          ) : (
            <DonorTable
              donors={donors}
              onRefresh={fetchDonors}
              onEdit={handleStartEdit}
            />
          )}
        </div>
      ) : (
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <WhatsAppGatewayConfig />
        </div>
      )}

      {/* Add Donation Form Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.78)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "490px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "rgba(26, 13, 4, 0.96)",
              border: "2px solid #FFB300",
              borderRadius: "22px",
              padding: "28px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.85)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "18px",
                borderBottom: "1px solid rgba(255, 179, 0, 0.2)",
                paddingBottom: "12px",
              }}
            >
              <div>
                <h3 style={{ margin: 0, color: "#FFF8E1", fontSize: "1.25rem", fontWeight: 700 }}>
                  Add Resident Donation
                </h3>
                <div style={{ color: "#FFE082", fontSize: "0.82rem", marginTop: 2 }}>
                  Ira Hill View Apartments • Tirupati
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#FFFFFF",
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {manualError && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(255, 82, 82, 0.2)",
                  border: "1px solid #FF5252",
                  borderRadius: "8px",
                  color: "#FF8A80",
                  fontSize: "0.85rem",
                  marginBottom: "16px",
                }}
              >
                {manualError}
              </div>
            )}

            <form onSubmit={handleAddDonationSubmit}>
              {/* Name */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", color: "#FFE082", fontSize: "0.82rem", fontWeight: 600, marginBottom: "5px" }}>
                  Devotee / Resident Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Naidu / Sailesh Kumar"
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    background: "rgba(18, 9, 2, 0.8)",
                    border: "1px solid rgba(255, 179, 0, 0.3)",
                    borderRadius: "10px",
                    color: "#FFFFFF",
                    fontSize: "0.92rem",
                    outline: "none",
                  }}
                  required
                />
              </div>

              {/* Flat & Phone Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", color: "#FFE082", fontSize: "0.82rem", fontWeight: 600, marginBottom: "5px" }}>
                    Flat Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 301 / Block A - 402"
                    value={manualForm.flatNumber}
                    onChange={(e) => setManualForm({ ...manualForm, flatNumber: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      background: "rgba(18, 9, 2, 0.8)",
                      border: "1px solid rgba(255, 179, 0, 0.3)",
                      borderRadius: "10px",
                      color: "#FFFFFF",
                      fontSize: "0.92rem",
                      outline: "none",
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", color: "#FFE082", fontSize: "0.82rem", fontWeight: 600, marginBottom: "5px" }}>
                    WhatsApp Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit number"
                    value={manualForm.phone}
                    onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      background: "rgba(18, 9, 2, 0.8)",
                      border: "1px solid rgba(255, 179, 0, 0.3)",
                      borderRadius: "10px",
                      color: "#FFFFFF",
                      fontSize: "0.92rem",
                      outline: "none",
                    }}
                    required
                  />
                </div>
              </div>

              {/* Owner / Rent Toggle */}
              <PillToggle
                label="Resident Type"
                options={residentTypeOptions}
                value={manualForm.residentType}
                onChange={(val) => setManualForm({ ...manualForm, residentType: val as ResidentType })}
              />

              {/* Cash / UPI Toggle */}
              <PillToggle
                label="Payment Mode"
                options={paymentModeOptions}
                value={manualForm.paymentMode}
                onChange={(val) => setManualForm({ ...manualForm, paymentMode: val as PaymentMode })}
              />

              {/* Direct Amount (No predefined presets) */}
              <div style={{ marginBottom: "22px" }}>
                <label style={{ display: "block", color: "#FFE082", fontSize: "0.82rem", fontWeight: 600, marginBottom: "5px" }}>
                  Donation Amount (₹)
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#FFB300",
                      fontWeight: 800,
                      fontSize: "1.15rem",
                    }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    placeholder="Enter amount (e.g. 5001)"
                    min="1"
                    value={manualAmountInput}
                    onChange={(e) => setManualAmountInput(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      paddingLeft: "34px",
                      background: "rgba(18, 9, 2, 0.8)",
                      border: "1px solid rgba(255, 179, 0, 0.3)",
                      borderRadius: "10px",
                      color: "#FFFFFF",
                      fontSize: "1.15rem",
                      fontWeight: 700,
                      outline: "none",
                    }}
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmittingManual}
                style={{
                  width: "100%",
                  padding: "13px",
                  background: "linear-gradient(135deg, #FF6B00, #E65100)",
                  border: "1px solid #FFD700",
                  borderRadius: "12px",
                  color: "#FFFFFF",
                  fontSize: "0.96rem",
                  fontWeight: 700,
                  cursor: isSubmittingManual ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 15px rgba(230, 81, 0, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {isSubmittingManual ? (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: 16,
                        height: 16,
                        border: "2px solid rgba(255,255,255,0.4)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    Recording & Generating Receipt...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#FFD54F" stroke="#FFB300" />
                    </svg>
                    Record Donation & Issue Official Receipt
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Donation Form Modal */}
      {editingDonor && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setEditingDonor(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "490px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "rgba(26, 13, 4, 0.96)",
              border: "2px solid #64B5F6",
              borderRadius: "22px",
              padding: "28px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.85), 0 0 20px rgba(33, 150, 243, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "18px",
                borderBottom: "1px solid rgba(255, 179, 0, 0.2)",
                paddingBottom: "12px",
              }}
            >
              <div>
                <h3 style={{ margin: 0, color: "#FFF8E1", fontSize: "1.25rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64B5F6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <span>Edit Donation Record</span>
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                  <div className="receipt-badge">
                    <span className="receipt-star">✦</span>
                    <span className="receipt-text">{editingDonor.receiptId}</span>
                  </div>
                  <span style={{ color: "#FFE082", fontSize: "0.8rem" }}>
                    • Ira Hill View
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEditingDonor(null)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#FFFFFF",
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {editError && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(255, 82, 82, 0.2)",
                  border: "1px solid #FF5252",
                  borderRadius: "8px",
                  color: "#FF8A80",
                  fontSize: "0.85rem",
                  marginBottom: "16px",
                }}
              >
                {editError}
              </div>
            )}

            <form onSubmit={handleEditDonationSubmit}>
              {/* Name */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", color: "#FFE082", fontSize: "0.82rem", fontWeight: 600, marginBottom: "5px" }}>
                  Devotee / Resident Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Naidu"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: "rgba(18, 9, 2, 0.8)",
                    border: "1px solid rgba(255, 179, 0, 0.3)",
                    borderRadius: "10px",
                    color: "#FFFFFF",
                    fontSize: "16px",
                    outline: "none",
                  }}
                  required
                />
              </div>

              {/* Flat & Phone Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", color: "#FFE082", fontSize: "0.82rem", fontWeight: 600, marginBottom: "5px" }}>
                    Flat Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 301"
                    value={editForm.flatNumber}
                    onChange={(e) => setEditForm({ ...editForm, flatNumber: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "rgba(18, 9, 2, 0.8)",
                      border: "1px solid rgba(255, 179, 0, 0.3)",
                      borderRadius: "10px",
                      color: "#FFFFFF",
                      fontSize: "16px",
                      outline: "none",
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", color: "#FFE082", fontSize: "0.82rem", fontWeight: 600, marginBottom: "5px" }}>
                    WhatsApp Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit number"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "rgba(18, 9, 2, 0.8)",
                      border: "1px solid rgba(255, 179, 0, 0.3)",
                      borderRadius: "10px",
                      color: "#FFFFFF",
                      fontSize: "16px",
                      outline: "none",
                    }}
                    required
                  />
                </div>
              </div>

              {/* Owner / Rent Toggle */}
              <PillToggle
                label="Resident Type"
                options={residentTypeOptions}
                value={editForm.residentType}
                onChange={(val) => setEditForm({ ...editForm, residentType: val as ResidentType })}
              />

              {/* Cash / UPI Toggle */}
              <PillToggle
                label="Payment Mode"
                options={paymentModeOptions}
                value={editForm.paymentMode}
                onChange={(val) => setEditForm({ ...editForm, paymentMode: val as PaymentMode })}
              />

              {/* Amount */}
              <div style={{ marginBottom: "22px" }}>
                <label style={{ display: "block", color: "#FFE082", fontSize: "0.82rem", fontWeight: 600, marginBottom: "5px" }}>
                  Donation Amount (₹)
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#FFB300",
                      fontWeight: 800,
                      fontSize: "1.15rem",
                    }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    min="1"
                    value={editAmountInput}
                    onChange={(e) => setEditAmountInput(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      paddingLeft: "36px",
                      background: "rgba(18, 9, 2, 0.8)",
                      border: "1px solid rgba(255, 179, 0, 0.3)",
                      borderRadius: "10px",
                      color: "#FFD54F",
                      fontWeight: 700,
                      fontSize: "16px",
                      outline: "none",
                    }}
                    required
                  />
                </div>
              </div>

              {/* Submit / Cancel Action Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setEditingDonor(null)}
                  style={{
                    padding: "13px",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "12px",
                    color: "#D7CCC8",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "0.92rem",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  style={{
                    padding: "13px",
                    background: "linear-gradient(135deg, #1976D2, #0D47A1)",
                    border: "1px solid #64B5F6",
                    borderRadius: "12px",
                    color: "#FFFFFF",
                    fontWeight: 700,
                    cursor: isSubmittingEdit ? "wait" : "pointer",
                    fontSize: "0.95rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 15px rgba(25, 118, 210, 0.4)",
                  }}
                >
                  {isSubmittingEdit ? (
                    "Saving Changes..."
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal After Adding Donation */}
      {successData && (
        <SuccessModal
          data={successData}
          onClose={() => setSuccessData(null)}
        />
      )}

      {/* Clean Devotional Footer */}
      <footer
        style={{
          maxWidth: 1200,
          margin: "40px auto 10px",
          textAlign: "center",
          padding: "20px 0",
          borderTop: "1px solid rgba(255, 179, 0, 0.2)",
          color: "#D7CCC8",
          fontSize: "0.85rem",
        }}
      >
        <div style={{ color: "#FFD54F", fontWeight: 700, marginBottom: "4px" }}>
          ॥ శ్రీ వరసిద్ధి వినాయక స్వామి మరియు శ్రీ వేంకటేశ్వర స్వామి ఆశీస్సులు ॥
        </div>
        <div>
          Ira Hill View Apartments Community Welfare Committee • Settipalli, Tirupati
        </div>
      </footer>
    </div>
  );
}
