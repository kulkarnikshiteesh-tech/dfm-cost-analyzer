import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const processes = [
  { value: "injection", label: "Injection Molding" },
  { value: "fdm", label: "FDM 3D Printing" },
  { value: "sla", label: "SLA 3D Printing" },
  { value: "cnc", label: "CNC Machining" },
  { value: "sheet", label: "Sheet Metal" },
];

const ProcessSelector = () => {
  const [selected, setSelected] = useState("injection");

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Process Selection
      </h3>
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="w-full bg-card shadow-card">
          <SelectValue placeholder="Select process" />
        </SelectTrigger>
        <SelectContent>
          {processes.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selected !== "injection" && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            🚧 We will update this section soon...
          </p>
        </div>
      )}
    </div>
  );
};

export default ProcessSelector;
