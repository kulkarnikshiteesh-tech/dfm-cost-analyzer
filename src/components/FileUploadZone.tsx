import { useState, useCallback } from "react";
import { Upload, FileBox, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export interface UploadResponse {
  volume_cubic_mm: number;
  bounding_box_mm: { x: number; y: number; z: number };
  glb_url: string;
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

      const response = await fetch("https://threed-backend-4v3g.onrender.com/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const data: UploadResponse = await response.json();
      console.log('API response:', data);
      onUploadSuccess?.(data);
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
    if (dropped?.name.endsWith(".step") || dropped?.name.endsWith(".stp")) {
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
              Processing 3D Model...
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
