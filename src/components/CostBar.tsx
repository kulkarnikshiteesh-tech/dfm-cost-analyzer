import { useState } from "react";
import { Wrench, Package, ArrowRight } from "lucide-react";
import CostInfoModal from "./CostInfoModal";
import { ALL_FINISHES } from "./DFMFeedback";

const MATERIALS: Record<string, { density: number; pricePerKg: number; label: string }> = {
  ABS:   { density: 1.05, pricePerKg: 120, label: "ABS" },
  PP:    { density: 0.91, pricePerKg: 90,  label: "PP" },
  Nylon: { density: 1.14, pricePerKg: 120, label: "Nylon PA6" },
  PC:    { density: 1.20, pricePerKg: 170, label: "Polycarbonate" },
  HIPS:  { density: 1.05, pricePerKg: 110, label: "HIPS" },
  TPU:   { density: 1.20, pricePerKg: 200, label: "TPU" },
  TPE:   { density: 0.90, pricePerKg: 180, label: "TPE" },
};

const MOLD_TIERS = [
  { maxQty: 500,      steelPricePerKg: 80,  weightFactor: 0.0027,  machiningHrs: 25,  rate: 400, label: "Aluminium (Soft)" },
  { maxQty: 2000,     steelPricePerKg: 100, weightFactor: 0.0065,  machiningHrs: 30,  rate: 400, label: "Zinc Alloy" },
  { maxQty: 5000,     steelPricePerKg: 80,  weightFactor: 0.00785, machiningHrs: 50,  rate: 400, label: "Mild Steel" },
  { maxQty: 50000,    steelPricePerKg: 150, weightFactor: 0.00785, machiningHrs: 80,  rate: 400, label: "P20 Steel" },
  { maxQty: Infinity, steelPricePerKg: 220, weightFactor: 0.00785, machiningHrs: 120, rate: 400, label: "H13 Steel" },
];

const MACHINE_RATE = 400;
const OPERATOR_RATE = 115;
const OVERHEAD = 1.25;
const SCRAP = 1.05;
const MARGIN = 1.15;
const DESIGN_COST = 10000;
const UNDERCUT_SURCHARGE: Record<string, number> = { high: 0.35, moderate: 0.15, low: 0 };
const QTY_STEPS = [100, 250, 500, 1000, 2000, 5000, 10000, 25000, 50000];

function getMoldTier(qty: number) { return MOLD_TIERS.find((t) => qty <= t.maxQty)!; }

function calcMoldCost(vol: number, bb: { x: number; y: number; z: number }, qty: number, undercutSeverity?: string | null) {
  const tier = getMoldTier(qty);
  const { x, y, z } = bb;
  const pad = Math.min(25, Math.max(15, Math.max(x, y, z) * 0.12));
  const moldVolCm3 = ((x + pad * 2) * (y + pad * 2) * (z + pad * 2)) / 1000;
  const baseMold = Math.round((moldVolCm3 * tier.weightFactor * tier.steelPricePerKg + tier.machiningHrs * tier.rate + DESIGN_COST) * OVERHEAD);
  const surchargeRate = UNDERCUT_SURCHARGE[undercutSeverity ?? "low"] ?? 0;
  const surchargeCost = Math.round(baseMold * surchargeRate);
  return { base: baseMold, surcharge: surchargeCost, total: baseMold + surchargeCost, surchargeRate, label: tier.label };
}

function calcPerPiece(vol: number, matKey: string, qty: number) {
  const mat = MATERIALS[matKey] ?? MATERIALS["ABS"];
  const volCm3 = vol / 1000;
  const weightKg = (volCm3 * mat.density) / 1000;
  const matCost = weightKg * mat.pricePerKg * SCRAP * (1 - Math.min(0.15, qty / 100000));
  const cycleHr = (30 * Math.max(0.75, 1 - Math.log10(Math.max(1, qty)) * 0.05)) / 3600;
  return Math.round((matCost + cycleHr * MACHINE_RATE + cycleHr * OPERATOR_RATE) * OVERHEAD * MARGIN * 100) / 100;
}

