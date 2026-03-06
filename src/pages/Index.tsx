import { useState } from "react";
import { Box } from "lucide-react";
import FileUploadZone, { type UploadResponse } from "@/components/FileUploadZone";
import DFMFeedback from "@/components/DFMFeedback";
import ProcessSelector from "@/components/ProcessSelector";
import CADViewer from "@/components/CADViewer";
import CostChart from "@/components/CostChart";

const Index = () => {
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [material, setMaterial] = useState("ABS");
  const [quantity, setQuantity] = useState(1000);

  // FIX: The backend now returns the full absolute URL. 
  // We no longer need to prefix it with API_BASE.
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
        <aside className="w-full shrink-0 space-y-6 border-b border-border p-5 lg:w-80 lg:border-b-0 lg:border-r">
          {/* Ensure this component hits your Render URL */}
          <FileUploadZone onUploadSuccess={setUploadData} />
          
          <ProcessSelector />
          
          <DFMFeedback
            volumeCubicMm={uploadData?.volume_cubic_mm}
            boundingBox={uploadData?.bounding_box_mm}
            material={material}
            quantity={quantity}
            hasUndercuts={uploadData?.has_undercuts}
            // If backend sends 'optimal_axis', we can use it, else default to 'severity'
            undercutSeverity={uploadData?.undercut_severity || "Medium"} 
            undercutMessage={uploadData?.undercut_message}
          />
        </aside>

        <div className="flex flex-1 flex-col">
          <div className="flex-1 p-4" style={{ minHeight: "400px" }}>
            {/* The CADViewer will now receive a clean, working URL */}
            <CADViewer glbUrl={glbUrl} />
          </div>
          
          <div className="border-t border-border p-5">
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
