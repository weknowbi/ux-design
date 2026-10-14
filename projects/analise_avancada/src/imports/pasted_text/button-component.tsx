import "bootstrap/dist/css/bootstrap.min.css";
import { useState } from "react";

const primary = "#3366cc";
const primaryHover = "#2855b0";
const primaryShadow = "0 4px 14px rgba(51,102,204,.38)";
const primaryTint = "#dbeafe";
const primaryTintHover = "#bfdbfe";
const dangerColor = "#dc2626";
const dangerHover = "#b91c1c";
const dangerShadow = "0 4px 14px rgba(220,38,38,.35)";

// dark palette — baseado no design (#1A1B1C background)
const darkBg = "#1A1B1C";
const darkSurface = "#26282A";        // hover surface para ghost/outlined
const darkPrimary = "#8AB4F8";        // azul do design original
const darkPrimaryHover = "#A8C7FA";
const darkPrimaryTint = "#1E2D45";    // tinted: fundo azul escuro discreto
const darkPrimaryTintHover = "#243450";
const darkOutlinedBorder = "#8AB4F8";
const darkGhostText = "#8AB4F8";      // texto azul claro para ghost
const darkDanger = "#D9604E";         // coral/salmão do design
const darkDangerHover = "#E07060";

type Variant = "primary" | "secondary" | "outlined" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type BtnProps = {
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  dark?: boolean;
  children: React.ReactNode;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  onClick?: () => void;
};

function Btn({ variant = "primary", size = "md", disabled = false, dark = false, children, iconLeft, iconRight, fullWidth, onClick }: BtnProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const pad = size === "sm" ? "6px 12px" : size === "lg" ? "10px 20px" : "7px 16px";
  const fontSize = size === "sm" ? "0.8125rem" : size === "lg" ? "1rem" : "0.875rem";
  const radius = size === "sm" ? 6 : size === "lg" ? 10 : 8;

  const focusRing = focused ? `0 0 0 3px ${dark ? "rgba(77,132,226,.4)" : "rgba(51,102,204,.35)"}` : undefined;

  type StyleMap = Record<Variant, React.CSSProperties>;

  const base: StyleMap = dark
    ? {
        primary: {
          background: hovered ? darkPrimaryHover : darkPrimary,
          color: "#0D1B2A",
          border: "1.5px solid transparent",
          boxShadow: hovered ? "0 4px 14px rgba(91,143,217,.4)" : focusRing ?? "none",
        },
        secondary: {
          background: hovered ? darkPrimaryTintHover : darkPrimaryTint,
          color: darkGhostText,
          border: "1.5px solid transparent",
          boxShadow: focusRing ?? "none",
        },
        outlined: {
          background: hovered ? darkSurface : "transparent",
          color: hovered ? "#c8ddf5" : darkOutlinedBorder,
          border: `1.5px solid ${darkOutlinedBorder}`,
          boxShadow: focusRing ?? "none",
        },
        ghost: {
          background: hovered ? darkSurface : "transparent",
          color: darkGhostText,
          border: "1.5px solid transparent",
          boxShadow: focusRing ?? "none",
        },
        danger: {
          background: hovered ? darkDangerHover : darkDanger,
          color: "#fff",
          border: "1.5px solid transparent",
          boxShadow: hovered ? "0 4px 14px rgba(217,96,78,.4)" : focusRing ?? "none",
        },
      }
    : {
        primary: {
          background: hovered ? primaryHover : primary,
          color: "#fff",
          border: "1.5px solid transparent",
          boxShadow: hovered ? primaryShadow : focusRing ?? "none",
        },
        secondary: {
          background: hovered ? primaryTintHover : primaryTint,
          color: primary,
          border: "1.5px solid transparent",
          boxShadow: focusRing ?? "none",
        },
        outlined: {
          background: hovered ? primary : "transparent",
          color: hovered ? "#fff" : primary,
          border: `1.5px solid ${primary}`,
          boxShadow: hovered ? "0 2px 8px rgba(51,102,204,.2)" : focusRing ?? "none",
        },
        ghost: {
          background: hovered ? "#eef3fb" : "transparent",
          color: primary,
          border: "1.5px solid transparent",
          boxShadow: focusRing ?? "none",
        },
        danger: {
          background: hovered ? dangerHover : dangerColor,
          color: "#fff",
          border: "1.5px solid transparent",
          boxShadow: hovered ? dangerShadow : focusRing ?? "none",
        },
      };

  const disabledStyle: Partial<StyleMap> = dark
    ? {
        primary: { background: "rgba(138,180,248,.2)", color: "rgba(138,180,248,.4)", border: "none" },
        secondary: { background: "rgba(138,180,248,.07)", color: "rgba(138,180,248,.3)", border: "none" },
        outlined: { background: "transparent", color: "rgba(138,180,248,.3)", border: "1.5px solid rgba(138,180,248,.25)" },
        ghost: { background: "transparent", color: "rgba(138,180,248,.3)", border: "none" },
        danger: { background: "#3A2420", color: "#7A4A43", border: "none" },
      }
    : {
        primary: { background: "rgba(51,102,204,.15)", color: "rgba(51,102,204,.4)", border: "none" },
        secondary: { background: "rgba(51,102,204,.07)", color: "rgba(51,102,204,.35)", border: "none" },
        outlined: { background: "transparent", color: "rgba(51,102,204,.35)", border: "1.5px solid rgba(51,102,204,.3)" },
        ghost: { background: "transparent", color: "rgba(51,102,204,.35)", border: "none" },
        danger: { background: "#f87171", color: "#fff", border: "none" },
      };

  const style: React.CSSProperties = {
    ...(disabled ? disabledStyle[variant] : base[variant]),
    padding: pad,
    fontSize,
    borderRadius: radius,
    fontWeight: 400,
    fontFamily: "'Inter', sans-serif",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background .15s ease, box-shadow .15s ease, color .15s ease",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    outline: "none",
    width: fullWidth ? "100%" : undefined,
    justifyContent: fullWidth ? "center" : undefined,
    opacity: 1,
  };

  return (
    <button
      disabled={disabled}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onClick={onClick}
    >
      {iconLeft && <span style={{ display: "flex", alignItems: "center" }}>{iconLeft}</span>}
      <span>{children}</span>
      {iconRight && <span style={{ display: "flex", alignItems: "center" }}>{iconRight}</span>}
    </button>
  );
}

