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
  const maxDim = Math.max(x, y, z);
  const minDim = Math.min(x, y, z);
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

  const aspectRatio = maxDim / minDim;
  if (aspectRatio > 10) {
    issues.push({ type: "warning" as const, text: `High aspect ratio (${aspectRatio.toFixed(1)}:1) — risk of warpage and fill issues` });
  }

  if (wallThicknessEstimate < 2) {
    issues.push({ type: "info" as const, text: `Add 1–3° draft angle on all vertical faces for easy ejection` });
  } else {
    issues.push({ type: "success" as const, text: `Draft angle likely adequate based on part geometry` });
  }

  const volumeCm3 = volumeCubicMm / 1000;
  if (volumeCm3 < 0.5) {
    issues.push({ type: "info" as const, text: `Very small part (${volumeCm3.toFixed(2)} cm³) — consider multi-cavity mold to improve efficiency` });
  } else if (volumeCm3 > 500) {
    issues.push({ type: "warning" as const, text: `Large part volume (${volumeCm3.toFixed(0)} cm³) — long cycle times expected` });
  } else {
    issues.push({ type: "success" as const, text: `Part volume (${volumeCm3.toFixed(2)} cm³) is within efficient injection molding range` });
  }

  return issues;
}

function getMoldRecommendation(quantity: number) {
  if (quantity <= 500) {
    return { type: "info" as const, text: `Aluminium soft mold recommended — suitable for up to ~500 shots` };
  } else if (quantity <= 2000) {
    return { type: "info" as const, text: `Zinc alloy soft mold recommended — suitable for up to ~2,000 shots` };
  } else if (quantity <= 5000) {
    return { type: "info" as const, text: `Mild steel semi-soft mold recommended — suitable for up to ~5,000 shots` };
  } else if (quantity <= 50000) {
    return { type: "info" as const, text: `P20 steel semi-hard mold recommended — suitable for up to ~500,000 shots` };
  } else {
    return { type: "success" as const, text: `H13 hard steel mold recommended — suitable for 500,000+ shots` };
  }
}

function getMachineSpec(volumeCubicMm: number, boundingBox: { x: number; y: number; z: number }) {
  const { x, y } = boundingBox;
  const projectedArea = (x * y) / 100;
  const clampingForce = projectedArea * 0.5;
  const volumeCm3 = volumeCubicMm / 1000;
  let tonnage = Math.max(50, Math.ceil(clampingForce / 10) * 10);
  if (tonnage > 500) tonnage = 500;
  return {
    tonnage,
    shotSize: `${(volumeCm3 * 1.15).toFixed(1)} cm³`,
    screwDia: tonnage <= 100 ? "30–40mm" : tonnage <= 200 ? "40–50mm" : "50–70mm",
  };
}

const typeStyles = {
  success: "text-success",
  warning: "text-warning",
  info: "text-primary",
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
  const hasData = volumeCubicMm != null && boundingBox != null;
  const issues = hasData ? getDFMIssues(volumeCubicMm!, boundingBox!) : [];
  const moldRec = hasData ? getMoldRecommendation(quantity) : null;
  const machineSpec = hasData ? getMachineSpec(volumeCubicMm!, boundingBox!) : null;

  // Undercut issue from API
  const undercutIssue = undercutMessage
    ? {
        type: (undercutSeverity === "high"
          ? "warning"
          : undercutSeverity === "moderate"
          ? "info"
          : "success") as "warning" | "info" | "success",
        text: undercutMessage,
      }
    : null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        DFM Feedback
      </h3>

      {hasData && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2.5">
            <Ruler className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm text-foreground/80">
              Volume: <span className="font-semibold">{volumeCubicMm!.toFixed(2)} mm³</span>
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Info className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm text-foreground/80">
              Bounding box:{" "}
              <span className="font-semibold">
                {boundingBox!.x.toFixed(1)} × {boundingBox!.y.toFixed(1)} × {boundingBox!.z.toFixed(1)} mm
              </span>
            </span>
          </div>
        </div>
      )}

      {!hasData && (
        <p className="text-sm text-muted-foreground">Upload a STEP file to see DFM analysis.</p>
      )}

      {issues.length > 0 && (
        <ul className="space-y-2">
          {issues.map((item, i) => {
            const Icon = typeIcons[item.type];
            return (
              <li key={i} className="flex items-start gap-2.5 rounded-lg bg-muted/30 px-3 py-2.5">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${typeStyles[item.type]}`} />
                <span className="text-sm leading-snug text-foreground/80">{item.text}</span>
              </li>
            );
          })}
          {undercutIssue && (
            <li className="flex items-start gap-2.5 rounded-lg bg-muted/30 px-3 py-2.5">
              {(() => { const Icon = typeIcons[undercutIssue.type]; return <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${typeStyles[undercutIssue.type]}`} />; })()}
              <span className="text-sm leading-snug text-foreground/80">{undercutIssue.text}</span>
            </li>
          )}
        </ul>
      )}

      {moldRec && (
        <div className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mold Type</h4>
          <div className="flex items-start gap-2.5 rounded-lg bg-muted/30 px-3 py-2.5">
            <Package className={`mt-0.5 h-4 w-4 shrink-0 ${typeStyles[moldRec.type]}`} />
            <span className="text-sm leading-snug text-foreground/80">{moldRec.text}</span>
          </div>
        </div>
      )}

      {machineSpec && (
        <div className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommended Machine</h4>
          <div className="rounded-lg bg-muted/30 px-3 py-2.5 space-y-1">
            <div className="flex items-center gap-2.5">
              <Zap className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm text-foreground/80">Clamping force: <span className="font-semibold">{machineSpec.tonnage} Tonnes</span></span>
            </div>
            <div className="flex items-center gap-2.5">
              <Wrench className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm text-foreground/80">Shot size: <span className="font-semibold">{machineSpec.shotSize}</span> | Screw: <span className="font-semibold">{machineSpec.screwDia}</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DFMFeedback;
