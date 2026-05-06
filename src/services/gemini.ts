
import { localDb } from "./storage";
import { callLLM, getActiveModel as getActiveModelId } from "./llm";

export const getActiveModel = getActiveModelId;

export const generateMarketingReply = async (conversation: string, clientContext: string) => {
  const prompt = `
    Based on the following conversation and client context, generate a high-quality response to advance the B2B partnership.
    
    Client Context: ${clientContext}
    Conversation History: ${conversation}
    
    The response should be professional, insightful, and focused on solving the client's "pain points" or "bottlenecks" (卡点).
  `;

  return await callLLM(prompt);
};

export const generateContentAsset = async (type: string, clientInfo: string, requirements: string) => {
  const prompt = `
    Generate a B2B marketing ${type} based on the following client information and requirements.
    
    Client Info: ${clientInfo}
    Requirements: ${requirements}
    
    If requested, also generate a 'Prompt' that can be used with other AI tools (like OpenAI) to create more creative content.
  `;

  return await callLLM(prompt);
};

export const analyzeClientStage = async (interactions: string) => {
  const prompt = `
    你是一个资深的B2B大客户销售专家和战略顾问。请根据提供的客户互动历史和项目情报（Briefings），深度审计该客户的项目状态。
    
    【阶段矩阵定义】：
    Phase 0: Status Quo (现状惯性) - 业务照旧，没人提AI，关键问题是“为什么要变？”。角色：行业观察者。
    Phase 1: Awareness (认知觉醒) - 感觉行业在变，关系不明，关键问题是“这和我有关吗？”。角色：思想领袖。
    Phase 2: Problem Ownership (问题归属) - 意识到问题但无owner，关键问题是“这是不是我们的问题？”。角色：外部推动者。
    Phase 3: Priority Justification (优先级确认) - 问题存在但资源有限，关键问题是“为什么现在做？”。角色：商业案例构建者。
    Phase 4: Solution Framing (方案定义) - 决定解决问题但方案未定，关键问题是“怎么做？多大范围？”。角色：联合架构师。
    Phase 5: Organizational Alignment (组织对齐) - 多部门参与意见不一，关键问题是“大家是否同意？”。角色：交易策划者。
    Phase 6: Commercial Decision (商业决策) - 准备购买，关键问题是“选谁？怎么签？”。角色：可信赖收官者。
    Phase 7: Proof & Expansion (验证扩展) - 已合作扩规模，关键问题是“值不值得扩大？”。角色：增长伙伴。

    请严格返回如下 JSON 格式：
    {
      "stage": "phase_0 到 phase_7 之一",
      "bottlenecks": ["瓶颈1", "瓶颈2"],
      "suggestions": ["建议1", "建议2"],
      "matrix": {
        "role": "你的角色",
        "keyAction": "关键动作",
        "successSignal": "成功信号",
        "riskSignal": "风险信号",
        "nextTarget": "下一步目标"
      },
      "nextActionSuggestion": "下一步行动的具体建议",
      "recommendedFollowupDays": 7,
      "reasoning": "为什么得出这个结论的逻辑分析",
      "extractedFields": {
        "promoter": "推动人",
        "promoterDept": "部门",
        "keyPerson": "关键决策人",
        "groupMeeting": "是否开过组会",
        "interestedProducts": "感兴趣产品",
        "budgetScale": "预算规模",
        "resistancePoint": "阻力点",
        "missingMaterials": "缺失资料",
        "progress": "当前进展"
      },
      "scoreDetails": {
        "strategicValue": 0-40,
        "feasibility": 0-40,
        "progress": 0-20,
        "total": 0-100
      }
    }

    互动记录内容：
    ${interactions}
  `;

  const response = await callLLM(prompt, { json: true });
  return typeof response === 'string' ? JSON.parse(response) : response;
};

export const consultClientStrategy = async (discussion: string, clientContext: string) => {
  const prompt = `
    你是一个顶级的B2B销售教练（Sales Coach）。用户正在向你咨询关于某个具体客户的策略。
    
    客户背景与历史互动：
    ${clientContext}
    
    用户的咨询/讨论内容：
    ${discussion}
    
    返回 JSON 结构：
    {
      "reply": "给销售的回复内容",
      "suggestedUpdates": {
        "memorySummary": "记忆摘要更新",
        "stage": "phase_0 到 phase_7"
      }
    }
  `;

  const response = await callLLM(prompt, { json: true });
  return typeof response === 'string' ? JSON.parse(response) : response;
};

