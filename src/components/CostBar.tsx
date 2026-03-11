import { Zap, Wrench, Package } from "lucide-react";
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

const UNDERCUT_SURCHARGE: Record<string, number> = {
  high: 0.35,
  moderate: 0.15,
  low: 0,
};

const QTY_STEPS = [100, 250, 500, 1000, 2000, 5000, 10000, 25000, 50000];

function getMoldTier(qty: number) {
  return MOLD_TIERS.find((t) => qty <= t.maxQty)!;
}

function calcMoldCost(
  vol: number,
  bb: { x: number; y: number; z: number },
  qty: number,
  undercutSeverity?: string | null
) {
  const tier = getMoldTier(qty);
  const { x, y, z } = bb;
  const pad = Math.min(25, Math.max(15, Math.max(x, y, z) * 0.12));
  const moldVolCm3 = ((x + pad * 2) * (y + pad * 2) * (z + pad * 2)) / 1000;
  const steelCost = moldVolCm3 * tier.weightFactor * tier.steelPricePerKg;
  const machCost = tier.machiningHrs * tier.rate;
  const baseMold = Math.round((steelCost + machCost + DESIGN_COST) * OVERHEAD);
  const severity = undercutSeverity ?? "low";
  const surchargeRate = UNDERCUT_SURCHARGE[severity] ?? 0;
  const surchargeCost = Math.round(baseMold * surchargeRate);
  return {
    base: baseMold,
    surcharge: surchargeCost,
    total: baseMold + surchargeCost,
    surchargeRate,
    label: tier.label,
  };
}

function calcPerPiece(vol: number, matKey: string, qty: number) {
  const mat = MATERIALS[matKey] ?? MATERIALS["ABS"];
  const volCm3 = vol / 1000;
  const weightKg = (volCm3 * mat.density) / 1000;
  const discount = Math.min(0.15, qty / 100000);
  const matCost = weightKg * mat.pricePerKg * SCRAP * (1 - discount);
  const efficiency = Math.max(0.75, 1 - Math.log10(Math.max(1, qty)) * 0.05);
  const cycleHr = (30 * efficiency) / 3600;
  const piece = (matCost + cycleHr * MACHINE_RATE + cycleHr * OPERATOR_RATE) * OVERHEAD * MARGIN;
  return Math.round(piece * 100) / 100;
}

function getMoldRec(qty: number) {
  if (qty <= 500) return `Aluminium soft mold — suitable for <500 shots`;
  if (qty <= 5000) return `Mild steel semi-soft mold — up to 5,000 shots`;
  return `H13 hard steel mold — high volume production`;
}

function getMachineSpec(vol: number, bb: { x: number; y: number; z: number }) {
  const { x, y } = bb;
  const projected = x > 0 && y > 0 ? (x * y) / 100 : Math.pow(vol, 2 / 3) / 10;
  let tonnage = Math.max(50, Math.ceil((projected * 0.5) / 10) * 10);
  if (tonnage > 500) tonnage = 500;
  const volCm3 = vol / 1000;
  return {
    tonnage,
    shotSize: `${(volCm3 * 1.15).toFixed(1)} cm³`,
    screwDia: tonnage <= 150 ? "30–45mm" : "50–70mm",
  };
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
}

