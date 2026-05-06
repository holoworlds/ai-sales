
import { GoogleGenAI } from "@google/genai";
import { localDb } from "./storage";
import { LLMProvider, LLMConfig } from "../types";

const getActiveConfig = async (): Promise<LLMConfig | null> => {
  const configs = await localDb.getAll('llmConfigs');
  const found = configs.find((c: LLMConfig) => c.isPrimary && c.status === 'Active') || configs[0];
  
  if (found) return found;

  // If no config found, return a default for Gemini
  return {
    id: 'default-gemini',
    provider: LLMProvider.GOOGLE,
    modelId: 'gemini-3-flash-preview',
    displayName: 'Gemini (System Default)',
    apiKey: (process.env as any).GEMINI_API_KEY || '', 
    isPrimary: true,
    status: 'Active',
    createdAt: new Date().toISOString()
  } as any;
};

export const getActiveModel = async () => {
    const config = await getActiveConfig();
    return config ? config.modelId : "gemini-3-flash-preview";
};

export const callLLM = async (prompt: string, options: { json?: boolean, systemInstruction?: string } = {}) => {
  const config = await getActiveConfig();
  
  if (!config) {
    throw new Error('未配置有效的模型');
  }

  if (config.provider === LLMProvider.GOOGLE) {
    const apiKey = config.apiKey || (process.env as any).GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('未找到有效的 Google Gemini API Key');
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Use the correct pattern: ai.models.generateContent
    const response = await ai.models.generateContent({
      model: config.modelId || 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: options.systemInstruction,
        responseMimeType: options.json ? 'application/json' : undefined
      }
    });

    return response.text;
  } else {
    // OpenAI Compatible APIs (OpenAI, Deepseek, Kimi, etc.)
    const baseUrl = config.baseUrl || 
        (config.provider === LLMProvider.OPENAI ? 'https://api.openai.com/v1' : 
         config.provider === LLMProvider.DEEPSEEK ? 'https://api.deepseek.com' :
         config.provider === LLMProvider.KIMI ? 'https://api.moonshot.cn/v1' : '');

    if (!baseUrl) throw new Error(`未指定供应商 ${config.provider} 的 Base URL`);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.modelId,
        messages: [
          ...(options.systemInstruction ? [{ role: 'system', content: options.systemInstruction }] : []),
          { role: 'user', content: prompt }
        ],
        response_format: options.json ? { type: "json_object" } : undefined
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || '请求 LLM 失败');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
};
