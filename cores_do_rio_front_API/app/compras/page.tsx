"use client";
import { ShoppingCart, Clock } from "lucide-react";

export default function ComprasPage() {
  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "clamp(1.5rem,4vw,3rem) clamp(1rem,3vw,2rem)" }}>
      <h1 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 400, color: "#1A2A3A", letterSpacing: "-0.01em", lineHeight: 1.1, marginBottom: "8px" }}>
        Compras
      </h1>
      <p style={{ fontSize: "0.8rem", color: "rgba(26,42,58,0.45)", marginBottom: "48px" }}>
        Pedidos de materiais e ordens de compra
      </p>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", backgroundColor: "#fff", border: "1px solid rgba(26,42,58,0.10)", borderRadius: "16px", textAlign: "center" }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "rgba(26,42,58,0.05)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
          <ShoppingCart size={24} color="rgba(26,42,58,0.3)" strokeWidth={1.5} />
        </div>
        <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.4rem", fontWeight: 400, color: "#1A2A3A", marginBottom: "8px" }}>
          Módulo em construção
        </p>
        <p style={{ fontSize: "0.8rem", color: "rgba(26,42,58,0.4)", display: "flex", alignItems: "center", gap: "6px" }}>
          <Clock size={12} strokeWidth={2} />
          Em breve disponível
        </p>
      </div>
    </div>
  );
}
