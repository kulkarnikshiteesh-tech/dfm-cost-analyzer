import { X } from "lucide-react";

const MATERIALS: Record<string, { density: number; pricePerKg: number; label: string; notes: string }> = {
  ABS:   { density: 1.05, pricePerKg: 120, label: "ABS",            notes: "General purpose, indoor, good surface finish" },
  PP:    { density: 0.91, pricePerKg: 90,  label: "PP",             notes: "Chemical resistant, food safe, living hinges" },
  Nylon: { density: 1.14, pricePerKg: 120, label: "Nylon PA6",      notes: "Mechanical parts, wear resistance, structural" },
  PC:    { density: 1.20, pricePerKg: 170, label: "Polycarbonate",  notes: "Outdoor UV, high impact, transparent parts" },
  HIPS:  { density: 1.05, pricePerKg: 110, label: "HIPS",           notes: "Prototypes, low cost indoor non-structural" },
  TPU:   { density: 1.20, pricePerKg: 200, label: "TPU",            notes: "Flexible, snap fits, impact absorption" },
  TPE:   { density: 0.90, pricePerKg: 180, label: "TPE",            notes: "Soft touch grips, overmolds, rubber feel" },
};

const MOLD_TIERS = [
  { maxQty: 500,      steelPricePerKg: 80,  weightFactor: 0.0027,  machiningHrs: 25,  label: "Aluminium (Soft)",  shots: "<500" },
  { maxQty: 2000,     steelPricePerKg: 100, weightFactor: 0.0065,  machiningHrs: 30,  label: "Zinc Alloy",        shots: "500–2,000" },
  { maxQty: 5000,     steelPricePerKg: 80,  weightFactor: 0.00785, machiningHrs: 50,  label: "Mild Steel",        shots: "2,000–5,000" },
  { maxQty: 50000,    steelPricePerKg: 150, weightFactor: 0.00785, machiningHrs: 80,  label: "P20 Steel",         shots: "5,000–50,000" },
  { maxQty: Infinity, steelPricePerKg: 220, weightFactor: 0.00785, machiningHrs: 120, label: "H13 Steel",         shots: ">50,000" },
];

const MACHINE_RATE = 400;
const OPERATOR_RATE = 115;
const OVERHEAD = 1.25;
const SCRAP = 1.05;
const MARGIN = 1.15;
const DESIGN_COST = 10000;
const RATE = 400;

const UNDERCUT_SURCHARGE: Record<string, number> = {
  high: 0.35,
  moderate: 0.15,
  low: 0,
};

function getMoldTier(qty: number) {
  return MOLD_TIERS.find((t) => qty <= t.maxQty)!;
}

interface ReportModalProps {
  volumeCubicMm: number;
  boundingBox: { x: number; y: number; z: number };
  material: string;
  quantity: number;
  hasUndercuts?: boolean | null;
  undercutSeverity?: string | null;
  undercutMessage?: string | null;
  onClose: () => void;
}

