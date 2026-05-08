
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

const cleanUrl = (url: string) => {
  if (!url) return '';
  return url.replace(/\/+$/, '');
};

export const callLLM = async (prompt: string, options: { json?: boolean, systemInstruction?: string } = {}) => {
  const config = await getActiveConfig();
  
  if (!config) {
    throw new Error('未配置有效的模型');
  }

  console.log(`[LLM] Calling ${config.provider} with model ${config.modelId}`);

  if (config.provider === LLMProvider.GOOGLE) {
    const apiKey = config.apiKey || (process.env as any).GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('未找到有效的 Google Gemini API Key');
    }

    try {
      const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
      
      const response = await ai.models.generateContent({
        model: config.modelId || 'gemini-1.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: options.systemInstruction,
          responseMimeType: options.json ? 'application/json' : undefined
        }
      });

      // Newer GenAI SDK might return nested text or response object
      let text = '';
      if (typeof (response as any).text === 'function') {
        text = (response as any).text();
      } else if (typeof response.text === 'string') {
        text = response.text;
      } else if ((response as any).response?.text) {
        text = (response as any).response.text();
      }

      if (!text) {
        console.warn('[LLM] Gemini returned empty response', response);
        return '';
      }

      return text;
    } catch (error) {
      console.error('[LLM] Gemini Error:', error);
      throw error;
    }
  } else {
    // OpenAI Compatible APIs (OpenAI, Deepseek, Kimi, etc.)
    const baseUrl = cleanUrl(config.baseUrl) || 
        (config.provider === LLMProvider.OPENAI ? 'https://api.openai.com/v1' : 
         config.provider === LLMProvider.DEEPSEEK ? 'https://api.deepseek.com' :
         config.provider === LLMProvider.KIMI ? 'https://api.moonshot.cn/v1' : '');

    if (!baseUrl) throw new Error(`未指定供应商 ${config.provider} 的 Base URL`);

    // Ensure Deepseek uses /v1 if needed or just handle it gracefully
    // Note: Official Deepseek is https://api.deepseek.com
    const endpoint = `${baseUrl}/chat/completions`;
    console.log(`[LLM] Requesting ${endpoint}`);

    try {
      const response = await fetch(endpoint, {
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
          response_format: options.json ? { type: "json_object" } : undefined,
          temperature: 0.7,
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
        console.error('[LLM] HTTP Error:', response.status, err);
        throw new Error(err.error?.message || `请求 LLM 失败 (${response.status})`);
      }

      const data = await response.json();
      if (!data.choices?.[0]?.message?.content) {
        console.warn('[LLM] Provider returned empty content', data);
        return '';
      }
      return data.choices[0].message.content;
    } catch (error) {
      console.error(`[LLM] ${config.provider} Error:`, error);
      throw error;
    }
  }
};
