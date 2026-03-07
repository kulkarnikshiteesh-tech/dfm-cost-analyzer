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

  const uploadFile = async (selectedFile: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("https://kshiteeshkk-dfm-precision-api.hf.space/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(`Upload failed`);

      const rawData = await response.json();
      console.log('API Sync Check:', rawData);
      
      // Send the clean, flat data directly to Index.tsx
      onUploadSuccess?.(rawData);
      toast.success("Model processed successfully");
    } catch (error) {
      toast.error("Upload failed");
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
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Upload STEP File
      </h3>
      <motion.label
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-primary/40"
        } ${isUploading ? "pointer-events-none opacity-70" : ""}`}
      >
        <input type="file" accept=".step,.stp" onChange={handleFileSelect} className="sr-only" disabled={isUploading} />
        {isUploading ? (
          <>
            <Loader2 className="mb-2 h-6 w-6 animate-spin text-primary" />
            <span className="text-sm font-medium text-primary">Analyzing Geometry...</span>
          </>
        ) : (
          <>
            <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium">Drop .step here</span>
          </>
        )}
      </motion.label>

      <AnimatePresence>
        {file && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
            <FileBox className="h-4 w-4 text-primary" />
            <span className="flex-1 truncate text-xs font-medium">{file.name}</span>
            <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// THIS IS THE CORRECT PLACEMENT - AT THE BOTTOM, OUTSIDE THE COMPONENT
export default FileUploadZone;