const IcPlus = () => <svg display="block" width="15" height="15" fill="none" style={{ display: "block" }}><path d="M7.5 2v11M2 7.5h11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" /></svg>;
const IcTrash = () => <svg width="15" height="15" fill="none" style={{ display: "block" }}><path d="M2 3.75h11M4.5 3.75V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5v1.25M6 6.5v4M9 6.5v4M3.25 3.75l.625 8.75A.625.625 0 0 0 4.5 13h6a.625.625 0 0 0 .625-.5l.625-8.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const IcEdit = () => <svg width="15" height="15" fill="none" style={{ display: "block" }}><path d="M10.5 2a1.414 1.414 0 0 1 2 2L5 11.5 2 12.5l1-3L10.5 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const IcDownload = () => <svg width="15" height="15" fill="none" style={{ display: "block" }}><path d="M7.5 2v7.5M5 7l2.5 2.5L10 7M2 11v1.5a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const IcArrow = () => <svg width="15" height="15" fill="none" style={{ display: "block" }}><path d="M2.5 7.5h10M9 5l3 2.5L9 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;

function Row({ label, dark = false, children }: { label: string; dark?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-uppercase fw-semibold mb-2" style={{ fontSize: "0.65rem", letterSpacing: "0.13em", color: dark ? "#3D4147" : "#94a3b8" }}>
        {label}
      </p>
      <div className="d-flex flex-wrap gap-2 align-items-center">{children}</div>
    </div>
  );
}

function Card({ dark = false, children }: { dark?: boolean; children: React.ReactNode }) {
  return (
    <div
      className="rounded-3 p-4 mb-4"
      style={{
        background: dark ? darkBg : "white",
        border: dark ? "1px solid #26282A" : "1px solid #e2e8f0",
      }}
    >
      {children}
    </div>
  );
}

