import CostInfoModal from "./CostInfoModal";
import ReportModal from "./ReportModal";

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
}

const CostBar = ({
  volumeCubicMm,
  boundingBox,
  material = "ABS",
  quantity = 1000,
  hasUndercuts,
  undercutSeverity,
  undercutMessage,
  onMaterialChange,
  onQuantityChange,
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

  if (!hasData) {
    return (
      <div className="flex items-center justify-center px-6 py-4">
        <p className="text-[11px] uppercase tracking-widest text-[#b0ada8]">
          Upload a model to see cost estimates
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 py-3 space-y-2">

      {/* Cost figures + material selector */}
      <div className="flex items-center gap-5">

        {/* Mold cost */}
        <div className="min-w-[150px]">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Mold Cost</p>
          <p className="text-xl font-black tabular-nums text-[#1a1a1c]">
            ₹{mold!.total.toLocaleString("en-IN")}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[9px] text-[#b0ada8]">{mold!.label}</p>
            {mold!.surcharge > 0 && (
              <span className="text-[9px] font-bold text-[#c08010]" title={`+${Math.round(mold!.surchargeRate * 100)}% undercut surcharge (approx.) — side-action sliders required. Actual surcharge varies.`}>
                ⚠ +{Math.round(mold!.surchargeRate * 100)}% undercut
              </span>
            )}
          </div>
        </div>

        <div className="h-10 w-px bg-[#e0deda]" />

        {/* Per piece */}
        <div className="min-w-[110px]">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Per Piece</p>
          <p className="text-xl font-black tabular-nums text-[#1a1a1c]">
            ₹{perPiece!.toLocaleString("en-IN")}
          </p>
          <p className="text-[9px] text-[#b0ada8]">Excl. mold</p>
        </div>

        <div className="h-10 w-px bg-[#e0deda]" />

        {/* Total per unit */}
        <div className="min-w-[120px]">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Total per Unit</p>
          <p className="text-xl font-black tabular-nums text-[#3b6bca]">
            ₹{totalPerUnit!.toLocaleString("en-IN")}
          </p>
          <p className="text-[9px] text-[#b0ada8]">Incl. mold amort.</p>
        </div>

        <div className="h-10 w-px bg-[#e0deda]" />

        {/* Material selector */}
        <div className="space-y-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Material</p>
          <select
            value={material}
            onChange={(e) => onMaterialChange?.(e.target.value)}
            className="rounded-md border border-[#e0deda] bg-[#f5f4f0] px-2 py-1 text-xs font-semibold text-[#1a1a1c] focus:outline-none focus:border-[#3b6bca]"
          >
            {Object.entries(MATERIALS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="ml-auto flex items-center gap-2">
          <ReportModal
            volumeCubicMm={volumeCubicMm!}
            boundingBox={boundingBox!}
            material={material}
            quantity={quantity}
            hasUndercuts={hasUndercuts}
            undercutSeverity={undercutSeverity}
            undercutMessage={undercutMessage}
          />
          <CostInfoModal />
        </div>
      </div>

      {/* Slider row */}
      <div className="flex items-center gap-4">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e] w-16 shrink-0">Quantity</span>
        <input
          type="range"
          min={0}
          max={QTY_STEPS.length - 1}
          step={1}
          value={stepIndex}
          onChange={handleSlider}
          className="flex-1 h-1.5 cursor-pointer appearance-none rounded-full accent-[#3b6bca]"
          style={{ background: "#e0deda" }}
        />
        <span className="text-sm font-black tabular-nums text-[#1a1a1c] w-16 text-right shrink-0">
          {quantity.toLocaleString("en-IN")}
        </span>
        <span className="text-[9px] text-[#b0ada8]">units</span>
      </div>

      {/* Quantity scale labels */}
      <div className="flex justify-between px-16 text-[8px] text-[#b0ada8]">
        {QTY_STEPS.map((q) => (
          <span key={q} className={quantity === q ? "text-[#3b6bca] font-bold" : ""}>
            {q >= 1000 ? `${q / 1000}k` : q}
          </span>
        ))}
      </div>

    </div>
  );
};

export default CostBar;
