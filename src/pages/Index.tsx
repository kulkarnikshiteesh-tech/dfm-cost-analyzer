import { useState, useEffect } from "react";
import { Box, Layers, ListOrdered } from "lucide-react";
import FileUploadZone, { type UploadResponse } from "@/components/FileUploadZone";
import DFMFeedback from "@/components/DFMFeedback";
import ProcessSelector from "@/components/ProcessSelector";
import CADViewer from "@/components/CADViewer";
import CostChart from "@/components/CostChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const Index = () => {
  const [uploadData, setUploadData] = useState<any>(null); // Flexible type to prevent crashes
  const [material, setMaterial] = useState("ABS");
  const [quantity, setQuantity] = useState(1000);

  // Debugging: Check console to see exactly what the backend sent
  useEffect(() => {
    if (uploadData) console.log("Backend Response:", uploadData);
  }, [uploadData]);

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
          
          <FileUploadZone onUploadSuccess={(data) => {
            console.log("Upload Success Data:", data);
            setUploadData(data);
          }} />
          
          <div className="space-y-3 pt-4 border-t border-border">
             <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2">
               <Layers className="h-3 w-3" /> Material
             </label>
             <Select value={material} onValueChange={setMaterial}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABS">ABS</SelectItem>
                  <SelectItem value="PC">PC</SelectItem>
                </SelectContent>
             </Select>
          </div>

          <div className="space-y-3">
             <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2">
               <ListOrdered className="h-3 w-3" /> Quantity: {quantity}
             </label>
             <Slider value={[quantity]} min={100} max={10000} step={100} onValueChange={(v) => setQuantity(v[0])} />
          </div>

          <DFMFeedback
            volumeCubicMm={uploadData?.volume_cubic_mm}
            boundingBox={uploadData?.bounding_box_mm || {x:0, y:0, z:0}} // Default to zero if missing
            material={material}
            quantity={quantity}
            hasUndercuts={uploadData?.has_undercuts}
            undercutMessage={uploadData?.undercut_message}
          />
        </aside>

        <main className="flex flex-1 flex-col bg-muted/5">
          <div className="flex-1 relative min-h-[500px]">
            {glbUrl ? (
              <CADViewer glbUrl={glbUrl} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                Upload a STEP file to view 3D model
              </div>
            )}
          </div>
          
          <div className="border-t border-border p-6 bg-background">
            <CostChart
              volumeCubicMm={uploadData?.volume_cubic_mm}
              material={material}
              quantity={quantity}
              // Map the backend's direct cost values
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