function ThemeBlock({ dark = false }: { dark?: boolean }) {
  const d = dark;
  const labelColor = dark ? "#475569" : "#94a3b8";
  return (
    <Card dark={d}>
      <p
        className="fw-semibold mb-4 pb-2"
        style={{
          fontSize: "0.75rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: dark ? "#3D4147" : "#cbd5e1",
          borderBottom: `1px solid ${dark ? "#26282A" : "#f1f5f9"}`,
        }}
      >
        {dark ? "Dark theme" : "Light theme"}
      </p>

      <Row label="Primário" dark={d}>
        <Btn dark={d} variant="primary">Salvar alterações</Btn>
        <Btn dark={d} variant="primary" iconLeft={<IcPlus />}>Adicionar</Btn>
        <Btn dark={d} variant="primary" iconRight={<IcArrow />}>Continuar</Btn>
      </Row>

      <Row label="Secundário — tinted" dark={d}>
        <Btn dark={d} variant="secondary">Cancelar</Btn>
        <Btn dark={d} variant="secondary" iconLeft={<IcEdit />}>Editar</Btn>
        <Btn dark={d} variant="secondary" iconRight={<IcDownload />}>Exportar</Btn>
      </Row>

      <Row label="Outlined — terciário" dark={d}>
        <Btn dark={d} variant="outlined">Ver detalhes</Btn>
        <Btn dark={d} variant="outlined" iconLeft={<IcPlus />}>Novo projeto</Btn>
      </Row>

      <Row label="Ghost" dark={d}>
        <Btn dark={d} variant="ghost">Ignorar</Btn>
        <Btn dark={d} variant="ghost" iconLeft={<IcEdit />}>Renomear</Btn>
      </Row>

      <Row label="Danger" dark={d}>
        <Btn dark={d} variant="danger" iconLeft={<IcTrash />}>Excluir usuário</Btn>
        <Btn dark={d} variant="danger">Remover conta</Btn>
      </Row>

      <Row label="Tamanhos" dark={d}>
        <Btn dark={d} variant="primary" size="sm">Pequeno</Btn>
        <Btn dark={d} variant="primary" size="md">Médio</Btn>
        <Btn dark={d} variant="primary" size="lg">Grande</Btn>
      </Row>

      <Row label="Desabilitado" dark={d}>
        <Btn dark={d} variant="primary" disabled>Primário</Btn>
        <Btn dark={d} variant="secondary" disabled>Secundário</Btn>
        <Btn dark={d} variant="outlined" disabled>Outlined</Btn>
        <Btn dark={d} variant="ghost" disabled>Ghost</Btn>
        <Btn dark={d} variant="danger" disabled>Danger</Btn>
      </Row>

      <div>
        <p className="text-uppercase fw-semibold mb-2" style={{ fontSize: "0.65rem", letterSpacing: "0.13em", color: labelColor }}>Largura total</p>
        <Btn dark={d} variant="primary" fullWidth iconLeft={<IcPlus />}>Criar novo usuário</Btn>
        <div style={{ marginTop: 8 }}>
          <Btn dark={d} variant="secondary" fullWidth>Cancelar</Btn>
        </div>
      </div>
    </Card>
  );
}

export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter', sans-serif" }} className="py-5 px-3">
      <div className="container" style={{ maxWidth: 760 }}>

        <div className="mb-5">
          <p className="text-uppercase fw-semibold mb-1" style={{ fontSize: "0.65rem", letterSpacing: "0.13em", color: primary }}>
            Design System
          </p>
          <h1 className="fw-bold mb-1" style={{ fontSize: "1.75rem", color: "#0f172a" }}>Button Components</h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
            Variações primário, secundário (tinted), outlined e ghost — com temas light e dark.
          </p>
        </div>

        <ThemeBlock dark={false} />
        <ThemeBlock dark={true} />

      </div>
    </div>
  );
}
