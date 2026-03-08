import { AlertTriangle, CheckCircle2, Info, Ruler, Package, Wrench, Zap } from "lucide-react";

interface DFMFeedbackProps {
  volumeCubicMm?: number | null;
  boundingBox?: { x: number; y: number; z: number } | null;
  material?: string;
  quantity?: number;
  hasUndercuts?: boolean | null;
  undercutSeverity?: string | null;
  undercutMessage?: string | null;
}

function getDFMIssues(volumeCubicMm: number, boundingBox: { x: number; y: number; z: number }) {
  const issues = [];
  const { x, y, z } = boundingBox;

  const maxDim = x > 0 ? Math.max(x, y, z) : Math.pow(volumeCubicMm, 1 / 3) * 2;
  const minDim = x > 0 ? Math.min(x, y, z) : Math.pow(volumeCubicMm, 1 / 3);
  const wallThicknessEstimate = minDim / 10;

  if (wallThicknessEstimate < 1.2) {
    issues.push({ type: "warning" as const, text: `Est. wall ~${wallThicknessEstimate.toFixed(1)}mm — min 1.2mm recommended` });
  } else {
    issues.push({ type: "success" as const, text: `Wall thickness within tolerance (≥1.2mm)` });
  }

  if (maxDim > 300) {
    issues.push({ type: "warning" as const, text: `Part size ${maxDim.toFixed(0)}mm — large tonnage machine required` });
  } else {
    issues.push({ type: "success" as const, text: `Part fits standard mold dimensions` });
  }

  const volumeCm3 = volumeCubicMm / 1000;
  if (volumeCm3 < 0.5) {
    issues.push({ type: "info" as const, text: `Very small part (${volumeCm3.toFixed(2)} cm³) — consider multi-cavity mold` });
  } else if (volumeCm3 > 500) {
    issues.push({ type: "warning" as const, text: `Large volume (${volumeCm3.toFixed(0)} cm³) — long cycle times expected` });
  } else {
    issues.push({ type: "success" as const, text: `Volume in efficient injection molding range` });
  }

  return issues;
}

function getMoldRecommendation(quantity: number) {
  if (quantity <= 500) return { type: "info" as const, text: `Aluminium soft mold — suitable for <500 shots` };
  if (quantity <= 5000) return { type: "info" as const, text: `Mild steel semi-soft mold — up to 5,000 shots` };
  return { type: "success" as const, text: `H13 hard steel mold — high volume production` };
}

function getMachineSpec(volumeCubicMm: number, boundingBox: { x: number; y: number; z: number }) {
  const { x, y } = boundingBox;
  const projectedArea = x > 0 && y > 0 ? (x * y) / 100 : Math.pow(volumeCubicMm, 2 / 3) / 10;
  const clampingForce = projectedArea * 0.5;
  const volumeCm3 = volumeCubicMm / 1000;
  let tonnage = Math.max(50, Math.ceil(clampingForce / 10) * 10);
  if (tonnage > 500) tonnage = 500;
  return {
    tonnage,
    shotSize: `${(volumeCm3 * 1.15).toFixed(1)} cm³`,
    screwDia: tonnage <= 150 ? "30–45mm" : "50–70mm",
  };
}

const severityBorder: Record<string, string> = {
  high: "border-l-[#c0392b]",
  moderate: "border-l-[#d4a017]",
  low: "border-l-[#6abf6a]",
  unknown: "border-l-[#4a4a4e]",
};

const typeStyles = {
  success: "text-[#6abf6a]",
  warning: "text-[#d4a017]",
  info: "text-[#6a9fd8]",
};

const typeIcons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
};