function getMoldRec(qty: number) {
  if (qty <= 500) return "Aluminium soft mold — suitable for <500 shots";
  if (qty <= 5000) return "Mild steel semi-soft mold — up to 5,000 shots";
  return "H13 hard steel mold — high volume production";
}

function getMachineSpec(vol: number, bb: { x: number; y: number; z: number }) {
  const projected = bb.x > 0 && bb.y > 0 ? (bb.x * bb.y) / 100 : Math.pow(vol, 2 / 3) / 10;
  const tonnage = Math.min(500, Math.max(50, Math.ceil((projected * 0.5) / 10) * 10));
  return { tonnage, shotSize: (vol / 1000 * 1.15).toFixed(1), screwDia: tonnage <= 150 ? "30–45mm" : "50–70mm" };
}

interface CostBarProps {
  volumeCubicMm?: number | null;
  boundingBox?: { x: number; y: number; z: number } | null;
  material?: string;
  quantity?: number;
  hasUndercuts?: boolean | null;
  undercutSeverity?: string | null;
  undercutMessage?: string | null;
  onMaterialChange?: (m: string) => void;
  onQuantityChange?: (q: number) => void;
  onOpenReport?: () => void;
  recommendedMaterial?: string | null;
  darkMode?: boolean;
  selectedFinishes?: string[];
}

