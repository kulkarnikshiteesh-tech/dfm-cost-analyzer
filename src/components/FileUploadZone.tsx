import { useState, useCallback } from "react";
import { Upload, FileBox, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface FileUploadZoneProps {
  onUploadSuccess?: (data: any) => void;
}

const FileUploadZone = ({ onUploadSuccess }: FileUploadZoneProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [analysis, setAnalysis] = useState<any>(null);
const uploadFile = async (selectedFile: File) => {
  setIsUploading(true);
  try {
    const formData = new FormData();
    formData.append("file", selectedFile);
    
    const response = await fetch("https://threed-backend-4v3g.onrender.com/upload", {  // Your working backend URL
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (data.glb_url && data.glb_url.startsWith("/static/")) {
  data.glb_url = "https://threed-backend-4v3g.onrender.com" + data.glb_url;
}
    console.log("API DATA:", data);
    
    setAnalysis(data);
    if (onUploadSuccess) onUploadSuccess(data);
    
  } catch (error) {
    console.error("Upload Error:", error);
    toast.error("Upload failed: " + error.message);
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
    } else {
      toast.error("Please upload a valid .step or .stp file");
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
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Step 1: Upload Geometry
      </h3>
      <motion.label
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all ${
          isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50"
        } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
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
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
            <span className="text-sm font-bold text-primary animate-pulse italic">
              Analyzing DFM...
            </span>
          </>
        ) : (
          <>
            <div className="mb-3 rounded-full bg-background p-3 shadow-sm">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <span className="text-sm font-bold tracking-tight">Drop .step here</span>
            <span className="text-[10px] text-muted-foreground mt-1 uppercase font-medium">
              or click to browse
            </span>
          </>
        )}
      </motion.label>

      <AnimatePresence>
        {file && !isUploading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
              <FileBox className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-xs font-bold uppercase tracking-tight font-mono">
                {file.name}
              </span>
              <span className="text-[9px] text-muted-foreground uppercase font-semibold">
                Verified File Ready
              </span>
            </div>
            <button 
              onClick={() => setFile(null)} 
              className="rounded-full p-1 hover:bg-background transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-red-500" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUploadZone;