const DFMFeedback = ({
  volumeCubicMm,
  boundingBox,
  material = "ABS",
  quantity = 1000,
  hasUndercuts,
  undercutSeverity,
  undercutMessage,
}: DFMFeedbackProps) => {
  const hasData = !!volumeCubicMm;
  const safeBoundingBox = boundingBox || { x: 0, y: 0, z: 0 };

  const issues = hasData ? getDFMIssues(volumeCubicMm!, safeBoundingBox) : [];
  const moldRec = hasData ? getMoldRecommendation(quantity) : null;
  const machineSpec = hasData ? getMachineSpec(volumeCubicMm!, safeBoundingBox) : null;

  const undercutIssue = undercutMessage
    ? {
        type: (hasUndercuts ? "warning" : "success") as "warning" | "success",
        text: undercutMessage,
        severity: undercutSeverity || "low",
      }
    : null;

  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#4a4a4e]">
        DFM Analysis
      </h3>

      {!hasData ? (
        <div className="rounded-lg border border-dashed border-[#2e2e30] px-4 py-6 text-center">
          <p className="text-xs text-[#3a3a3e]">Awaiting model upload</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Dimensions */}
          <div className="rounded-lg border border-[#2e2e30] bg-[#191919] p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Ruler className="h-3.5 w-3.5 shrink-0 text-[#3b6bca]" />
              <span className="text-xs text-[#8a8a8e]">
                Volume: <span className="font-semibold text-[#e8e6e1] font-mono">{volumeCubicMm!.toLocaleString()} mm³</span>
              </span>
            </div>
            {safeBoundingBox.x > 0 && (
              <div className="flex items-center gap-2">
                <Info className="h-3.5 w-3.5 shrink-0 text-[#3b6bca]" />
                <span className="text-xs text-[#8a8a8e]">
                  Box: <span className="font-semibold text-[#e8e6e1] font-mono">
                    {safeBoundingBox.x.toFixed(1)} × {safeBoundingBox.y.toFixed(1)} × {safeBoundingBox.z.toFixed(1)} mm
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Undercut result */}
          {undercutIssue && (
            <div className={`rounded-lg border border-[#2e2e30] border-l-4 bg-[#191919] px-3 py-3 ${severityBorder[undercutIssue.severity]}`}>
              <div className="flex items-start gap-2">
                {(() => { const Icon = typeIcons[undercutIssue.type]; return <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${typeStyles[undercutIssue.type]}`} />; })()}
                <span className="text-xs leading-relaxed text-[#c8c6c1]">{undercutIssue.text}</span>
              </div>
            </div>
          )}

          {/* DFM checks */}
          <ul className="space-y-2">
            {issues.map((item, i) => {
              const Icon = typeIcons[item.type];
              return (
                <li key={i} className="flex items-start gap-2 rounded-lg bg-[#191919] border border-[#2e2e30] px-3 py-2.5">
                  <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${typeStyles[item.type]}`} />
                  <span className="text-xs leading-snug text-[#8a8a8e]">{item.text}</span>
                </li>
              );
            })}
          </ul>

          {/* Tooling + Machine */}
          <div className="grid grid-cols-1 gap-2">
            {moldRec && (
              <div className="rounded-lg border border-[#2e2e30] bg-[#191919] px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#4a4a4e] mb-1.5">Recommended Mold</p>
                <div className="flex items-start gap-2">
                  <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3b6bca]" />
                  <span className="text-xs text-[#8a8a8e]">{moldRec.text}</span>
                </div>
              </div>
            )}
            {machineSpec && (
              <div className="rounded-lg border border-[#2e2e30] bg-[#191919] px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#4a4a4e] mb-1.5">Machine Spec</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-[#d4a017]" />
                    <span className="text-xs font-bold text-[#e8e6e1] font-mono">{machineSpec.tonnage}T</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#8a8a8e]">
                    <Wrench className="h-3 w-3" />
                    <span className="text-xs font-mono">{machineSpec.shotSize}</span>
                  </div>
                  <span className="text-xs text-[#4a4a4e] font-mono">{machineSpec.screwDia}</span>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default DFMFeedback;
