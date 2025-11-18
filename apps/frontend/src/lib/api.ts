import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001",
  timeout: 30000,
});

export const uploadFile = async (file: File): Promise<string> => {
  const form = new FormData();
  form.append("file", file);

  const res = await api.post("/upload/extract", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data.text;
};

export const generateSuite = async (input: string, url?: string) => {
  const res = await api.post("/generate/test-suite", { 
    input, 
    url,
    outputTypes: [] 
  });
  
  return res.data;
};

export const refineSuite = async (existingOutput: any, refinementPrompt: string) => {
  const res = await api.post("/generate/refine", {
    existingOutput,
    refinementPrompt,
  });

  return res.data;
};

export const healthCheck = async () => {
  const res = await api.get("/system/health");
  return res.data;
};
