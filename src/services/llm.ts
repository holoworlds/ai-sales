
import { GoogleGenAI } from "@google/genai";
import { localDb } from "./storage";
import { LLMProvider, LLMConfig } from "../types";

const getActiveConfig = async (): Promise<LLMConfig | null> => {
  const configs = await localDb.getAll('llmConfigs');
  const found = configs.find((c: LLMConfig) => c.isPrimary && c.status === 'Active') || configs[0];
  
  if (found) return found;

  // Fallback to platform Gemini key if available
  // In this environment, we should try to use the provided key
  const platformKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (platformKey) {
    return {
      id: 'default-gemini',
      provider: LLMProvider.GOOGLE,
      modelId: 'gemini-2.0-flash',
      displayName: 'Gemini (Default)',
      apiKey: platformKey,
      isPrimary: true,
      status: 'Active',
      createdAt: new Date().toISOString()
    } as any;
  }

  return null;
};

export const getActiveModel = async () => {
    const config = await getActiveConfig();
    return config ? config.modelId : "gemini-2.0-flash";
};

export const callLLM = async (prompt: string, options: { json?: boolean, systemInstruction?: string } = {}) => {
  const config = await getActiveConfig();
  
  if (!config) {
    throw new Error('未配置有效的模型。请在管理界面配置模型。');
  }

  if (config.provider === LLMProvider.GOOGLE) {
    const genAI = new (GoogleGenAI as any)(config.apiKey);
    const model = genAI.getGenerativeModel({ 
        model: config.modelId,
        systemInstruction: options.systemInstruction
    });
    
    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: options.json ? { responseMimeType: "application/json" } : undefined
    });
    
    return result.response.text();
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
