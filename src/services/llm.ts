
import { GoogleGenAI } from "@google/genai";
import { localDb } from "./storage";
import { LLMProvider, LLMConfig } from "../types";

const getActiveConfig = async (): Promise<LLMConfig | null> => {
  try {
    const configs = await localDb.getAll('llmConfigs');
    const found = configs.find((c: LLMConfig) => c.isPrimary && c.status === 'Active') || configs[0];
    
    if (found) return found;
  } catch (error) {
    console.error('[LLM] Failed to fetch config from localDb:', error);
  }

  // If no config found or error occurs, return a default for Gemini
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
  try {
    const config = await getActiveConfig();
    return config ? config.modelId : "gemini-3-flash-preview";
  } catch (error) {
    console.error('[LLM] getActiveModel Error:', error);
    return "gemini-3-flash-preview";
  }
};

const cleanUrl = (url: string) => {
  if (!url) return '';
  return url.replace(/\/+$/, '');
};

export const sanitizeAIContent = (text: string): string => {
  if (!text) return '';
  // Remove or replace characters that might trigger SES security errors
  return text
    .replace(/\b(eval|Function|setInterval|setTimeout)\b/ig, '_$1_')
    .replace(/[`$]/g, '') // Remove backticks and dollar signs to avoid template literal / variable injection issues
    .replace(/[{}()\[\]]/g, (m) => ` ${m} `) // Add spaces around brackets to break potential code execution patterns
    .trim();
};

export const callLLM = async (prompt: string, options: { json?: boolean, systemInstruction?: string } = {}) => {
  try {
    const config = await getActiveConfig();
    
    if (!config) {
      throw new Error('未配置有效的模型');
    }

    console.log(`[LLM] Calling ${config.provider} with model ${config.modelId}`);

    let resultText = '';

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
        if (typeof (response as any).text === 'function') {
          resultText = (response as any).text();
        } else if (typeof response.text === 'string') {
          resultText = response.text;
        } else if ((response as any).response?.text) {
          resultText = (response as any).response.text();
        }

        if (!resultText) {
          console.warn('[LLM] Gemini returned empty response', response);
          resultText = '';
        }
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

      const endpoint = `${baseUrl}/chat/completions`;
      console.log(`[LLM] Requesting ${endpoint}`);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey || ''}`
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
        }).catch(err => {
          throw new Error(`网络连接失败: ${err.message}`);
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => 'Unknown error reply');
          let errJson: any = { error: { message: response.statusText } };
          try {
            errJson = JSON.parse(errText);
          } catch (e) {
            console.warn('[LLM] Could not parse error response as JSON');
          }
          console.error('[LLM] HTTP Error:', response.status, errJson);
          throw new Error(errJson.error?.message || `请求 LLM 失败 (${response.status})`);
        }

        const data = await response.json().catch(err => {
          console.error('[LLM] JSON Parse Error:', err);
          throw new Error('模型返回了无效的响应格式。');
        });

        if (!data.choices?.[0]?.message?.content) {
          console.warn('[LLM] Provider returned empty content', data);
          resultText = '';
        } else {
          resultText = data.choices[0].message.content;
        }
      } catch (error) {
        console.error(`[LLM] ${config.provider} Error:`, error);
        throw error;
      }
    }

    return sanitizeAIContent(resultText);
  } catch (error) {
    console.error('[LLM] callLLM total failure:', error);
    // Returning an empty or safe response instead of letting it reject unhandled
    return "";
  }
};
