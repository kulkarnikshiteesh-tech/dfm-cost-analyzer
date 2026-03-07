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
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
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
        <span className="text-sm text-muted-foreground">DFM Analysis Tool</span>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 space-y-6 border-b border-border p-5 lg:w-80 lg:border-b-0 lg:border-r overflow-y-auto max-h-[calc(100vh-60px)]">
          
          <FileUploadZone onUploadSuccess={setUploadData} />
          
          <ProcessSelector />

          {/* RESTORED: Material Selection */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Layers className="h-3.5 w-3.5" /> Material Selection
            </label>
            <Select value={material} onValueChange={setMaterial}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Select Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ABS">ABS (General Purpose)</SelectItem>
                <SelectItem value="PC">Polycarbonate (High Strength)</SelectItem>
                <SelectItem value="Nylon">Nylon 6 (Wear Resistant)</SelectItem>
                <SelectItem value="PP">Polypropylene (Chemical Resistant)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* RESTORED: Quantity Slider */}
          <div className="space-y-4">
            <div className="flex justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ListOrdered className="h-3.5 w-3.5" /> Production Volume
              </label>
              <span className="text-xs font-bold text-primary">{quantity.toLocaleString()} units</span>
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
            boundingBox={uploadData?.bounding_box_mm}
            material={material}
            quantity={quantity}
            hasUndercuts={uploadData?.has_undercuts}
            undercutSeverity={uploadData?.has_undercuts ? "High" : "None"} 
            undercutMessage={uploadData?.undercut_message}
          />
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 bg-muted/10 relative" style={{ minHeight: "450px" }}>
            <div className="absolute top-4 left-4 z-10">
               <div className="flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-[10px] font-medium backdrop-blur-sm border border-border">
                  <div className={`h-2 w-2 rounded-full ${glbUrl ? 'bg-green-500' : 'bg-slate-300'}`} />
                  {glbUrl ? "3D Preview Active" : "Waiting for Upload"}
               </div>
            </div>
            <CADViewer glbUrl={glbUrl} />
          </div>
          
          <div className="border-t border-border bg-background p-5">
            <CostChart
              volumeCubicMm={uploadData?.volume_cubic_mm}
              boundingBox={uploadData?.bounding_box_mm}
              material={material}
              quantity={quantity}
              onMaterialChange={setMaterial}
              onQuantityChange={setQuantity}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
