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

      const response = await fetch("import.meta.env.VITE_API_URL", {
        method: "POST",
        body: formData,
      });

      if (response.status === 422) {
        const errData = await response.json();
        const titles: Record<string, string> = {
          assembly: "⚠️ Assembly detected",
          not_moldable: "⚠️ Not injection moldable",
          geometry_error: "⚠️ Geometry error",
        };
        const title = titles[errData.error] || "⚠️ Upload issue";
        toast.error(`${title} — ${errData.message}`, { duration: 8000 });
        setFile(null);
        setIsUploading(false);
        return;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.glb_url && data.glb_url.startsWith("/static/")) {
        data.glb_url = "https://threed-backend-4v3g.onrender.com" + data.glb_url;
      }

      if (onUploadSuccess) onUploadSuccess(data);
    } catch (error: any) {
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
    if (
      dropped?.name.toLowerCase().endsWith(".step") ||
      dropped?.name.toLowerCase().endsWith(".stp")
    ) {
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
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#9a9a9e]">
        Upload Geometry
      </h3>

      <motion.label
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all ${
          isDragging
            ? "border-[#3b6bca] bg-[#eef2fc] scale-[1.02]"
            : "border-[#d8d5d0] bg-[#f5f4f0] hover:border-[#3b6bca]/50 hover:bg-[#eef2fc]/40"
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
            <Loader2 className="mb-2 h-7 w-7 animate-spin text-[#3b6bca]" />
            <span className="text-sm font-bold text-[#3b6bca] animate-pulse">Analyzing DFM…</span>
          </>
        ) : (
          <>
            <div className="mb-2 rounded-full bg-white p-2.5 shadow-sm border border-[#e8e5e0]">
              <Upload className="h-5 w-5 text-[#3b6bca]" />
            </div>
            <span className="text-sm font-bold text-[#1a1a1c] tracking-tight">Drop .step here</span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-[#9a9a9e]">
              or click to browse
            </span>
          </>
        )}
      </motion.label>

      <AnimatePresence>
        {file && !isUploading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 rounded-lg border border-[#c8ddf8] bg-[#eef2fc] px-3 py-2.5"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#3b6bca]/10">
              <FileBox className="h-4 w-4 text-[#3b6bca]" />
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-xs font-bold uppercase tracking-tight font-mono text-[#1a1a1c]">
                {file.name}
              </span>
              <span className="text-[9px] font-semibold uppercase text-[#6a9fd8]">
                Verified · Ready
              </span>
            </div>
            <button
              onClick={() => setFile(null)}
              className="rounded-full p-1 hover:bg-white/60 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-[#9a9a9e] hover:text-red-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUploadZone;
