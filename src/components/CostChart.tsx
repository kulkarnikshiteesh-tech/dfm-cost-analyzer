import CostInfoModal from "./CostInfoModal";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const MATERIALS: Record<string, { density: number; pricePerKg: number; label: string }> = {
  ABS:   { density: 1.05, pricePerKg: 120, label: "ABS" },
  PP:    { density: 0.91, pricePerKg: 90,  label: "PP" },
  Nylon: { density: 1.14, pricePerKg: 120, label: "Nylon PA6" },
  PC:    { density: 1.20, pricePerKg: 170, label: "Polycarbonate" },
  HIPS:  { density: 1.05, pricePerKg: 110, label: "HIPS" },
};

const MOLD_TIERS = [
  { maxQty: 500,      pricePerKg: 80,  weightFactor: 0.0027,  machiningHrs: 25,  machiningRate: 400, label: "Aluminium (Soft)" },
  { maxQty: 2000,     pricePerKg: 100, weightFactor: 0.0065,  machiningHrs: 30,  machiningRate: 400, label: "Zinc Alloy (Soft)" },
  { maxQty: 5000,     pricePerKg: 80,  weightFactor: 0.00785, machiningHrs: 50,  machiningRate: 400, label: "Mild Steel (Semi-soft)" },
  { maxQty: 50000,    pricePerKg: 150, weightFactor: 0.00785, machiningHrs: 80,  machiningRate: 400, label: "P20 Steel (Semi-hard)" },
  { maxQty: Infinity, pricePerKg: 220, weightFactor: 0.00785, machiningHrs: 120, machiningRate: 400, label: "H13 Steel (Hard)" },
];

const MACHINE_RATE_PER_HR = 400;
const OPERATOR_RATE_PER_HR = 115;
const OVERHEAD_FACTOR = 1.25;
const SCRAP_FACTOR = 1.05;
const PROFIT_MARGIN = 1.15;

function getMoldTier(quantity: number) {
  return MOLD_TIERS.find((t) => quantity <= t.maxQty)!;
}

function calcMoldCost(volumeCubicMm: number, boundingBox: { x: number; y: number; z: number }, quantity: number) {
  const tier = getMoldTier(quantity);
  const { x, y, z } = boundingBox;
  const maxDim = Math.max(x, y, z);

  const pad = Math.min(25, Math.max(15, maxDim * 0.12));
  const moldVolumeCm3 = ((x + pad * 2) * (y + pad * 2) * (z + pad * 2)) / 1000;

  const steelCost = moldVolumeCm3 * tier.weightFactor * tier.pricePerKg;  // ← removed × 1000
  const machiningCost = tier.machiningHrs * tier.machiningRate;
  const designCost = 10000;
  const totalMoldCost = (steelCost + machiningCost + designCost) * OVERHEAD_FACTOR;
  return { totalMoldCost: Math.round(totalMoldCost), moldLabel: tier.label };
}


function calcPerPieceCost(volumeCubicMm: number, materialKey: string, quantity: number) {
  const mat = MATERIALS[materialKey];
  const volumeCm3 = volumeCubicMm / 1000;
  const weightKg = (volumeCm3 * mat.density) / 1000;

  const materialDiscount = Math.min(0.15, quantity / 100000);
  const materialCost = weightKg * mat.pricePerKg * SCRAP_FACTOR * (1 - materialDiscount);

  const baseCycleTimeSec = 30;
  const efficiencyFactor = Math.max(0.75, 1 - Math.log10(Math.max(1, quantity)) * 0.05);
  const cycleTimeSec = baseCycleTimeSec * efficiencyFactor;
  const cycleTimeHr = cycleTimeSec / 3600;

  const machineCost = cycleTimeHr * MACHINE_RATE_PER_HR;
  const operatorCost = cycleTimeHr * OPERATOR_RATE_PER_HR;
  const perPiece = (materialCost + machineCost + operatorCost) * OVERHEAD_FACTOR * PROFIT_MARGIN;
  return Math.round(perPiece * 100) / 100;
}

function buildChartData(volumeCubicMm: number, boundingBox: { x: number; y: number; z: number }, materialKey: string) {
  const quantities = [1, 10, 100, 500, 1000, 2000, 5000, 10000, 50000];
  return quantities.map((qty) => {
    const { totalMoldCost } = calcMoldCost(volumeCubicMm, boundingBox, qty);
    const perPiece = calcPerPieceCost(volumeCubicMm, materialKey, qty);
    const totalCost = totalMoldCost + perPiece * qty;
    return {
      quantity: qty,
      "Per Unit (incl. mold)": Math.round(totalCost / qty),
      "Per Unit (excl. mold)": Math.round(perPiece),
    };
  });
}

interface CostChartProps {
  volumeCubicMm?: number | null;
  boundingBox?: { x: number; y: number; z: number } | null;
  material?: string;
  quantity?: number;
  onMaterialChange?: (m: string) => void;
  onQuantityChange?: (q: number) => void;
}

const CostChart = ({
  volumeCubicMm,
  boundingBox,
  material = "ABS",
  quantity = 1000,
  onMaterialChange,
  onQuantityChange,
}: CostChartProps) => {
  const hasData = volumeCubicMm != null && boundingBox != null;
  const chartData = hasData ? buildChartData(volumeCubicMm!, boundingBox!, material) : [];
  const moldInfo = hasData ? calcMoldCost(volumeCubicMm!, boundingBox!, quantity) : null;
  const perPiece = hasData ? calcPerPieceCost(volumeCubicMm!, material, quantity) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Material</label>
          <select
            value={material}
            onChange={(e) => onMaterialChange?.(e.target.value)}
            className="rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground"
          >
            {Object.entries(MATERIALS).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quantity</label>
          <input
            type="number"
            value={quantity}
            min={1}
            onChange={(e) => onQuantityChange?.(parseInt(e.target.value) || 1)}
            className="w-24 rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground"
          />
        </div>
      </div>

      {moldInfo && perPiece != null && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Mold Cost</p>
            <p className="text-lg font-bold text-foreground mt-1">₹{moldInfo.totalMoldCost.toLocaleString("en-IN")}</p>
            <p className="text-xs text-muted-foreground">{moldInfo.moldLabel}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Per Piece Cost</p>
            <p className="text-lg font-bold text-foreground mt-1">₹{perPiece.toLocaleString("en-IN")}</p>
            <p className="text-xs text-muted-foreground">Excl. mold amortization</p>
          </div>
        </div>
      )}

      {hasData && <CostInfoModal />}

      {!hasData && (
        <p className="text-sm text-muted-foreground">Upload a STEP file to see cost analysis.</p>
      )}

      {hasData && (
        <>
          <div className="flex items-baseline justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cost vs. Quantity</h3>
            <span className="text-xs text-muted-foreground">Per unit (INR)</span>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="quantity" tick={{ fontSize: 12, fill: "hsl(220, 10%, 50%)" }} axisLine={{ stroke: "hsl(220, 13%, 91%)" }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(220, 10%, 50%)" }} axisLine={false} tickLine={false} width={70}
                  tickFormatter={(v: number) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(0,0%,100%)", border: "1px solid hsl(220,13%,91%)", borderRadius: "8px", fontSize: "13px" }}
                  formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, undefined]}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Line type="monotone" dataKey="Per Unit (incl. mold)" stroke="hsl(280, 65%, 58%)" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: "white" }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Per Unit (excl. mold)" stroke="hsl(220, 80%, 56%)" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 2, fill: "white" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

export default CostChart;
