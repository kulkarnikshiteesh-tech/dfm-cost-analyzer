import { useState, useCallback } from "react";
import { Upload, FileBox, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Updated to match the high-precision backend response structure
export interface UploadResponse {
  volume_cubic_mm: number;
  glb_url: string;
  has_undercuts: boolean;
  optimal_axis: string;
  undercut_message: string;
  mold_cost_inr: number;
  per_piece_cost: number;
  wall_thickness_ok: boolean;
  draft_angle_ok: boolean;
  fits_mold_ok: boolean;
  // This helps keep compatibility if other components still look for 'analysis'
  analysis?: any; 
}

interface FileUploadZoneProps {
  onUploadSuccess?: (data: UploadResponse) => void;
}

const FileUploadZone = ({ onUploadSuccess }: FileUploadZoneProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (selectedFile: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("https://kshiteeshkk-dfm-precision-api.hf.space/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const rawData = await response.json();
      
      // DATA NORMALIZATION:
      // This maps the 'flat' backend response into the 'analysis' object 
      // your other UI components are likely expecting.
      const formattedData: UploadResponse = {
        ...rawData,
        analysis: {
          volume_cubic_mm: rawData.volume_cubic_mm,
          undercut_message: rawData.undercut_message,
          mold_cost_inr: rawData.mold_cost_inr,
          has_undercuts: rawData.has_undercuts,
          per_piece_cost: rawData.per_piece_cost,
          wall_thickness_ok: rawData.wall_thickness_ok,
          draft_angle_ok: rawData.draft_angle_ok,
          fits_mold_ok: rawData.fits_mold_ok
        }
      };
      
      console.log('Processed API response:', formattedData);
      onUploadSuccess?.(formattedData);
      toast.success("Model processed successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast.error("Upload failed", { description: message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.toLowerCase().endsWith(".step") || dropped?.name.toLowerCase().endsWith(".stp")) {
      setFile(dropped);
      uploadFile(dropped);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      uploadFile(selected);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Upload STEP File
      </h3>
      <motion.label
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50"
        } ${isUploading ? "pointer-events-none opacity-70" : ""}`}
        whileHover={isUploading ? {} : { scale: 1.01 }}
        whileTap={isUploading ? {} : { scale: 0.99 }}
      >
        <input
          type="file"
          accept=".step,.stp"
          onChange={handleFileSelect}
          className="sr-only"
          disabled={isUploading}
        />
        {isUploading ? (
          <>
            <Loader2 className="mb-2 h-6 w-6 animate-spin text-primary" />
            <span className="text-sm font-medium text-primary">
              Analyzing Geometry...
            </span>
            <span className="mt-2 text-xs text-muted-foreground text-center leading-relaxed max-w-[200px]">
              Our 16GB Vector Engine is processing your STEP file. This may take a moment.
            </span>
          </>
        ) : (
          <>
            <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Drop .step file here
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              or click to browse
            </span>
          </>
        )}
      </motion.label>

      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2"
          >
            <FileBox className="h-4 w-4 text-primary" />
            <span className="flex-1 truncate text-sm font-medium">{file.name}</span>
            <button
              onClick={() => setFile(null)}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              disabled={isUploading}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUploadZone;
