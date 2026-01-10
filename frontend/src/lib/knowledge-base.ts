export const MAX_KB_FILE_SIZE = 1 * 1024 * 1024; // 1MB per file
export const MAX_KB_FILES = 5;
export const ACCEPTED_KB_TYPES = [".txt", ".md", ".pdf"];

export interface KbFile {
  file: File;
  name: string;
  size: number;
  type: string;
}

export interface KbValidationResult {
  valid: boolean;
  error?: string;
}

export function validateKbFiles(
  existingFiles: KbFile[],
  newFiles: File[]
): KbValidationResult {
  if (existingFiles.length + newFiles.length > MAX_KB_FILES) {
    return { valid: false, error: `Maximum ${MAX_KB_FILES} knowledge base files allowed` };
  }

  for (const file of newFiles) {
    if (file.size > MAX_KB_FILE_SIZE) {
      return { valid: false, error: `File "${file.name}" exceeds 1MB limit` };
    }

    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_KB_TYPES.includes(ext)) {
      return { valid: false, error: `File "${file.name}" has unsupported format. Use .txt, .md, or .pdf` };
    }
  }

  return { valid: true };
}

export async function uploadKnowledgeBase(
  agentId: string,
  files: File[]
): Promise<{ success: boolean; uploaded?: number; error?: string }> {
  try {
    const formData = new FormData();
    formData.append("agentId", agentId);
    
    for (const file of files) {
      formData.append("files", file);
    }

    const res = await fetch("/api/knowledge-base/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    
    if (!res.ok) {
      return { success: false, error: data.error || "Upload failed" };
    }

    return { success: true, uploaded: data.documentCount };
  } catch (error: any) {
    return { success: false, error: error.message || "Upload failed" };
  }
}
