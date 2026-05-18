
import { GoogleGenAI } from "@google/genai";
import { localDb } from "./storage";
import { LLMProvider, LLMConfig } from "../types";

const getActiveConfig = async (): Promise<LLMConfig | null> => {
  try {
    const configs = await localDb.getAll('llm_configs');
    const found = configs.find((c: LLMConfig) => c.isPrimary && c.status === 'Active') || configs[0];
    
    if (found) return found;
  } catch (error) {
    console.error('[LLM] Failed to fetch config from localDb:', error);
  }

  // If no config found or error occurs, return a default for Gemini
  return {
    id: 'default-gemini',
    provider: LLMProvider.GOOGLE,
    modelId: 'gemini-2.0-flash-exp',
    displayName: 'Gemini 2.0 Flash (Default)',
    apiKey: (process.env as any).GEMINI_API_KEY || '', 
    isPrimary: true,
    status: 'Active',
    createdAt: new Date().toISOString()
  } as any;
};

export const getActiveModel = async () => {
  try {
    const config = await getActiveConfig();
    return config ? config.modelId : "gemini-2.0-flash-exp";
  } catch (error) {
    console.error('[LLM] getActiveModel Error:', error);
    return "gemini-2.0-flash-exp";
  }
};

const cleanUrl = (url: string) => {
  if (!url) return '';
  return url.replace(/\/+$/, '');
};

export const sanitizeAIContent = (text: string): string => {
  if (!text) return '';
  // Avoid heavy-handed sanitization if it looks like JSON or if it's meant to be parsed
  // We'll just do minimal escaping for UI safety
  return text
    .replace(/\b(eval|Function|setInterval|setTimeout)\b/ig, '_$1_')
    .trim();
};

export const callLLM = async (prompt: string, options: { json?: boolean, systemInstruction?: string } = {}) => {
  try {
    const config = await getActiveConfig();
    
    if (!config) {
      throw new Error('未配置有效的模型');
    }

    const byteSize = new Blob([prompt]).size;
    const originalLen = prompt.length;
    
    // TRUNCATION LOGIC (Requested for 413 diagnosis)
    let finalPrompt = prompt;
    const MAX_LEN = 40000; // Let's try 40k chars as a limit
    if (finalPrompt.length > MAX_LEN) {
      console.warn(`[LLM] Prompt truncated from ${originalLen} to ${MAX_LEN} chars`);
      finalPrompt = finalPrompt.substring(0, MAX_LEN) + "\n... (Content truncated for length) ...";
    }

    console.log(`🔍 [callLLM] Request URL: /api/llm`);
    console.log(`[LLM Request Check]
      - Provider: ${config.provider}
      - Model: ${config.modelId}
      - Prompt Length: ${originalLen} chars
      - Truncated Length: ${finalPrompt.length} chars
      - Approx Bytes: ${byteSize}
      - Body Size: ${JSON.stringify({
        provider: config.provider,
        modelId: config.modelId,
        apiKey: '***',
        baseUrl: config.baseUrl,
        prompt: finalPrompt,
        options
      }).length} bytes
      - Options: ${JSON.stringify(options)}
    `);

    const response = await fetch('/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: config.provider,
        modelId: config.modelId,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        prompt: finalPrompt,
        options
      })
    }).catch(err => {
      throw new Error(`无法连接到后端代理: ${err.message || String(err)}`);
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData.message || `后端服务响应异常 (${response.status})`;
      throw new Error(msg);
    }

    const data = await response.json();
    const content = data.content || '';
    
    // Only sanitize if not expecting JSON
    return options.json ? content : sanitizeAIContent(content);
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error('[LLM] callLLM total failure:', errorMsg);
    throw error;
  }
};
