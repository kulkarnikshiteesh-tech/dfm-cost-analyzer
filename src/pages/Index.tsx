import { useState } from "react";
import { Box, Layers, ListOrdered } from "lucide-react";
import FileUploadZone, { type UploadResponse } from "@/components/FileUploadZone";
import DFMFeedback from "@/components/DFMFeedback";
import ProcessSelector from "@/components/ProcessSelector";
import CADViewer from "@/components/CADViewer";
import CostChart from "@/components/CostChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const Index = () => {
  const [uploadData, setUploadData] = useState<any>(null);
  const [material, setMaterial] = useState("ABS");
  const [quantity, setQuantity] = useState(1000);

  // Restore the glbUrl logic but keep a fallback for your rotating cube/placeholder
  const glbUrl = uploadData?.glb_url || null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Box className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">CADCheck</span>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 space-y-6 border-b border-border p-5 lg:w-80 lg:border-b-0 lg:border-r">
          <FileUploadZone onUploadSuccess={(data) => setUploadData(data)} />
          
          <ProcessSelector />

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Layers className="h-3.5 w-3.5" /> Material
            </label>
            <Select value={material} onValueChange={setMaterial}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ABS">ABS</SelectItem>
                <SelectItem value="PC">Polycarbonate</SelectItem>
                <SelectItem value="Nylon">Nylon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-xs font-semibold uppercase text-muted-foreground">
              <span className="flex items-center gap-2"><ListOrdered className="h-3.5 w-3.5" /> Volume</span>
              <span className="text-primary">{quantity.toLocaleString()} units</span>
            </div>
            <Slider value={[quantity]} min={100} max={50000} step={100} onValueChange={(val) => setQuantity(val[0])} />
          </div>

          {/* This is where the data was failing; restored with proper key mapping */}
          <DFMFeedback
            volumeCubicMm={uploadData?.volume_cubic_mm}
            boundingBox={uploadData?.bounding_box_mm || {x: 0, y: 0, z: 0}}
            material={material}
            quantity={quantity}
            hasUndercuts={uploadData?.has_undercuts}
            undercutMessage={uploadData?.undercut_message}
          />
        </aside>

        <main className="flex flex-1 flex-col">
          <div className="flex-1 p-4" style={{ minHeight: "400px" }}>
            {/* CADViewer restored to original state with your rotating cube/placeholder */}
            <CADViewer glbUrl={glbUrl} />
          </div>
          
          <div className="border-t border-border p-5">
            <CostChart
              volumeCubicMm={uploadData?.volume_cubic_mm}
              material={material}
              quantity={quantity}
              onMaterialChange={setMaterial}
              onQuantityChange={setQuantity}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
