import { useState } from "react";
import { Box } from "lucide-react";
import FileUploadZone from "@/components/FileUploadZone";
import DFMFeedback from "@/components/DFMFeedback";
import CADViewer from "@/components/CADViewer";
import CostChart from "@/components/CostChart";

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

          <DFMFeedback
            volumeCubicMm={data?.volume_cubic_mm}
            boundingBox={data?.bounding_box_mm ?? null}
            hasUndercuts={data?.has_undercuts}
            undercutSeverity={data?.undercut_severity}
            undercutMessage={data?.undercut_message}
            material={material}
            quantity={quantity}
          />
        </aside>

        <main className="flex flex-1 flex-col relative bg-muted/5">
          <div className="flex-1 p-4 min-h-[450px]">
            <CADViewer glbUrl={data?.glb_url || null} />
          </div>
          <div className="border-t p-5 bg-background">
            <CostChart
              volumeCubicMm={data?.volume_cubic_mm}
              boundingBox={data?.bounding_box_mm ?? null}
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