const CostBar = ({
  volumeCubicMm, boundingBox, material = "ABS", quantity = 1000,
  hasUndercuts, undercutSeverity, onMaterialChange, onQuantityChange,
  onOpenReport, recommendedMaterial, darkMode: dm = false,
  selectedFinishes = [],
}: CostBarProps) => {
  const hasData = !!volumeCubicMm && !!boundingBox;
  const stepIndex = QTY_STEPS.reduce((best, val, i) => Math.abs(val - quantity) < Math.abs(QTY_STEPS[best] - quantity) ? i : best, 0);
  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => { onQuantityChange?.(QTY_STEPS[parseInt(e.target.value)]); };
  const severity = hasUndercuts ? (undercutSeverity ?? "low") : "low";
  const mold = hasData ? calcMoldCost(volumeCubicMm!, boundingBox!, quantity, severity) : null;
  const perPiece = hasData ? calcPerPiece(volumeCubicMm!, material, quantity) : null;
  const machine = hasData ? getMachineSpec(volumeCubicMm!, boundingBox!) : null;

  // ── Finish cost calculation ──
  const selectedFinishData = ALL_FINISHES.filter(f => selectedFinishes.includes(f.id));
  const inMoldFinishCost = selectedFinishData
    .filter(f => f.category === "in-mold")
    .reduce((sum, f) => sum + f.costMidpoint, 0);
  const postMoldPerPieceCost = selectedFinishData
    .filter(f => f.category === "post-mold")
    .reduce((sum, f) => sum + f.costMidpoint, 0);

  const totalMoldWithFinish = mold ? mold.total + inMoldFinishCost : null;
  const totalPerPieceWithFinish = perPiece ? perPiece + postMoldPerPieceCost : null;
  const totalPerUnit = totalMoldWithFinish && totalPerPieceWithFinish
    ? Math.round((totalMoldWithFinish + totalPerPieceWithFinish * quantity) / quantity)
    : null;

  const hasFinishCost = inMoldFinishCost > 0 || postMoldPerPieceCost > 0;

  // Theme tokens
  const panelBg  = dm ? "#18181B" : "#FFFFFF";
  const cardBg   = dm ? "#222226" : "#F8F7F4";
  const border   = dm ? "#2A2A2E" : "#E0DEDA";
  const ink      = dm ? "#F0EFE8" : "#1A1A1C";
  const muted    = dm ? "#999"    : "#9A9A9E";
  const faint    = dm ? "#555"    : "#B0ADA8";
  const selectBg = dm ? "#28282C" : "#F5F4F0";

  if (!hasData) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 text-center" style={{ background: panelBg }}>
        <div className="w-full rounded-2xl px-5 py-8 space-y-3" style={{ border: `1px solid ${border}`, background: cardBg }}>
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: dm ? "#1E2A3D" : "#EEF2FC" }}>
            <span className="text-lg" style={{ color: "#3B6BCA" }}>₹</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: faint }}>Costing</p>
          <p className="text-[11px] leading-relaxed" style={{ color: muted }}>Upload a model and confirm a top / bottom face to see cost estimates</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: panelBg, scrollbarWidth: "none" }}>
      <div style={{ height: 3, background: "#3B6BCA", flexShrink: 0 }} />

      <div className="flex flex-col gap-2 px-4 py-2">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: muted }}>Costing</p>
          <CostInfoModal />
        </div>

        {/* ── Hero card ── */}
        <div className="rounded-2xl px-4 py-2.5 relative overflow-hidden" style={{ background: "#111114" }}>
          <div className="absolute right-[-24px] bottom-[-24px] w-24 h-24 rounded-full" style={{ background: "rgba(91,142,230,0.15)" }} />
          <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#AAA", letterSpacing: "0.14em" }}>Total per unit</p>
          <p className="font-black tabular-nums leading-none mb-0.5" style={{ fontSize: 22, color: "#FFFFFF", letterSpacing: "-0.02em" }}>
            ₹{totalPerUnit!.toLocaleString("en-IN")}
          </p>
          <p className="text-[9px] mb-2" style={{ color: "#AAA" }}>
            Mold amortised · {quantity.toLocaleString("en-IN")} units
            {hasFinishCost && <span style={{ color: "#9A9AFF" }}> · incl. finishing</span>}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-lg px-3 py-1.5" style={{ background: "#2A2A30" }}>
              <p className="text-[8px] uppercase tracking-widest mb-0.5" style={{ color: "#AAA" }}>Mold cost</p>
              <p className="text-[13px] font-black tabular-nums" style={{ color: "#FFF" }}>₹{totalMoldWithFinish!.toLocaleString("en-IN")}</p>
              <p className="text-[8px] mt-0.5" style={{ color: "#888" }}>{mold!.label}</p>
              {mold!.surcharge > 0 && (
                <div className="inline-flex items-center mt-1 rounded px-1.5 py-0.5" style={{ background: "rgba(224,160,32,0.2)" }}>
                  <span className="text-[8px] font-bold" style={{ color: "#E0A020" }}>⚠ +{Math.round(mold!.surchargeRate * 100)}% tooling</span>
                </div>
              )}
              {inMoldFinishCost > 0 && (
                <div className="inline-flex items-center mt-1 rounded px-1.5 py-0.5 ml-1" style={{ background: "rgba(154,154,255,0.2)" }}>
                  <span className="text-[8px] font-bold" style={{ color: "#9A9AFF" }}>+₹{inMoldFinishCost.toLocaleString("en-IN")} finish</span>
                </div>
              )}
            </div>
            <div className="rounded-lg px-3 py-1.5" style={{ background: "#2A2A30" }}>
              <p className="text-[8px] uppercase tracking-widest mb-0.5" style={{ color: "#AAA" }}>Per piece</p>
              <p className="text-[13px] font-black tabular-nums" style={{ color: "#FFF" }}>₹{totalPerPieceWithFinish!.toLocaleString("en-IN")}</p>
              <p className="text-[8px] mt-0.5" style={{ color: "#888" }}>Excl. mold</p>
              {postMoldPerPieceCost > 0 && (
                <div className="inline-flex items-center mt-1 rounded px-1.5 py-0.5" style={{ background: "rgba(154,154,255,0.2)" }}>
                  <span className="text-[8px] font-bold" style={{ color: "#9A9AFF" }}>+₹{postMoldPerPieceCost} finish</span>
                </div>
              )}
            </div>
          </div>

          {/* Selected finishes summary */}
          {selectedFinishData.length > 0 && (
            <div className="mt-2 rounded-lg px-3 py-1.5" style={{ background: "rgba(154,154,255,0.1)", border: "1px solid rgba(154,154,255,0.2)" }}>
              <p className="text-[8px] font-bold uppercase tracking-widest mb-1" style={{ color: "#9A9AFF" }}>Selected finishes</p>
              {selectedFinishData.map(f => (
                <p key={f.id} className="text-[9px]" style={{ color: "#CCC" }}>
                  · {f.name} — {f.costLabel}
                </p>
              ))}
              <p className="text-[8px] mt-1 italic" style={{ color: "#777" }}>Midpoint estimate used for calculation</p>
            </div>
          )}
        </div>

        <div style={{ height: 1, background: border }} />

        {/* Material selector */}
        <div className="space-y-1.5">
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: muted }}>Material</p>
          <select
            value={material}
            onChange={(e) => onMaterialChange?.(e.target.value)}
            className="w-full rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#3b6bca] transition-colors"
            style={{ border: `1px solid ${border}`, background: selectBg, color: ink }}
          >
            {Object.entries(MATERIALS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          {recommendedMaterial && material !== recommendedMaterial && (
            <div className="rounded-xl px-3 py-2" style={{ border: "1px solid #C08010", background: dm ? "#2A2200" : "#FFFBF0" }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#C08010" }}>⚠ Not recommended</p>
              <p className="text-[10px] leading-snug" style={{ color: dm ? "#BBA060" : "#6A6A6E" }}>
                Wizard recommended <span className="font-semibold" style={{ color: "#3B6BCA" }}>{MATERIALS[recommendedMaterial as keyof typeof MATERIALS]?.label}</span> for your part.
              </p>
            </div>
          )}
        </div>

        {/* Quantity slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: muted }}>Quantity</p>
            <p className="text-sm font-black tabular-nums" style={{ color: ink }}>
              {quantity.toLocaleString("en-IN")} <span className="text-[9px] font-normal" style={{ color: faint }}>units</span>
            </p>
          </div>
          <input
            type="range" min={0} max={QTY_STEPS.length - 1} step={1} value={stepIndex}
            onChange={handleSlider}
            className="w-full cursor-pointer appearance-none rounded-full accent-[#3b6bca]"
            style={{ height: 4, background: border }}
          />
          <div className="flex justify-between text-[8px]" style={{ color: faint }}>
            {QTY_STEPS.map((q) => (
              <span key={q} style={quantity === q ? { color: "#3B6BCA", fontWeight: 700 } : {}}>
                {q >= 1000 ? `${q / 1000}k` : q}
              </span>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: border }} />

        {/* Report button */}
        {onOpenReport && (
          <button onClick={onOpenReport}
            className="w-full rounded-xl px-4 py-2 text-left transition-all group"
            style={{ border: "1px solid #3B6BCA", background: dm ? "#1A2540" : "#EEF2FC" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold" style={{ color: "#3B6BCA" }}>Read full cost report</p>
                <p className="text-[9px] mt-0.5" style={{ color: "#9A9AFF" }}>Mold · per piece · material · all tiers</p>
              </div>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" style={{ color: "#3B6BCA" }} />
            </div>
          </button>
        )}

        <div style={{ height: 1, background: border }} />

        {/* Mold recommendation */}
        <div className="rounded-xl px-3 py-2" style={{ border: `1px solid ${border}`, background: cardBg }}>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ background: dm ? "#1E2A3D" : "#EEF2FC" }}>
              <Package className="h-3 w-3" style={{ color: "#3B6BCA" }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: muted }}>Mold Recommendation</p>
              <span className="text-[10px] leading-snug" style={{ color: dm ? "#C0BEBC" : "#4A4A4E" }}>{getMoldRec(quantity)}</span>
            </div>
          </div>
        </div>

        {/* Machine spec */}
        {machine && (
          <div className="rounded-xl px-3 py-2 space-y-1.5" style={{ border: `1px solid ${border}`, background: cardBg }}>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ background: dm ? "#1E2A3D" : "#EEF2FC" }}>
                <Wrench className="h-3 w-3" style={{ color: "#3B6BCA" }} />
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: muted }}>Machine Spec</p>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {[
                { label: "Tonnage",  value: `${machine.tonnage}T` },
                { label: "Shot",     value: `${machine.shotSize} cm³` },
                { label: "Screw ⌀", value: machine.screwDia },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg px-2 py-1 text-center" style={{ background: dm ? "#28282C" : "#F0EDE8" }}>
                  <p className="text-[11px] font-black font-mono" style={{ color: ink }}>{value}</p>
                  <p className="text-[8px]" style={{ color: muted }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CostBar;
