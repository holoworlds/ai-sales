import { GoogleGenAI, Type } from "@google/genai";

export { Type };
export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateMarketingReply = async (conversation: string, clientContext: string) => {
  const model = "gemini-2.0-flash";
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
  const model = "gemini-2.0-flash";
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
  const model = "gemini-2.0-flash";
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
          reasoning: { type: Type.STRING },
          extractedFields: {
            type: Type.OBJECT,
            properties: {
              promoter: { type: Type.STRING },
              promoterDept: { type: Type.STRING },
              keyPerson: { type: Type.STRING },
              groupMeeting: { type: Type.STRING },
              interestedProducts: { type: Type.STRING },
              budgetScale: { type: Type.STRING },
              resistancePoint: { type: Type.STRING },
              missingMaterials: { type: Type.STRING },
              progress: { type: Type.STRING }
            }
          },
          scoreDetails: {
            type: Type.OBJECT,
            properties: {
              strategicValue: { type: Type.NUMBER, description: "Max 40. 评估产品阶段、疾病复杂度、组织成熟度等" },
              feasibility: { type: Type.NUMBER, description: "Max 40. 评估客户温度、内部推动人、预算、决策路径" },
              progress: { type: Type.NUMBER, description: "Max 20. 评估当前阶段、关系深度" },
              total: { type: Type.NUMBER },
              breakdown: { type: Type.OBJECT, description: "详细项得分映射" }
            }
          }
        },
        required: ["stage", "bottlenecks", "suggestions", "matrix", "nextActionSuggestion", "recommendedFollowupDays", "scoreDetails"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const consultClientStrategy = async (discussion: string, clientContext: string) => {
  const model = "gemini-2.0-flash";
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
  const model = "gemini-2.0-flash"; // Using a faster model for journey synthesis
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

export const getStrategicAdvice = async (query: string, context: { clients: string, knowledge: string }) => {
  const model = "gemini-2.0-flash";
  const prompt = `你是一个顶级战略副总裁和销售教练。你的任务是根据提供的实时上下文，回答用户的战略咨询。
  
  【已知事实：当前客户状态】
  ${context.clients}
  
  【已知事实：知识库摘要】
  ${context.knowledge}
  
  【用户指令】
  ${query}
  
  【要求】
  1. 必须基于已知的客户和知识库事实。
  2. 自动分析并识别出当前最急需处理的节点。
  3. 提供具体的“下一步行动建议”。
  4. 保持敏锐、实战、且极其专业。
  5. 以 JSON 格式返回，包含：{"analysis": "深度分析", "recommendations": ["建议1", "建议2"], "priorityClient": "最值得关注的客户(如有)", "fullResponse": "完整的对话文本"}`;

  const result = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });

  return JSON.parse(result.text || "{}");
};

