import { GoogleGenAI, Type } from "@google/genai";

export { Type };
export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateMarketingReply = async (conversation: string, clientContext: string) => {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Based on the following conversation and client context, generate a high-quality response to advance the B2B partnership.
    
    Client Context: ${clientContext}
    Conversation History: ${conversation}
    
    The response should be professional, insightful, and focused on solving the client's "pain points" or "bottlenecks" (卡点).
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.7,
    }
  });

  return response.text;
};

export const generateContentAsset = async (type: string, clientInfo: string, requirements: string) => {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Generate a B2B marketing ${type} based on the following client information and requirements.
    
    Client Info: ${clientInfo}
    Requirements: ${requirements}
    
    If requested, also generate a 'Prompt' that can be used with other AI tools (like OpenAI) to create more creative content.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text;
};

export const analyzeClientStage = async (interactions: string) => {
  const model = "gemini-3-flash-preview";
  const prompt = `
    你是一个资深的B2B大客户销售专家和战略顾问。请根据以下客户互动内容（聊天、会议纪要等），分析该客户当前处于哪个决策阶段（Phase 0-7）。
    
    【阶段矩阵定义】：
    Phase 0: Status Quo (现状惯性) - 业务照旧，没人提AI，关键问题是“为什么要变？”。角色：行业观察者。关键动作：输出趋势、案例、风险变化。
    Phase 1: Awareness (认知觉醒) - 感觉行业在变，关系不明，关键问题是“这和我有关吗？”。角色：思想领袖。关键动作：分享行业变化。
    Phase 2: Problem Ownership (问题归属) - 意识到问题但无owner，关键问题是“这是不是我们的问题？”。角色：外部推动者。关键动作：帮客户定义问题、量化损失。
    Phase 3: Priority Justification (优先级确认) - 问题存在但资源有限，关键问题是“为什么现在做？”。角色：商业案例构建者。关键动作：制造紧迫感、论证ROI。
    Phase 4: Solution Framing (方案定义) - 决定解决问题但方案未定，关键问题是“怎么做？多大范围？”。角色：联合架构师。关键动作：共创Pilot范围、方案结构。
    Phase 5: Organizational Alignment (组织对齐) - 多部门参与意见不一，关键问题是“大家是否同意？”。角色：交易策划者。关键动作：多线程推进、说服内部决策。
    Phase 6: Commercial Decision (商业决策) - 准备购买，关键问题是“选谁？怎么签？”。角色：可信赖收官者。关键动作：商务谈判、保障排期。
    Phase 7: Proof & Expansion (验证扩展) - 已合作扩规模，关键问题是“值不值得扩大？”。角色：增长伙伴。关键动作：复盘结果、二期路线图。

    【工作流逻辑】：
    - Phase 0-2: 处于“客户培养”阶段。重点是通过行业共识引发兴趣。建议动作应注重节奏感，不宜频繁打扰。
    - Phase 2-7: 处于“组织决策”阶段。重点是根据组织路径生成建议资料。建议动作应具有高度战略针对性。

    互动记录内容：
    ${interactions}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          stage: { type: Type.STRING, enum: ["phase_0", "phase_1", "phase_2", "phase_3", "phase_4", "phase_5", "phase_6", "phase_7"] },
          bottlenecks: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          matrix: {
            type: Type.OBJECT,
            properties: {
              role: { type: Type.STRING },
              keyAction: { type: Type.STRING },
              successSignal: { type: Type.STRING },
              riskSignal: { type: Type.STRING },
              nextTarget: { type: Type.STRING }
            }
          },
          nextActionSuggestion: { type: Type.STRING },
          recommendedFollowupDays: { type: Type.NUMBER },
          reasoning: { type: Type.STRING }
        },
        required: ["stage", "bottlenecks", "suggestions", "matrix", "nextActionSuggestion", "recommendedFollowupDays"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const consultClientStrategy = async (discussion: string, clientContext: string) => {
  const model = "gemini-3-flash-preview";
  const prompt = `
    你是一个顶级的B2B销售教练（Sales Coach）。用户正在向你咨询关于某个具体客户的策略。
    
    客户背景与历史互动：
    ${clientContext}
    
    用户的咨询/讨论内容：
    ${discussion}
    
    请根据讨论内容，给出你的建议，并尝试提取出对客户信息的更新（如果有的话）。
    更新内容应包含：新的现状摘要、可能的阶段变化、或者下一步行动建议的调整。
    
    返回内容必须包含回复话术，以及结构化的更新数据。
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING, description: "给销售的回复内容" },
          suggestedUpdates: {
            type: Type.OBJECT,
            properties: {
              memorySummary: { type: Type.STRING },
              stage: { type: Type.STRING, enum: ["phase_0", "phase_1", "phase_2", "phase_3", "phase_4", "phase_5", "phase_6", "phase_7"] },
              nextActionSuggestion: { type: Type.STRING },
              nextActionDate: { type: Type.STRING, format: "date-time" }
            }
          }
        },
        required: ["reply"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const generateClientJourney = async (product: string, hotTopics: string, clientContext: string) => {
  const model = "gemini-1.5-flash"; // Using a faster model for journey synthesis
  const prompt = `
    你是一个顶级的 B2B 战略销售教练。请基于以下上下文，为销售团队合成一份“认知共感旅程 (GEO - Generative Engine Optimization)”方案。
    
    【核心逻辑指南】
    系统目标：通过自动化客户状态模拟，将客户从 Phase 0 逐步推向 Phase 2。
    
    1. Phase 0：现状惯性 (Status Quo - 客户未意识到问题)
       - 状态：业务照旧，未感知变革，对新技术或方案陌生。关键问题：“为什么要变？”
       - 战术：行业趋势分析、紧迫性风险提示、白皮书/成功案例。
    2. Phase 1：认知觉醒 (Awareness - 感知变化但未关联自身)
       - 状态：注意到行业变化，但在问“这和我有关吗？”
       - 战术：行业对比分析、定制化诊断、引发关联性痛点。
    3. Phase 2：问题归属 (Problem Ownership - 意识到问题但无责任人)
       - 状态：识别到问题，但缺乏行动方案或责任分配。关键问题：“这是不是我们的问题？”
       - 战术：痛点量化案例、明确下一步行动计划、推动建立内部责任人 (Champion)。
 
    用户输入上下文：
    - 推广产品/价值: ${product}
    - 客户背景及互动历史: ${clientContext}
    - 当前行业热点/客户担忧: ${hotTopics}
 
    【任务】
    1. 模拟客户当前最可能的认知阶段 (Phase 0, 1, 或 2)。
    2. 生成总体的战术导图摘要。
    3. 针对每个阶段 (Phase 0, 1, 2) 分别给出具体的：核心策略、建议话术(Scripts)、推荐的辅助内容。
    4. 识别并提取该进程中的成功信号与风险信号。
 
    请严格按照返回模式中的 JSON 格式输出。
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          currentSimulatedStage: { type: Type.STRING, enum: ["Phase 0", "Phase 1", "Phase 2"] },
          summary: { type: Type.STRING, description: "总体战术导图摘要" },
          journeySteps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                step: { type: Type.STRING },
                strategy: { type: Type.STRING },
                scripts: { type: Type.STRING },
                recommendedContent: { type: Type.STRING, description: "建议投喂的文档/报告类型" }
              },
              required: ["step", "strategy", "scripts", "recommendedContent"]
            }
          },
          successSignals: { type: Type.ARRAY, items: { type: Type.STRING } },
          riskSignals: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["currentSimulatedStage", "summary", "journeySteps", "successSignals", "riskSignals"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const queryKnowledgeBase = async (query: string, context: string) => {
  const model = "gemini-1.5-flash";
  const prompt = `你是一个基于内部知识库的战略助手。
  
  【任务指令】
  1. 仅根据提供的【知识库上下文】回答用户的问题。
  2. 如果上下文中没有相关信息，请诚实告知。
  3. **必须**在回答中明确标注信息的出处（对应文档的标题）。
  
  【知识库上下文】
  ${context}
  
  【用户问题】
  ${query}
  
  请提供专业、准确、且带有引用源的回答。`;

  const result = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return result.text || "无法获取大脑响应。";
};

export const extractKnowledgeInsights = async (content: string) => {
  const model = "gemini-1.5-flash";
  const prompt = `你是一个顶级行业分析师。请分析并提炼以下内容的核心洞察。
  返回格式为JSON: 
  { 
    "suggestedTitle": "简短有力的标题", 
    "summary": "提炼的内容摘要", 
    "tags": ["标签1", "标签2"],
    "category": "strategy/competitor/industry/product 选其一" 
  }
  内容: ${content}`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedTitle: { type: Type.STRING },
          summary: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          category: { type: Type.STRING, enum: ["strategy", "competitor", "industry", "product"] }
        },
        required: ["suggestedTitle", "summary", "tags", "category"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};