const CostBar = ({
  volumeCubicMm,
  boundingBox,
  material = "ABS",
  quantity = 1000,
  hasUndercuts,
  undercutSeverity,
  onMaterialChange,
  onQuantityChange,
  onOpenReport,
}: CostBarProps) => {
  const hasData = !!volumeCubicMm && !!boundingBox;

  const stepIndex = QTY_STEPS.reduce(
    (best, val, i) => (Math.abs(val - quantity) < Math.abs(QTY_STEPS[best] - quantity) ? i : best),
    0
  );

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    onQuantityChange?.(QTY_STEPS[parseInt(e.target.value)]);
  };

  const severity = hasUndercuts ? (undercutSeverity ?? "low") : "low";
  const mold = hasData ? calcMoldCost(volumeCubicMm!, boundingBox!, quantity, severity) : null;
  const perPiece = hasData ? calcPerPiece(volumeCubicMm!, material, quantity) : null;
  const totalPerUnit = mold && perPiece
    ? Math.round((mold.total + perPiece * quantity) / quantity)
    : null;
  const moldRec = hasData ? getMoldRec(quantity) : null;
  const machine = hasData ? getMachineSpec(volumeCubicMm!, boundingBox!) : null;

  if (!hasData) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
        <div className="rounded-xl border border-[#e0deda] bg-[#f8f7f4] px-5 py-6 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#b0ada8]">Costing</p>
          <p className="text-[11px] text-[#9a9a9e] leading-relaxed">
            Upload a model and confirm a top / bottom face to see cost estimates
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-4 space-y-4" style={{ scrollbarWidth: "none" }}>

      {/* Panel header */}
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Costing</p>
        <div className="flex items-center gap-1.5">
          <CostInfoModal />
        </div>
      </div>

      {/* ── 3 cost figures ── */}
      <div className="space-y-3">

        {/* Total per unit — hero number */}
        <div className="rounded-xl border border-[#c8ddf8] bg-[#eef2fc] px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#6a9fd8]">Total per Unit</p>
          <p className="text-2xl font-black tabular-nums text-[#3b6bca] mt-0.5">
            ₹{totalPerUnit!.toLocaleString("en-IN")}
          </p>
          <p className="text-[9px] text-[#6a9fd8] mt-0.5">Incl. mold amortised over {quantity.toLocaleString("en-IN")} units</p>
        </div>

        {/* Mold + Per piece side by side */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-[#e0deda] bg-[#f8f7f4] px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Mold Cost</p>
            <p className="text-base font-black tabular-nums text-[#1a1a1c] mt-0.5">
              ₹{mold!.total.toLocaleString("en-IN")}
            </p>
            <p className="text-[9px] text-[#b0ada8] mt-0.5">{mold!.label}</p>
            {mold!.surcharge > 0 && (
              <p className="text-[9px] font-bold text-[#c08010] mt-0.5">
                ⚠ +{Math.round(mold!.surchargeRate * 100)}% undercut
              </p>
            )}
          </div>
          <div className="rounded-lg border border-[#e0deda] bg-[#f8f7f4] px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Per Piece</p>
            <p className="text-base font-black tabular-nums text-[#1a1a1c] mt-0.5">
              ₹{perPiece!.toLocaleString("en-IN")}
            </p>
            <p className="text-[9px] text-[#b0ada8] mt-0.5">Excl. mold</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#e0deda]" />

      {/* Material selector */}
      <div className="space-y-1.5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Material</p>
        <select
          value={material}
          onChange={(e) => onMaterialChange?.(e.target.value)}
          className="w-full rounded-lg border border-[#e0deda] bg-[#f5f4f0] px-3 py-2 text-xs font-semibold text-[#1a1a1c] focus:outline-none focus:border-[#3b6bca]"
        >
          {Object.entries(MATERIALS).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      {/* Quantity slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Quantity</p>
          <p className="text-sm font-black tabular-nums text-[#1a1a1c]">{quantity.toLocaleString("en-IN")} <span className="text-[9px] font-normal text-[#b0ada8]">units</span></p>
        </div>
        <input
          type="range"
          min={0}
          max={QTY_STEPS.length - 1}
          step={1}
          value={stepIndex}
          onChange={handleSlider}
          className="w-full h-1.5 cursor-pointer appearance-none rounded-full accent-[#3b6bca]"
          style={{ background: "#e0deda" }}
        />
        <div className="flex justify-between text-[8px] text-[#b0ada8]">
          {QTY_STEPS.map((q) => (
            <span key={q} className={quantity === q ? "text-[#3b6bca] font-bold" : ""}>
              {q >= 1000 ? `${q / 1000}k` : q}
            </span>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#e0deda]" />

      {/* Full report button */}
      {onOpenReport && (
        <button
          onClick={onOpenReport}
          className="w-full rounded-lg border border-[#3b6bca] bg-white px-4 py-3 text-left transition-all hover:bg-[#eef2fc] group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#3b6bca]">Read full cost report</p>
              <p className="text-[10px] text-[#9a9a9e] mt-0.5">Mold · per piece · material · all tiers</p>
            </div>
            <span className="text-[#3b6bca] text-base group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </button>
      )}

      {/* Divider */}
      <div className="border-t border-[#e0deda]" />

      {/* Recommended mold */}
      {moldRec && (
        <div className="rounded-lg border border-[#e0deda] bg-[#f8f7f4] px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e] mb-1.5">Recommended Mold</p>
          <div className="flex items-start gap-2">
            <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3b6bca]" />
            <span className="text-[11px] text-[#6a6a6e]">{moldRec}</span>
          </div>
        </div>
      )}

      {/* Machine spec */}
      {machine && (
        <div className="rounded-lg border border-[#e0deda] bg-[#f8f7f4] px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e] mb-1.5">Machine Spec</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-[#e0a020]" />
              <span className="text-xs font-bold font-mono text-[#1a1a1c]">{machine.tonnage}T</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wrench className="h-3 w-3 text-[#9a9a9e]" />
              <span className="text-[11px] font-mono text-[#6a6a6e]">{machine.shotSize}</span>
            </div>
            <span className="text-[11px] font-mono text-[#b0ada8]">{machine.screwDia}</span>
          </div>
        </div>
      )}

    </div>
  );
};

export default CostBar;
