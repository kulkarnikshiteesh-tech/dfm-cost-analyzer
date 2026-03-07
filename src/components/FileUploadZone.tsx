import { useState } from "react";
import { Upload, Loader2, FileBox, X } from "lucide-react";
import { toast } from "sonner";

const FileUploadZone = ({ onUploadSuccess }: { onUploadSuccess?: (data: any) => void }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const uploadFile = async (selectedFile: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("https://kshiteeshkk-dfm-precision-api.hf.space/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload Failed");
      const data = await res.json();
      
      // Send flat data directly to Index.tsx
      onUploadSuccess?.(data); 
      toast.success("Model processed successfully");
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 border-border">
        <input type="file" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) { setFile(f); uploadFile(f); }
        }} />
        {isUploading ? <Loader2 className="animate-spin text-primary" /> : <Upload className="text-muted-foreground" />}
        <span className="text-xs mt-2">{isUploading ? "Analyzing..." : "Upload STEP"}</span>
      </label>
      {file && (
        <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg text-xs font-medium">
          <FileBox className="h-3 w-3 text-primary" />
          <span className="flex-1 truncate">{file.name}</span>
          <X className="h-3 w-3 cursor-pointer" onClick={() => setFile(null)} />
        </div>
      )}
    </div>
  );
};

export default FileUploadZone;
