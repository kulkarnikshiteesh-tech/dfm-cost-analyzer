import { Zap, Wrench, Package, ArrowRight } from "lucide-react";
import CostInfoModal from "./CostInfoModal";

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
}

const CostBar = ({
  volumeCubicMm, boundingBox, material = "ABS", quantity = 1000,
  hasUndercuts, undercutSeverity, onMaterialChange, onQuantityChange,
  onOpenReport, recommendedMaterial,
}: CostBarProps) => {
  const hasData = !!volumeCubicMm && !!boundingBox;
  const stepIndex = QTY_STEPS.reduce((best, val, i) => Math.abs(val - quantity) < Math.abs(QTY_STEPS[best] - quantity) ? i : best, 0);
  const severity = hasUndercuts ? (undercutSeverity ?? "low") : "low";
  const mold = hasData ? calcMoldCost(volumeCubicMm!, boundingBox!, quantity, severity) : null;
  const perPiece = hasData ? calcPerPiece(volumeCubicMm!, material, quantity) : null;
  const totalPerUnit = mold && perPiece ? Math.round((mold.total + perPiece * quantity) / quantity) : null;
  const machine = hasData ? getMachineSpec(volumeCubicMm!, boundingBox!) : null;

  if (!hasData) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 text-center">
        <div className="w-full rounded-2xl border border-[#e0deda] bg-[#f8f7f4] px-5 py-8 space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2fc]">
            <span className="text-lg text-[#3b6bca]">₹</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#b0ada8]">Costing</p>
          <p className="text-[11px] text-[#9a9a9e] leading-relaxed">Upload a model and confirm a top / bottom face to see cost estimates</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      {/* Blue accent bar */}
      <div style={{ height: 3, background: "#3B6BCA", flexShrink: 0 }} />

      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Panel label */}
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Costing</p>
          <CostInfoModal />
        </div>

        {/* ── Dark hero card ── */}
        <div className="rounded-2xl px-4 py-4 relative overflow-hidden" style={{ background: "#1A1A1C" }}>
          <div className="absolute right-[-24px] bottom-[-24px] w-28 h-28 rounded-full" style={{ background: "rgba(91,142,230,0.12)" }} />
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#555", letterSpacing: "0.14em" }}>Total per unit</p>
          <p className="font-black tabular-nums leading-none mb-1" style={{ fontSize: 34, color: "#fff", letterSpacing: "-0.02em" }}>
            ₹{totalPerUnit!.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] mb-4" style={{ color: "#555" }}>
            Incl. mold amortised over {quantity.toLocaleString("en-IN")} units
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.06)" }}>
              <p className="text-[8px] uppercase tracking-widest mb-1" style={{ color: "#555" }}>Mold cost</p>
              <p className="text-sm font-black tabular-nums" style={{ color: "#fff" }}>₹{mold!.total.toLocaleString("en-IN")}</p>
              <p className="text-[9px] mt-0.5" style={{ color: "#444" }}>{mold!.label}</p>
              {mold!.surcharge > 0 && (
                <div className="inline-flex items-center mt-1.5 rounded px-1.5 py-0.5" style={{ background: "rgba(224,160,32,0.18)" }}>
                  <span className="text-[9px] font-bold" style={{ color: "#E0A020" }}>⚠ +{Math.round(mold!.surchargeRate * 100)}% tooling</span>
                </div>
              )}
            </div>
            <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.06)" }}>
              <p className="text-[8px] uppercase tracking-widest mb-1" style={{ color: "#555" }}>Per piece</p>
              <p className="text-sm font-black tabular-nums" style={{ color: "#fff" }}>₹{perPiece!.toLocaleString("en-IN")}</p>
              <p className="text-[9px] mt-0.5" style={{ color: "#444" }}>Excl. mold</p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#e0deda]" />

        {/* Material selector */}
        <div className="space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Material</p>
          <select
            value={material}
            onChange={(e) => onMaterialChange?.(e.target.value)}
            className="w-full rounded-xl border border-[#e0deda] bg-[#f5f4f0] px-3 py-2.5 text-xs font-semibold text-[#1a1a1c] focus:outline-none focus:border-[#3b6bca] transition-colors"
          >
            {Object.entries(MATERIALS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          {recommendedMaterial && material !== recommendedMaterial && (
            <div className="rounded-xl border border-[#fcd34d] bg-[#fffbf0] px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#c08010] mb-1">⚠ Not recommended</p>
              <p className="text-[10px] text-[#6a6a6e] leading-relaxed">
                Wizard recommended <span className="font-semibold text-[#3b6bca]">{MATERIALS[recommendedMaterial as keyof typeof MATERIALS]?.label}</span> for your part.
              </p>
            </div>
          )}
        </div>

        {/* Quantity slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Quantity</p>
            <p className="text-base font-black tabular-nums text-[#1a1a1c]">
              {quantity.toLocaleString("en-IN")} <span className="text-[9px] font-normal text-[#b0ada8]">units</span>
            </p>
          </div>
          <input
            type="range" min={0} max={QTY_STEPS.length - 1} step={1} value={stepIndex}
            onChange={handleSlider}
            className="w-full cursor-pointer appearance-none rounded-full accent-[#3b6bca]"
            style={{ height: 4, background: "#e0deda" }}
          />
          <div className="flex justify-between text-[8px] text-[#b0ada8]">
            {QTY_STEPS.map((q) => (
              <span key={q} className={quantity === q ? "text-[#3b6bca] font-bold" : ""}>
                {q >= 1000 ? `${q / 1000}k` : q}
              </span>
            ))}
          </div>
        </div>

        <div className="border-t border-[#e0deda]" />

        {/* Report button */}
        {onOpenReport && (
          <button onClick={onOpenReport} className="w-full rounded-xl border border-[#3b6bca] bg-[#eef2fc] px-4 py-3 text-left transition-all hover:bg-[#dce8fa] group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#3b6bca]">Read full cost report</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#9a9aff" }}>Mold · per piece · material · all tiers</p>
              </div>
              <ArrowRight className="h-4 w-4 text-[#3b6bca] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        )}

        <div className="border-t border-[#e0deda]" />

        {/* Mold rec */}
        <div className="rounded-xl border border-[#e0deda] bg-[#f8f7f4] px-3 py-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e] mb-2">Recommended Mold</p>
          <div className="flex items-start gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#eef2fc]">
              <Package className="h-3.5 w-3.5 text-[#3b6bca]" />
            </div>
            <span className="text-[11px] text-[#4a4a4e] leading-relaxed">{getMoldRec(quantity)}</span>
          </div>
        </div>

        {/* Machine spec — 3 chips */}
        {machine && (
          <div className="rounded-xl border border-[#e0deda] bg-[#f8f7f4] px-3 py-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e] mb-2">Machine Spec</p>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: "Tonnage", value: `${machine.tonnage}T` },
                { label: "Shot size", value: `${machine.shotSize} cm³` },
                { label: "Screw ⌀", value: machine.screwDia },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-[#f0ede8] px-2 py-2 text-center">
                  <p className="text-xs font-black font-mono text-[#1a1a1c]">{value}</p>
                  <p className="text-[8px] text-[#9a9a9e] mt-0.5">{label}</p>
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