export const queryKnowledgeBase = async (query: string, context: string) => {
  const model = "gemini-2.0-flash";
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
  const model = "gemini-2.0-flash";
  const prompt = `你是一个顶级行业分析师。请分析并提炼以下内容的核心洞察。
  返回格式为JSON: 
  { 
    "suggestedTitle": "简短有力的标题", 
    "summary": "提炼的内容摘要", 
    "tags": ["标签1", "标签2"],
    "category": "strategy/competitor/industry/product/customer_case 选其一" 
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
          category: { type: Type.STRING, enum: ["strategy", "competitor", "industry", "product", "customer_case"] }
        },
        required: ["suggestedTitle", "summary", "tags", "category"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const performStrategicAgentReasoning = async (
  queryText: string, 
  context: { clients: any[], knowledge: any[], skills: any[] }
) => {
  const model = "gemini-2.0-flash";
  
  const prompt = `
    你是一个集成了记忆系统、认知模型和能力系统的“认知型Agent系统”。
    
    【Layer 1: 记忆系统 (Memory System)】
    当前客户画像与状态 (Clients): 
    ${JSON.stringify(context.clients.map(c => ({ id: c.id, company: c.company, stage: c.stage, memorySummary: c.memorySummary })))}
    
    【Layer 2: 知识库 (Knowledge Base)】
    摘要: ${JSON.stringify(context.knowledge.map(k => ({ title: k.title, category: k.category })))}
    
    【Layer 4: 能力系统 (Skill System)】
    可用Skills: ${JSON.stringify(context.skills.map(s => ({ name: s.name, type: s.type, description: s.description })))}
    
    【用户指令】
    ${queryText}
    
    【决策流程要求】
    1. 识别客户：确定用户是指向特定客户还是全盘战略。
    2. 认知判断：基于Phase 0-7模型判断相关客户当前的真实阶段。
    3. 卡点分析：识别阻碍客户进入下一阶段的卡点。
    4. Skill匹配：从Layer 4中选择最合适的Skills组合。
    5. 执行建议：生成高质量的互动话术或行动建议。
    
    请严格返回如下 JSON 格式：
    {
      "analysis": "深度认知分析",
      "decision": "核心决策逻辑说明",
      "recommendedAction": "具体的下一步行动建议",
      "generatedMessage": "建议发送给客户的消息/邮件内容（如有必要）",
      "usedSkills": ["命中的Skill名称1", "命中的Skill名称2"],
      "confidence": 0.8,
      "suggestedSystemAction": {
        "type": "CREATE_CLIENT | UPDATE_CLIENT | ADD_KNOWLEDGE",
        "data": { 
          "id": "如果为更新操作，必须包含对应的 ID",
          "company": "新公司名称",
          "stage": "phase_1",
          "phaseDescription": "为什么判定处于该阶段的详细理由",
          "memorySummary": "项目背景摘要",
          "interestedProducts": "感兴趣的产品（如：AI平台、算力中心）",
          "promotingDepartment": "内部推动部门（如：信息科、战略部）",
          "projectScore": 85,
          "budgetScale": "预算规模（如：50-100w，仅Phase 4及以后必填）"
        },
        "reasoning": "为什么要执行此操作"
      }
    }
    
    【特别注意】
    1. 如果你发现用户提到一个新联系人或新公司，请建议 CREATE_CLIENT。
    2. 如果你发现已有项目的阶段发生了变化（例如完成了一次会议或收到反馈），请建议 UPDATE_CLIENT 并包含该项目的 ID。
    3. 对于 CREATE_CLIENT/UPDATE_CLIENT，请务必尝试从互动内容中“自动读取并确认”：感兴趣的产品、推动部门、项目评分（1-100，基于客户质量评价模型：需求匹配度、决策链完整度、预算可能性等）。
    4. 进入到 Phase 4 (Solution Framing) 后，必须尝试识别并填写“预算规模”。
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });

  return JSON.parse(response.text || "{}");
};

export const evaluateEvolutionProposal = async (userInput: { name: string, description: string, goal: string }) => {
  const model = "gemini-2.0-flash";
  const prompt = `
    你是一个高级系统架构师和认知引擎专家。
    用户手动提出了一个系统“进化提案”（Evolution Proposal）。
    
    你的任务是：
    1. 学习用户的意图（name, description, goal）。
    2. 评价该提案是否符合当前“战略认知系统”的需求。
    3. 如果提案不完整（缺失逻辑、缺失边界条件），请根据你的认知进行“补全”。
    4. 如果提案完全没用或存在严重冲突，可以拒绝，但优先尝试补全。

    用户输入:
    名称: ${userInput.name}
    描述: ${userInput.description}
    目标: ${userInput.goal}

    请严格返回如下 JSON 结构:
    {
        "isAccepted": boolean,
        "evaluation": "评价内容 (由系统对用户输入进行评估的结果)",
        "refinedProposal": {
            "suggestedSkillName": "补全后的名称",
            "suggestedSkillDescription": "补全后的详细描述",
            "suggestedSkillLogic": "补全后的逻辑标识符（英文下划线格式，如: industry_compliance_check）",
            "problem": "该能力解决的具体痛点",
            "missingCapability": "该能力弥补的系统空缺"
        },
        "tags": ["特征标签1", "补全标签"]
    }
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });

  return JSON.parse(response.text || "{}");
};

export const evolveAgentCapability = async (
  performanceLogs: any[],
  currentSkills: any[]
) => {
  const model = "gemini-2.0-flash";
  const prompt = `
    你是一个 Agent 系统改进引擎 (Evolution Engine)。
    请分析以下性能日志和现有技能，识别系统能力缺口。
    
    【历史性能日志 (Layer 6: Feedback System)】
    ${JSON.stringify(performanceLogs)}
    
    【当前所有技能 (Layer 4: Skill System)】
    ${JSON.stringify(currentSkills.map(s => ({ name: s.name, description: s.description })))}
    
    // 省略部分 prompt 描述
    请严格返回如下 JSON 格式：
    {
      "problem": "观察到的核心问题",
      "rootCause": "深度根因分析",
      "missingCapability": "系统缺失的具体能力描述",
      "suggestedSkillName": "建议新增的Skill名称",
      "suggestedSkillDescription": "该Skill的详细功能描述",
      "suggestedSkillLogic": "该Skill内部应该使用的 prompt 逻辑参考"
    }
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });

  return JSON.parse(response.text || "{}");
};