export default function ReportModal({
  volumeCubicMm,
  boundingBox,
  material,
  quantity,
  hasUndercuts,
  undercutSeverity,
  undercutMessage,
  onClose,
}: ReportModalProps) {

  // ── Calculations ────────────────────────────────────────────────────────────
  const tier = getMoldTier(quantity);
  const { x, y, z } = boundingBox;
  const pad = Math.min(25, Math.max(15, Math.max(x, y, z) * 0.12));
  const moldVolCm3 = ((x + pad * 2) * (y + pad * 2) * (z + pad * 2)) / 1000;
  const steelCost  = Math.round(moldVolCm3 * tier.weightFactor * tier.steelPricePerKg);
  const machCost   = tier.machiningHrs * RATE;
  const baseMold   = Math.round((steelCost + machCost + DESIGN_COST) * OVERHEAD);
  const severity   = undercutSeverity && hasUndercuts ? undercutSeverity : "low";
  const surchargeRate = UNDERCUT_SURCHARGE[severity] ?? 0;
  const surchargeCost = Math.round(baseMold * surchargeRate);
  const totalMold  = baseMold + surchargeCost;

  const mat        = MATERIALS[material] ?? MATERIALS["ABS"];
  const volCm3     = volumeCubicMm / 1000;
  const weightKg   = (volCm3 * mat.density) / 1000;
  const discount   = Math.min(0.15, quantity / 100000);
  const matCost    = Math.round(weightKg * mat.pricePerKg * SCRAP * (1 - discount) * 100) / 100;
  const efficiency = Math.max(0.75, 1 - Math.log10(Math.max(1, quantity)) * 0.05);
  const cycleHr    = (30 * efficiency) / 3600;
  const machineCost   = Math.round(cycleHr * MACHINE_RATE * 100) / 100;
  const operatorCost  = Math.round(cycleHr * OPERATOR_RATE * 100) / 100;
  const perPieceBase  = Math.round((matCost + machineCost + operatorCost) * OVERHEAD * MARGIN * 100) / 100;
  const totalPerUnit  = Math.round((totalMold + perPieceBase * quantity) / quantity);

  const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#e0deda] bg-white shadow-2xl" style={{ scrollbarWidth: "none" }}>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e0deda] bg-white px-6 py-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#9a9a9e]">Makeable</p>
            <p className="text-base font-black text-[#1a1a1c]">Cost Analysis Report</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-[#f0ede8] transition-colors">
            <X className="h-4 w-4 text-[#6a6a6e]" />
          </button>
        </div>

            <div className="px-6 py-5 space-y-6">

              {/* Disclaimer */}
              <div className="rounded-lg border border-[#e0a020]/40 bg-[#fffbf0] px-4 py-3">
                <p className="text-[10px] text-[#c08010] leading-relaxed">
                  <strong>All estimates are approximate.</strong> Actual costs vary by vendor, region, mold complexity, surface finish requirements, and part geometry. Use these figures for early-stage planning only. Always get a formal quote from a toolmaker before committing.
                </p>
              </div>

              {/* Part details */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#9a9a9e] mb-3">Part Details</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Volume", `${volumeCubicMm.toLocaleString()} mm³ (${volCm3.toFixed(2)} cm³)`],
                    ["Bounding Box", `${x.toFixed(1)} × ${y.toFixed(1)} × ${z.toFixed(1)} mm`],
                    ["Material", mat.label],
                    ["Quantity", quantity.toLocaleString("en-IN") + " units"],
                    ["Mold Type", tier.label],
                    ["Part Weight", `${(weightKg * 1000).toFixed(1)} g`],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-[#e0deda] bg-[#f8f7f4] px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">{k}</p>
                      <p className="text-xs font-bold text-[#1a1a1c]">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mold cost breakdown */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#9a9a9e] mb-3">Mold Cost Breakdown</p>
                <div className="rounded-xl border border-[#e0deda] overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#f8f7f4] border-b border-[#e0deda]">
                        <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Item</th>
                        <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Basis</th>
                        <th className="px-4 py-2.5 text-right text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0ede8]">
                      <tr>
                        <td className="px-4 py-2.5 text-[#1a1a1c] font-semibold">Steel / mold block</td>
                        <td className="px-4 py-2.5 text-[#6a6a6e]">{moldVolCm3.toFixed(0)} cm³ × {tier.weightFactor} kg/cm³ × ₹{tier.steelPricePerKg}/kg</td>
                        <td className="px-4 py-2.5 text-right font-bold text-[#1a1a1c]">₹{fmt(steelCost)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-[#1a1a1c] font-semibold">Machining</td>
                        <td className="px-4 py-2.5 text-[#6a6a6e]">{tier.machiningHrs} hrs × ₹{RATE}/hr</td>
                        <td className="px-4 py-2.5 text-right font-bold text-[#1a1a1c]">₹{fmt(machCost)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-[#1a1a1c] font-semibold">Design &amp; setup</td>
                        <td className="px-4 py-2.5 text-[#6a6a6e]">Fixed cost</td>
                        <td className="px-4 py-2.5 text-right font-bold text-[#1a1a1c]">₹{fmt(DESIGN_COST)}</td>
                      </tr>
                      <tr className="bg-[#f8f7f4]">
                        <td className="px-4 py-2.5 text-[#1a1a1c] font-semibold">Overhead (1.25×)</td>
                        <td className="px-4 py-2.5 text-[#6a6a6e]">Applied on all above</td>
                        <td className="px-4 py-2.5 text-right font-bold text-[#1a1a1c]">₹{fmt(baseMold)}</td>
                      </tr>
                      {surchargeCost > 0 && (
                        <tr className="bg-[#fff8f0]">
                          <td className="px-4 py-2.5 text-[#c08010] font-semibold">
                            ⚠ Undercut surcharge ({Math.round(surchargeRate * 100)}%)
                          </td>
                          <td className="px-4 py-2.5 text-[#9a9a9e] text-[10px]">
                            Side-action sliders / lifters required. Approximate — varies by undercut count and depth.
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-[#c08010]">₹{fmt(surchargeCost)}</td>
                        </tr>
                      )}
                      <tr className="border-t-2 border-[#e0deda] bg-[#eef2fc]">
                        <td className="px-4 py-2.5 font-black text-[#1a1a1c]">Total Mold Cost</td>
                        <td className="px-4 py-2.5 text-[#6a6a6e] text-[10px]">One-time investment</td>
                        <td className="px-4 py-2.5 text-right font-black text-[#3b6bca] text-sm">₹{fmt(totalMold)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Per piece breakdown */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#9a9a9e] mb-3">Per Piece Cost Breakdown</p>
                <div className="rounded-xl border border-[#e0deda] overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#f8f7f4] border-b border-[#e0deda]">
                        <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Item</th>
                        <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Basis</th>
                        <th className="px-4 py-2.5 text-right text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0ede8]">
                      <tr>
                        <td className="px-4 py-2.5 text-[#1a1a1c] font-semibold">Material</td>
                        <td className="px-4 py-2.5 text-[#6a6a6e]">{(weightKg * 1000).toFixed(1)}g × ₹{mat.pricePerKg}/kg + {Math.round(discount * 100)}% qty discount</td>
                        <td className="px-4 py-2.5 text-right font-bold text-[#1a1a1c]">₹{matCost.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-[#1a1a1c] font-semibold">Machine time</td>
                        <td className="px-4 py-2.5 text-[#6a6a6e]">30s cycle × {efficiency.toFixed(2)} efficiency × ₹{MACHINE_RATE}/hr</td>
                        <td className="px-4 py-2.5 text-right font-bold text-[#1a1a1c]">₹{machineCost.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-[#1a1a1c] font-semibold">Operator</td>
                        <td className="px-4 py-2.5 text-[#6a6a6e]">₹{OPERATOR_RATE}/hr</td>
                        <td className="px-4 py-2.5 text-right font-bold text-[#1a1a1c]">₹{operatorCost.toFixed(2)}</td>
                      </tr>
                      <tr className="bg-[#f8f7f4]">
                        <td className="px-4 py-2.5 text-[#1a1a1c] font-semibold">Overhead + margin</td>
                        <td className="px-4 py-2.5 text-[#6a6a6e]">1.25× overhead, 1.15× margin</td>
                        <td className="px-4 py-2.5 text-right font-bold text-[#1a1a1c]">₹{perPieceBase.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total per unit */}
              <div className="rounded-xl border border-[#3b6bca]/20 bg-[#eef2fc] px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#6a9fd8]">Total per Unit</p>
                    <p className="text-[10px] text-[#6a6a6e] mt-0.5">Mold cost amortised across {quantity.toLocaleString("en-IN")} units</p>
                    <p className="text-[10px] text-[#6a6a6e]">= (₹{fmt(totalMold)} + ₹{perPieceBase.toFixed(2)} × {quantity.toLocaleString()}) ÷ {quantity.toLocaleString()}</p>
                  </div>
                  <p className="text-2xl font-black text-[#3b6bca]">₹{fmt(totalPerUnit)}</p>
                </div>
              </div>

              {/* Material reference table */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#9a9a9e] mb-3">Material Reference Prices</p>
                <div className="rounded-xl border border-[#e0deda] overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#f8f7f4] border-b border-[#e0deda]">
                        <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Material</th>
                        <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Density</th>
                        <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Price/kg</th>
                        <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Best for</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0ede8]">
                      {Object.entries(MATERIALS).map(([key, m]) => (
                        <tr key={key} className={material === key ? "bg-[#eef2fc]" : ""}>
                          <td className="px-4 py-2.5 font-bold text-[#1a1a1c]">{m.label} {material === key ? "✓" : ""}</td>
                          <td className="px-4 py-2.5 text-[#6a6a6e]">{m.density} g/cm³</td>
                          <td className="px-4 py-2.5 text-[#6a6a6e]">₹{m.pricePerKg}</td>
                          <td className="px-4 py-2.5 text-[#6a6a6e]">{m.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mold tier reference */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#9a9a9e] mb-3">Mold Tier Reference</p>
                <div className="rounded-xl border border-[#e0deda] overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#f8f7f4] border-b border-[#e0deda]">
                        <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Mold Type</th>
                        <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Shot range</th>
                        <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Steel ₹/kg</th>
                        <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-[#9a9a9e]">Machining hrs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0ede8]">
                      {MOLD_TIERS.map((t) => (
                        <tr key={t.label} className={tier.label === t.label ? "bg-[#eef2fc]" : ""}>
                          <td className="px-4 py-2.5 font-bold text-[#1a1a1c]">{t.label} {tier.label === t.label ? "✓" : ""}</td>
                          <td className="px-4 py-2.5 text-[#6a6a6e]">{t.shots}</td>
                          <td className="px-4 py-2.5 text-[#6a6a6e]">₹{t.steelPricePerKg}</td>
                          <td className="px-4 py-2.5 text-[#6a6a6e]">{t.machiningHrs} hrs</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Undercut surcharge reference */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#9a9a9e] mb-2">Undercut Surcharge Logic</p>
                <div className="rounded-lg border border-[#e0deda] bg-[#f8f7f4] px-4 py-3 space-y-1.5 text-[11px] text-[#6a6a6e]">
                  <p><span className="font-bold text-[#16a34a]">No undercuts</span> — No surcharge. Straight-pull mold, standard tooling cost.</p>
                  <p><span className="font-bold text-[#c08010]">Moderate undercuts</span> — +15% on mold cost. Simple side-actions or lifters likely required.</p>
                  <p><span className="font-bold text-[#dc2626]">High undercuts</span> — +35% on mold cost. Complex sliders, multiple side-actions, significantly higher tooling complexity.</p>
                  <p className="mt-2 text-[10px] text-[#9a9a9e] italic">These percentages are indicative. The actual surcharge depends on the number, depth, and accessibility of undercut features. Always confirm with your toolmaker.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
  );
}
