import { useState } from "react";
import { Box, Layers, ListOrdered, ChevronRight } from "lucide-react";
import FileUploadZone from "@/components/FileUploadZone";
import DFMFeedback from "@/components/DFMFeedback";
import ProcessSelector from "@/components/ProcessSelector";
import CADViewer from "@/components/CADViewer";
import CostChart from "@/components/CostChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const Index = () => {
  // 'data' holds the synchronized backend response: volume, has_undercuts, etc.
  const [data, setData] = useState<any>(null);
  const [material, setMaterial] = useState("ABS");
  const [quantity, setQuantity] = useState(1000);

  // The glbUrl is null until the upload succeeds, keeping your rotating cube active
  const glbUrl = data?.glb_url || null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header Section */}
      <header className="flex items-center gap-3 border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Box className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">CADCheck</span>
        </div>
        <div className="h-4 w-[1px] bg-border mx-2" />
        <span className="text-sm text-muted-foreground font-medium">DFM Analysis Tool</span>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Sidebar: Controls and Feedback */}
        <aside className="w-full shrink-0 space-y-6 border-b border-border p-5 lg:w-80 lg:border-b-0 lg:border-r overflow-y-auto max-h-[calc(100vh-57px)]">
          
          <FileUploadZone onUploadSuccess={(res) => {
            console.log("Sync Check - Received from Backend:", res);
            setData(res);
          }} />
          
          <ProcessSelector />

          {/* Material Selection: Connected to CostChart */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Layers className="h-3 w-3" /> Material Selection
            </label>
            <Select value={material} onValueChange={setMaterial}>
              <SelectTrigger className="w-full bg-background border-border/60">
                <SelectValue placeholder="Select Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ABS">ABS (General Purpose)</SelectItem>
                <SelectItem value="PC">Polycarbonate (High Strength)</SelectItem>
                <SelectItem value="Nylon">Nylon 6 (Self-Lubricating)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quantity Slider: Connected to CostChart */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <ListOrdered className="h-3 w-3" /> Production Volume
              </label>
              <span className="text-[11px] font-bold text-primary tabular-nums">
                {quantity.toLocaleString()} units
              </span>
            </div>
            <Slider 
              value={[quantity]} 
              min={100} 
              max={10000} 
              step={100} 
              onValueChange={(val) => setQuantity(val[0])}
              className="py-2"
            />
          </div>

          {/* Feedback Section: Maps Backend keys to Props */}
          <DFMFeedback
            volumeCubicMm={data?.volume}
            boundingBox={{x: 0, y: 0, z: 0}}
            material={material}
            quantity={quantity}
            hasUndercuts={data?.has_undercuts}
            undercutMessage={data?.undercut_message}
          />
        </aside>

        {/* Main Content: 3D Viewer and Cost Graph */}
        <main className="flex flex-1 flex-col bg-muted/5">
          <div className="flex-1 relative min-h-[450px]">
            <CADViewer glbUrl={glbUrl} />
          </div>
          
          <div className="border-t border-border p-6 bg-background">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                Manufacturing Cost Projection <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </h3>
            </div>
            
            <CostChart
              volumeCubicMm={data?.volume}
              material={material}
              quantity={quantity}
              baseMoldCost={data?.mold_cost}
              basePartCost={data?.part_cost}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
