import { useState } from "react";
import { Info, X } from "lucide-react";

const CostInfoModal = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info size={13} />
        How is this calculated?
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          {/* Modal panel */}
          <div
            className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Cost Calculation Rationale
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Section: Mold / Tooling */}
            <div className="mb-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-500 mb-2">
                🛠 Mold / Tooling Cost
              </h3>
              <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                <li>
                  <span className="font-semibold text-foreground">Mold block size</span> — estimated by adding proportional padding (15–25mm per side, scaled to part size) around the part's bounding box.
                </li>
                <li>
                  <span className="font-semibold text-foreground">Mold material</span> — selected based on quantity: Aluminium for &lt;500 units, Zinc Alloy up to 2,000, Mild Steel up to 5,000, P20 Steel up to 50,000, and H13 Steel beyond that.
                </li>
                <li>
                  <span className="font-semibold text-foreground">Steel cost</span> — mold block volume (cm³) × material density × price per kg.
                </li>
                <li>
                  <span className="font-semibold text-foreground">Machining cost</span> — estimated machining hours (25–120 hrs depending on mold grade) × ₹400/hr CNC rate.
                </li>
                <li>
                  <span className="font-semibold text-foreground">Design cost</span> — flat ₹10,000 for mold design and engineering.
                </li>
                <li>
                  <span className="font-semibold text-foreground">Overhead</span> — 1.25× applied on total mold cost.
                </li>
              </ul>
            </div>

            {/* Divider */}
            <div className="border-t border-border mb-5" />

            {/* Section: Per Piece */}
            <div className="mb-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-500 mb-2">
                🏭 Per Piece (Plastic Shot) Cost
              </h3>
              <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                <li>
                  <span className="font-semibold text-foreground">Material cost</span> — part volume (cm³) × material density × price per kg. Includes a 5% scrap factor. Bulk discount of up to 15% applied at high quantities.
                </li>
                <li>
                  <span className="font-semibold text-foreground">Cycle time</span> — base 30 sec/shot, reduced by up to 25% at higher volumes due to process optimization.
                </li>
                <li>
                  <span className="font-semibold text-foreground">Machine cost</span> — cycle time (hrs) × ₹400/hr injection molding machine rate.
                </li>
                <li>
                  <span className="font-semibold text-foreground">Operator cost</span> — cycle time (hrs) × ₹115/hr labor rate.
                </li>
                <li>
                  <span className="font-semibold text-foreground">Overhead + margin</span> — 1.25× overhead and 1.15× profit margin applied on total per-piece cost.
                </li>
              </ul>
            </div>

            {/* Divider */}
            <div className="border-t border-border mb-4" />

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground italic leading-relaxed">
              ⚠️ These are indicative estimates for early-stage design decisions. Actual costs vary based on vendor, region, part complexity, surface finish, and tolerance requirements.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default CostInfoModal;
