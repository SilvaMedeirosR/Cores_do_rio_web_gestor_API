"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page:       number;
  totalPages: number;
  from:       number;
  to:         number;
  total:      number;
  onPrev:     () => void;
  onNext:     () => void;
}

const NAV = "#1A2A3A";

function PagBtn({
  onClick, disabled, children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: "4px",
        padding: "7px 14px", borderRadius: "8px",
        border: `1px solid ${disabled ? "rgba(26,42,58,0.08)" : "rgba(26,42,58,0.16)"}`,
        backgroundColor: disabled ? "rgba(26,42,58,0.02)" : "#fff",
        color: disabled ? "rgba(26,42,58,0.22)" : NAV,
        fontSize: "0.78rem", fontWeight: 500,
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.15s",
        userSelect: "none",
      }}
      onMouseEnter={e => {
        if (!disabled) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(26,42,58,0.04)";
      }}
      onMouseLeave={e => {
        if (!disabled) (e.currentTarget as HTMLElement).style.backgroundColor = "#fff";
      }}
    >
      {children}
    </button>
  );
}

export default function Pagination({ page, totalPages, from, to, total, onPrev, onNext }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center",
      justifyContent: "space-between", flexWrap: "wrap",
      gap: "8px", marginTop: "16px", padding: "4px 0",
    }}>
      <span style={{ fontSize: "0.72rem", color: "rgba(26,42,58,0.38)" }}>
        {total === 0 ? "0 resultados" : `${from}–${to} de ${total}`}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <PagBtn onClick={onPrev} disabled={page === 0}>
          <ChevronLeft size={13} strokeWidth={2.5} />
          <span className="hide-xs">Anterior</span>
        </PagBtn>

        <span style={{
          fontSize: "0.8rem", fontWeight: 600, color: NAV,
          minWidth: "54px", textAlign: "center", letterSpacing: "0.02em",
        }}>
          {page + 1} / {totalPages}
        </span>

        <PagBtn onClick={onNext} disabled={page === totalPages - 1}>
          <span className="hide-xs">Próxima</span>
          <ChevronRight size={13} strokeWidth={2.5} />
        </PagBtn>
      </div>
    </div>
  );
}
