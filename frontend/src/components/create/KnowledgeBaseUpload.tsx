"use client";

import { FileText, X } from "lucide-react";
import { 
  MAX_KB_FILE_SIZE, 
  MAX_KB_FILES, 
  ACCEPTED_KB_TYPES,
  validateKbFiles,
  type KbFile 
} from "@/lib/knowledge-base";

interface KnowledgeBaseUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  onError: (error: string) => void;
}

export function KnowledgeBaseUpload({ 
  files, 
  onFilesChange, 
  onError 
}: KnowledgeBaseUploadProps) {
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const existingKbFiles: KbFile[] = files.map(f => ({
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
      }));
      
      const validation = validateKbFiles(existingKbFiles, newFiles);
      
      if (!validation.valid) {
        onError(validation.error || "Validation failed");
        return;
      }
      
      onFilesChange([...files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="label">Knowledge Base (Optional)</label>
      <p className="text-xs text-[var(--text-muted)] mb-2">
        Upload files to enhance your agent&apos;s responses with custom knowledge
      </p>
      <div className="mt-2">
        {files.length > 0 && (
          <div className="space-y-2 mb-3">
            {files.map((file, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-2 bg-[var(--bg-tertiary)] rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-[var(--bg-secondary)] rounded"
                >
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              </div>
            ))}
          </div>
        )}
        <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-[var(--border-primary)] border-dashed rounded-lg cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-muted)]">
              Add .txt, .md, or .pdf files
            </span>
          </div>
          <span className="text-xs text-[var(--text-muted)] mt-1">
            Max 1MB per file, up to {MAX_KB_FILES} files
          </span>
          <input 
            type="file" 
            className="hidden" 
            accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
            multiple
            onChange={handleFileSelect}
          />
        </label>
      </div>
    </div>
  );
}
