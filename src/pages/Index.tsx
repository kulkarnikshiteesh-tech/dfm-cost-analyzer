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
        <span className="text-sm text-muted-foreground ml-auto">DFM Analysis Tool</span>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 space-y-6 border-b border-border p-5 lg:w-80 lg:border-b-0 lg:border-r overflow-y-auto">
          
          <FileUploadZone onUploadSuccess={(data) => {
            console.log("Mapping Backend Data:", data);
            setUploadData(data);
          }} />
          
          <ProcessSelector />

          {/* Material Control */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Layers className="h-3 w-3" /> Material Selection
            </label>
            <Select value={material} onValueChange={setMaterial}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Select Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ABS">ABS (General Purpose)</SelectItem>
                <SelectItem value="PC">Polycarbonate</SelectItem>
                <SelectItem value="Nylon">Nylon 6</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Production Volume Control */}
          <div className="space-y-4">
            <div className="flex justify-between">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <ListOrdered className="h-3 w-3" /> Production Volume
              </label>
              <span className="text-[10px] font-bold text-primary">{quantity.toLocaleString()} units</span>
            </div>
            <Slider 
              value={[quantity]} 
              min={100} 
              max={50000} 
              step={100} 
              onValueChange={(val) => setQuantity(val[0])}
              className="py-2"
            />
          </div>

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
          <div className="flex-1 p-4 bg-muted/5 relative" style={{ minHeight: "450px" }}>
            <CADViewer glbUrl={glbUrl} />
          </div>
          
          <div className="border-t border-border p-5 bg-background">
            <CostChart
              volumeCubicMm={uploadData?.volume_cubic_mm}
              material={material}
              quantity={quantity}
              onMaterialChange={setMaterial}
              onQuantityChange={setQuantity}
              // Inject the precise backend costs into your chart
              baseMoldCost={uploadData?.mold_cost_inr}
              basePartCost={uploadData?.per_piece_cost}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
