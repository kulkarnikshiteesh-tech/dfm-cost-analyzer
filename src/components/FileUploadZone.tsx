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
    
    // SYNCED: Send the data exactly as it comes from the API
    onUploadSuccess?.(rawData); 
    toast.success("Model processed successfully");
  } catch (error) {
    toast.error("Upload failed");
  } finally {
    setIsUploading(false);
  }// ... keep all your existing imports and logic exactly the same ...

const FileUploadZone = ({ onUploadSuccess }: FileUploadZoneProps) => {
  // ... your existing component code ...
};

// ADD THIS LINE AT THE BOTTOM
export default FileUploadZone;
};
