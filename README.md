# Nexus AI 认知进化与记忆系统 (Nexus AI Cognitive Evolution & Memory System)

Nexus AI 是一个基于认知科学和自进化逻辑构建的下一代智能 Agent 框架。它不仅是一个对话接口，更是一个具备“长期记忆”、“动态战略规划”和“自主技能进化”能力的数字认知实体。

## 🌟 核心特性

*   **全栈本地化存储**: 采用 Server-side 存储方案，所有数据持久化在本地 `/data` 目录（JSON格式），确保数据隐私与快速响应，规避了浏览器 IndexedDB 的不稳定性。
*   **智能认知模型**: 实现了从“事实记忆”到“战略决策”再到“技能进化”的四层进化架构。
*   **Gemini 深度驱动**: 集成最新一代 Google Gemini 模型，通过服务端代理请求，完美支持 2.0 Flash / 3.0 Preview 以及智能 JSON 模式。
*   **资产与记忆协同**: 自动生成客户“记忆摘要”，使 AI 在每次互动中都能基于历史背景进行深度推理。

## 🚀 系统架构：四层认知模型

项目采用了递归式的认知架构，确保 AI 能够从历史互动中学习并不断改进自身：

1.  **事实记忆层 (Memory System)**
    *   **知识库 (Knowledge Base)**: 将上传的文档、数据表格碎裂为神经节点。
2.  **关系记忆层 (Relation & Assets)**
    *   **客户交互记录**: 追踪与每个客户的每一次互动。
    *   **记忆摘要 (Memory Summary)**: 自动生成客户特征画像，确保 AI 具备“历史连贯性”。
3.  **认知决策层 (Decision Center)**
    *   **战略雷达**: 根据客户所处的阶段（ClientStage）匹配最佳行动方案。
4.  **自主进化层 (Evolution & Skills)**
    *   **技能注册表 (AgentSkill)**: 模块化的能力集合。
    *   **进化提案 (EvolutionProposal)**: 当 AI 识别到现有能力边界时，自动生成优化建议。

## 🏗️ 核心业务流 (Business Flow)

### 1. 新建档案 (Initialization)
在 `Client Assets` 页面，您可以“初始化战略档案”。此时需填写“组织名称”及**“推动人 (Promoter)”**。系统将默认从 `Phase 0: 现状惯性` 阶段启动。

### 2. 同步战略审计 (Strategic Audit)
每次与客户互动后，点击“同步战略审计”，系统将：
*   自动抓取互动中的关键事实。
*   根据决策模型（Phase 0-7）重新评估客户所处阶段。
*   计算项目得分，并给出下一步行动建议。

### 3. 资产实验室 (Asset Lab)
基于客户画像和记忆摘要，一键生成演示文稿、研究报告或针对性的营销建议话术。

## 🛠️ 技术实现

*   **前端 (Client)**: React 19 + Vite + Tailwind CSS + Lucide Icons。使用 `src/services/storage.ts` 与服务端同步。
*   **后端 (Server)**: Express + `tsx`。提供数据 CRUD API 和 LLM 转发代理。
*   **数据持久化**: 所有实体（Client, Knowledge, Skill, Evolution）均存储在项目根目录的 `data/` 下。

## 📦 快速开始

### 1. 密钥配置

在 AI Studio 的环境变量中配置 `GEMINI_API_KEY`。系统会自动通过服务端的 `process.env` 读取并用于所有 AI 推理逻辑。

### 2. 运行项目

运行命令启动全栈开发预览：
```bash
npm run dev
```

## 📂 项目关键文件

*   `AGENTS.md`: **系统的“灵魂”**。记录了设计哲学、元规则和自进化逻辑。
*   `server.ts`: 全栈路由中心，处理数据持久化逻辑。
*   `src/services/llm.ts`: 统一 AI 调度接口，通过服务端转发避开前端跨域及密钥暴露风险。
*   `/data`: 核心数据库目录，包含所有业务实体的 JSON 文件。

## 🧠 进化逻辑

系统的“记忆”不仅是数据的存储，更是逻辑的沉淀。每一次成功的客户转化或失败的抗拒点拆解，都会被记录在 `Client Assets` 中。AI 会周期性地分析这些数据，提出 `EvolutionProposal`。这些提案一旦被采纳，将直接转化为新的 `AgentSkill` 节点。

---

*“不仅仅是工具，更是会进化的伙伴。”*
