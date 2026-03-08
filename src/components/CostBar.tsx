import { useState } from "react";
import CostInfoModal from "./CostInfoModal";

const MATERIALS: Record<string, { density: number; pricePerKg: number; label: string }> = {
  ABS:   { density: 1.05, pricePerKg: 120, label: "ABS" },
  PP:    { density: 0.91, pricePerKg: 90,  label: "PP" },
  Nylon: { density: 1.14, pricePerKg: 120, label: "Nylon PA6" },
  PC:    { density: 1.20, pricePerKg: 170, label: "Polycarbonate" },
  HIPS:  { density: 1.05, pricePerKg: 110, label: "HIPS" },
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

// Quantity steps for the slider (log scale feel)
const QTY_STEPS = [100, 250, 500, 1000, 2000, 5000, 10000, 25000, 50000];

function getMoldTier(qty: number) {
  return MOLD_TIERS.find((t) => qty <= t.maxQty)!;
}

function calcMoldCost(vol: number, bb: { x: number; y: number; z: number }, qty: number) {
  const tier = getMoldTier(qty);
  const { x, y, z } = bb;
  const pad = Math.min(25, Math.max(15, Math.max(x, y, z) * 0.12));
  const moldVolCm3 = ((x + pad * 2) * (y + pad * 2) * (z + pad * 2)) / 1000;
  const steelCost = moldVolCm3 * tier.weightFactor * tier.steelPricePerKg;
  const machCost = tier.machiningHrs * tier.rate;
  const designCost = 10000;
  return {
    total: Math.round((steelCost + machCost + designCost) * OVERHEAD),
    label: tier.label,
  };
}

function calcPerPiece(vol: number, matKey: string, qty: number) {
  const mat = MATERIALS[matKey];
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
  onMaterialChange?: (m: string) => void;
  onQuantityChange?: (q: number) => void;
}

const CostBar = ({
  volumeCubicMm,
  boundingBox,
  material = "ABS",
  quantity = 1000,
  onMaterialChange,
  onQuantityChange,
}: CostBarProps) => {
  const hasData = !!volumeCubicMm && !!boundingBox;

  // Find nearest step index for slider
  const stepIndex = QTY_STEPS.reduce(
    (best, val, i) => (Math.abs(val - quantity) < Math.abs(QTY_STEPS[best] - quantity) ? i : best),
    0
  );

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value);
    onQuantityChange?.(QTY_STEPS[idx]);
  };

  const mold = hasData ? calcMoldCost(volumeCubicMm!, boundingBox!, quantity) : null;
  const perPiece = hasData ? calcPerPiece(volumeCubicMm!, material, quantity) : null;
  const totalPerUnit = mold && perPiece ? Math.round((mold.total + perPiece * quantity) / quantity) : null;

  if (!hasData) {
    return (
      <div className="flex items-center justify-center px-6 py-4">
        <p className="text-[11px] uppercase tracking-widest text-[#3a3a3e]">
          Upload a model to see cost estimates
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 space-y-3">

      {/* Top row: cost figures + material selector */}
      <div className="flex items-center gap-6">

        {/* Mold cost */}
        <div className="min-w-[140px]">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#5a5a5e]">Mold Cost</p>
          <p className="text-xl font-black tabular-nums text-[#e8e6e1]">
            ₹{mold!.total.toLocaleString("en-IN")}
          </p>
          <p className="text-[9px] text-[#4a4a4e]">{mold!.label}</p>
        </div>

        <div className="h-10 w-px bg-[#2a2a2e]" />

        {/* Per piece */}
        <div className="min-w-[120px]">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#5a5a5e]">Per Piece</p>
          <p className="text-xl font-black tabular-nums text-[#e8e6e1]">
            ₹{perPiece!.toLocaleString("en-IN")}
          </p>
          <p className="text-[9px] text-[#4a4a4e]">Excl. mold</p>
        </div>

        <div className="h-10 w-px bg-[#2a2a2e]" />

        {/* Total per unit */}
        <div className="min-w-[130px]">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#5a5a5e]">Total per Unit</p>
          <p className="text-xl font-black tabular-nums text-[#3b6bca]">
            ₹{totalPerUnit!.toLocaleString("en-IN")}
          </p>
          <p className="text-[9px] text-[#4a4a4e]">Incl. mold amort.</p>
        </div>

        <div className="h-10 w-px bg-[#2a2a2e]" />

        {/* Material selector */}
        <div className="space-y-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#5a5a5e]">Material</p>
          <select
            value={material}
            onChange={(e) => onMaterialChange?.(e.target.value)}
            className="rounded-md border border-[#2a2a2e] bg-[#1a1a1c] px-2 py-1 text-xs font-semibold text-[#e8e6e1] focus:outline-none focus:border-[#3b6bca]"
          >
            {Object.entries(MATERIALS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>

        <div className="ml-auto">
          <CostInfoModal />
        </div>
      </div>

      {/* Slider row */}
      <div className="flex items-center gap-4">
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#5a5a5e] w-16 shrink-0">Quantity</span>
        <input
          type="range"
          min={0}
          max={QTY_STEPS.length - 1}
          step={1}
          value={stepIndex}
          onChange={handleSlider}
          className="flex-1 h-1.5 cursor-pointer appearance-none rounded-full bg-[#2a2a2e] accent-[#3b6bca]"
        />
        <span className="text-sm font-black tabular-nums text-[#e8e6e1] w-16 text-right shrink-0">
          {quantity.toLocaleString("en-IN")}
        </span>
        <span className="text-[9px] text-[#4a4a4e]">units</span>
      </div>

      {/* Quantity scale labels */}
      <div className="flex justify-between px-16 text-[8px] text-[#3a3a3e]">
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
