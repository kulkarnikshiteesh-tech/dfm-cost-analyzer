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
  
  // Use real dimensions if available, otherwise estimate based on volume cube root
  const maxDim = x > 0 ? Math.max(x, y, z) : Math.pow(volumeCubicMm, 1/3) * 2;
  const minDim = x > 0 ? Math.min(x, y, z) : Math.pow(volumeCubicMm, 1/3);
  const wallThicknessEstimate = minDim / 10;

  if (wallThicknessEstimate < 1.2) {
    issues.push({ type: "warning" as const, text: `Estimated wall thickness ~${wallThicknessEstimate.toFixed(1)}mm — minimum 1.2mm recommended for injection molding` });
  } else {
    issues.push({ type: "success" as const, text: `Wall thickness within tolerance (estimated ≥1.2mm)` });
  }

  if (maxDim > 300) {
    issues.push({ type: "warning" as const, text: `Part size ${maxDim.toFixed(0)}mm exceeds standard mold range — large tonnage machine required` });
  } else {
    issues.push({ type: "success" as const, text: `Part fits within standard mold dimensions` });
  }

  const volumeCm3 = volumeCubicMm / 1000;
  if (volumeCm3 < 0.5) {
    issues.push({ type: "info" as const, text: `Very small part (${volumeCm3.toFixed(2)} cm³) — consider multi-cavity mold` });
  } else if (volumeCm3 > 500) {
    issues.push({ type: "warning" as const, text: `Large part volume (${volumeCm3.toFixed(0)} cm³) — long cycle times expected` });
  } else {
    issues.push({ type: "success" as const, text: `Part volume is within efficient injection molding range` });
  }

  return issues;
}

function getMoldRecommendation(quantity: number) {
  if (quantity <= 500) return { type: "info" as const, text: `Aluminium soft mold recommended (<500 shots)` };
  if (quantity <= 5000) return { type: "info" as const, text: `Mild steel semi-soft mold recommended (<5,000 shots)` };
  return { type: "success" as const, text: `H13 hard steel mold recommended for high volume` };
}

function getMachineSpec(volumeCubicMm: number, boundingBox: { x: number; y: number; z: number }) {
  const { x, y } = boundingBox;
  // If no bounding box, estimate projected area from volume
  const projectedArea = (x > 0 && y > 0) ? (x * y) / 100 : (Math.pow(volumeCubicMm, 2/3) / 10);
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

const typeStyles = {
  success: "text-green-500",
  warning: "text-orange-500",
  info: "text-blue-500",
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
  
  // KEY CHANGE: Component now activates if volume exists, even without boundingBox
  const hasData = !!volumeCubicMm;
  const safeBoundingBox = boundingBox || { x: 0, y: 0, z: 0 };

  const issues = hasData ? getDFMIssues(volumeCubicMm!, safeBoundingBox) : [];
  const moldRec = hasData ? getMoldRecommendation(quantity) : null;
  const machineSpec = hasData ? getMachineSpec(volumeCubicMm!, safeBoundingBox) : null;

  const undercutIssue = undercutMessage
    ? {
        type: (hasUndercuts ? "warning" : "success") as "warning" | "success",
        text: undercutMessage,
      }
    : null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        DFM Feedback
      </h3>

      {!hasData ? (
        <p className="text-sm text-muted-foreground">Upload a STEP file to see DFM analysis.</p>
      ) : (
        <div className="space-y-4">
          {/* Dimensional Stats */}
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2.5">
              <Ruler className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm text-foreground/80">
                Volume: <span className="font-semibold">{volumeCubicMm!.toLocaleString()} mm³</span>
              </span>
            </div>
            {safeBoundingBox.x > 0 && (
              <div className="flex items-center gap-2.5">
                <Info className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm text-foreground/80">
                  Bounding box: <span className="font-semibold">{safeBoundingBox.x.toFixed(1)} × {safeBoundingBox.y.toFixed(1)} × {safeBoundingBox.z.toFixed(1)} mm</span>
                </span>
              </div>
            )}
          </div>

          {/* Undercut & DFM Issues */}
          <ul className="space-y-2">
            {undercutIssue && (
              <li className={`flex items-start gap-2.5 rounded-lg bg-muted/30 px-3 py-2.5 border-l-4 ${undercutSeverity === 'high' ? 'border-red-500' : hasUndercuts ? 'border-orange-500' : 'border-green-500'}`}>
                {(() => { const Icon = typeIcons[undercutIssue.type]; return <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${typeStyles[undercutIssue.type]}`} />; })()}
                <span className="text-sm font-medium leading-snug text-foreground">{undercutIssue.text}</span>
              </li>
            )}
            {issues.map((item, i) => {
              const Icon = typeIcons[item.type];
              return (
                <li key={i} className="flex items-start gap-2.5 rounded-lg bg-muted/30 px-3 py-2.5">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${typeStyles[item.type]}`} />
                  <span className="text-sm leading-snug text-foreground/80">{item.text}</span>
                </li>
              );
            })}
          </ul>

          {/* Tooling & Machine info */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {moldRec && (
              <div className="space-y-1">
                <h4 className="text-[10px] font-bold uppercase text-muted-foreground">Mold</h4>
                <div className="flex items-start gap-2.5 rounded-lg bg-muted/30 px-3 py-2">
                  <Package className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-xs text-foreground/80">{moldRec.text}</span>
                </div>
              </div>
            )}
            {machineSpec && (
              <div className="space-y-1">
                <h4 className="text-[10px] font-bold uppercase text-muted-foreground">Machine</h4>
                <div className="rounded-lg bg-muted/30 px-3 py-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-bold">{machineSpec.tonnage}T Force</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Wrench className="h-3.5 w-3.5" />
                    <span>Shot: {machineSpec.shotSize}</span>
                  </div>
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
