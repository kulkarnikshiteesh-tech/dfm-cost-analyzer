import { useState } from "react";
import { Box, Layers, ListOrdered } from "lucide-react";
import FileUploadZone from "@/components/FileUploadZone";
import DFMFeedback from "@/components/DFMFeedback";
import CADViewer from "@/components/CADViewer";
import CostChart from "@/components/CostChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const Index = () => {
  const [data, setData] = useState<any>(null);
  const [material, setMaterial] = useState("ABS");
  const [quantity, setQuantity] = useState(1000);

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      <header className="flex items-center gap-3 border-b px-6 py-3 font-black text-xs uppercase tracking-[0.2em] bg-background">
        <Box className="h-5 w-5 text-primary" /> CADCheck Analysis
      </header>
      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 space-y-6 border-r p-5 lg:w-80 overflow-y-auto">
          <FileUploadZone onUploadSuccess={(res) => setData(res)} />
          
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Material</label>
            <Select value={material} onValueChange={setMaterial}>
              <SelectTrigger className="font-bold"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ABS">ABS (General Purpose)</SelectItem>
                <SelectItem value="PC">PC (Polycarbonate)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground tracking-widest">
              <span>Quantity</span><span className="text-primary font-bold tabular-nums">{quantity}</span>
            </div>
            <Slider value={[quantity]} min={100} max={10000} step={100} onValueChange={(v) => setQuantity(v[0])} />
          </div>

          <DFMFeedback
            volumeCubicMm={data?.volume_cubic_mm}
            hasUndercuts={data?.has_undercuts}
            undercutMessage={data?.undercut_message}
            material={material}
            quantity={quantity}
            bounding_box_mm={{x: 0, y: 0, z: 0}}
          />
        </aside>

        <main className="flex flex-1 flex-col relative bg-muted/5">
          <div className="flex-1 p-4 min-h-[450px]">
            <CADViewer glbUrl={data?.glb_url || null} />
          </div>
          <div className="border-t p-5 bg-background">
            <CostChart
              volumeCubicMm={data?.volume_cubic_mm}
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
