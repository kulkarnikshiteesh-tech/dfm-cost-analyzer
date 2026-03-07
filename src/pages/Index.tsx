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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b px-6 py-3 font-bold">
        <Box className="h-5 w-5 text-primary" /> CADCheck
      </header>
      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 space-y-6 border-r p-5 lg:w-80 overflow-y-auto">
          <FileUploadZone onUploadSuccess={(res) => setData(res)} />
          
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Material</label>
            <Select value={material} onValueChange={setMaterial}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ABS">ABS</SelectItem><SelectItem value="PC">PC</SelectItem></SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
              <span>Quantity</span><span className="text-primary font-bold">{quantity}</span>
            </div>
            <Slider value={[quantity]} min={100} max={10000} step={100} onValueChange={(v) => setQuantity(v[0])} />
          </div>

          <DFMFeedback
            volumeCubicMm={data?.volume} // Syncs with 'volume' from main.py
            hasUndercuts={data?.has_undercuts}
            undercutMessage={data?.undercut_message}
            material={material}
            quantity={quantity}
            boundingBox={{x:0, y:0, z:0}}
          />
        </aside>

        <main className="flex flex-1 flex-col relative">
          <div className="flex-1 p-4 min-h-[450px]">
            <CADViewer glbUrl={data?.glb_url || null} />
          </div>
          <div className="border-t p-5 bg-background">
            <CostChart
              volumeCubicMm={data?.volume}
              material={material}
              quantity={quantity}
              baseMoldCost={data?.mold_cost} // Syncs with 'mold_cost' from main.py
              basePartCost={data?.part_cost} // Syncs with 'part_cost' from main.py
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
