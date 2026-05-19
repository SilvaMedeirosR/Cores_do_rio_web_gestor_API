"use client";
import { useState, useEffect } from "react";
import { subscribeToast, type ToastPayload } from "@/lib/toast";

const ICONS: Record<string, React.ReactNode> = {
  success: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  error: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  warning: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  info: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
};

const BG: Record<string, string> = {
  success: "#1A2A3A",
  error:   "#dc2626",
  warning: "#92400e",
  info:    "#1A2A3A",
};

const ACCENT: Record<string, string> = {
  success: "#10b981",
  error:   "#fca5a5",
  warning: "#fcd34d",
  info:    "#93c5fd",
};

type Active = ToastPayload & { visible: boolean };

export default function Toaster() {
  const [toasts, setToasts] = useState<Active[]>([]);

  useEffect(() => {
    return subscribeToast(t => {
      setToasts(prev => [...prev, { ...t, visible: true }]);
      setTimeout(() => {
        setToasts(prev => prev.map(x => x.id === t.id ? { ...x, visible: false } : x));
        setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 320);
      }, t.duration);
    });
  }, []);

  if (!toasts.length) return null;

  return (
    <div style={{
      position: "fixed", bottom: "clamp(16px,4vw,28px)", right: "clamp(16px,4vw,28px)",
      zIndex: 9999, display: "flex", flexDirection: "column-reverse", gap: "8px",
      maxWidth: "min(360px,calc(100vw - 32px))", pointerEvents: "none",
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "11px 14px",
          borderRadius: "10px",
          backgroundColor: BG[t.type],
          color: "#F3ECE0",
          fontSize: "0.82rem",
          fontWeight: 500,
          boxShadow: "0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.14)",
          borderLeft: `3px solid ${ACCENT[t.type]}`,
          opacity: t.visible ? 1 : 0,
          transform: t.visible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.97)",
          transition: "opacity 0.28s ease, transform 0.28s cubic-bezier(0.34,1.2,0.64,1)",
          pointerEvents: "auto",
          lineHeight: 1.4,
          userSelect: "none",
        }}>
          <span style={{ color: ACCENT[t.type], flexShrink: 0 }}>{ICONS[t.type]}</span>
          <span style={{ flex: 1 }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