export const generateIntegratedStrategicInsight = async (
  product: any,
  customerMessage: string
) => {
  const prompt = `
    你是一个顶级的 B2B 战略专家。分析产品信息和客户发言，并生成客户旅程。
    产品：${JSON.stringify(product)}
    发言：${customerMessage}
    
    返回 JSON 结构：
    {
      "currentAnalysis": { "stage": "状态X", "intent": "意图", "objective": "目标", "strategy": "策略", "suggestedScript": "话术" },
      "fullJourney": [ { "stage": "状态1", "definingTraits": "特征", "psychology": "心理", "objective": "目标", "strategy": "策略", "suggestedScript": "话术" } ]
    }
  `;

  const response = await callLLM(prompt, { json: true });
  return typeof response === 'string' ? JSON.parse(response) : response;
};

export const getStrategicAdvice = async (query: string, context: any) => {
  const prompt = `
    你是一个顶级战略副总裁和销售教练。
    客户状态：${JSON.stringify(context.clients)}
    知识库：${JSON.stringify(context.knowledge)}
    指令：${query}
    
    返回 JSON：{"analysis": "深度分析", "recommendations": ["建议1", "建议2"], "priorityClient": "最关注客户", "fullResponse": "完整对话文本"}
  `;

  const response = await callLLM(prompt, { json: true });
  return typeof response === 'string' ? JSON.parse(response) : response;
};

export const queryKnowledgeBase = async (query: string, context: string) => {
  const prompt = `你是一个基于内部知识库的战略助手。上下文：${context}。问题：${query}`;
  return await callLLM(prompt);
};

export const extractKnowledgeInsights = async (content: string) => {
  const prompt = `请分析并提炼以下内容的核心洞察。
  返回 JSON: { "suggestedTitle": "标题", "summary": "摘要", "tags": ["标签"], "category": "分类" }
  内容: ${content}`;

  const response = await callLLM(prompt, { json: true });
  return typeof response === 'string' ? JSON.parse(response) : response;
};

export const performStrategicAgentReasoning = async (queryText: string, context: any) => {
  const prompt = `你是一个复合型 Agent 系统。指令：${queryText}。上下文：${JSON.stringify(context)}
  返回 JSON：{ "analysis": "分析", "decision": "决策", "recommendedAction": "建议", "generatedMessage": "消息", "usedSkills": [], "confidence": 0.9, "suggestedSystemAction": { "type": "UPDATE_CLIENT", "data": {}, "reasoning": "理由" } }`;

  const response = await callLLM(prompt, { json: true });
  return typeof response === 'string' ? JSON.parse(response) : response;
};

export const generateStrategicPrompt = async (requirements: string, context?: any) => {
  const prompt = `你是一个资深的 Prompt 工程师。请根据以下需求和提供的参考资料上下文，编写一个可以最大化激发大模型（如 GPT-4 或 Gemini）能力的专业 Prompt：
  需求：${requirements}
  参考上下文：${JSON.stringify(context)}`;
  return await callLLM(prompt);
};

export const generateClientJourney = async (clientInfo: any, interactions?: any, knowledge?: any) => {
  const prompt = `分析该客户并生成客户旅程图（B2B）：
  客户：${JSON.stringify(clientInfo)}
  互动：${JSON.stringify(interactions)}
  知识：${JSON.stringify(knowledge)}`;
  return await callLLM(prompt, { json: true });
};

export const generateMeetingIntelligence = async (interactions: any, clientContext?: any) => {
  const prompt = `从互动历史中提取会议情报。
  互动：${JSON.stringify(interactions)}
  背景：${JSON.stringify(clientContext)}`;
  return await callLLM(prompt, { json: true });
};

export const evolveAgentCapability = async (proposal: any, existingSkills: any) => {
   const prompt = `根据提案执行能力进化。提案：${JSON.stringify(proposal)}。现有能力：${JSON.stringify(existingSkills)}`;
   const res = await callLLM(prompt, { json: true });
   return typeof res === 'string' ? JSON.parse(res) : res;
};

export const evaluateEvolutionProposal = async (userInput: any) => {
  const prompt = `评估改进提案：${JSON.stringify(userInput)}
  返回 JSON: { "isAccepted": true, "evaluation": "评价", "refinedProposal": {}, "tags": [] }`;

  const response = await callLLM(prompt, { json: true });
  return typeof response === 'string' ? JSON.parse(response) : response;
};
