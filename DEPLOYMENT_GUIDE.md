# Nexus AI 部署与认知架构指南

## 1. 核心设计哲学
Nexus AI 并不是一个简单的 CRM 或 AI 助手，它是一个具备**自进化能力**的认知型 Agent 系统。其核心逻辑基于：
- **Layer 1-2 (记忆与资产)**: 利用实时对话抓取与结构化沉淀，构建客户的“数字孪生”。
- **Layer 3 (深度推理)**: 基于 Gemini 2.0 驱动的战略决策中心，穿透事实，提供不仅是回答更是行动的建议。
- **Layer 4 & 7 (能力与进化)**: 系统会根据业务反馈自动识别“认知盲点”，并生成/集成新的技能模块。

## 2. Firebase 环境集成
1. **项目初始化**: 在 [Firebase Console](https://console.firebase.google.com/) 创建项目。
2. **数据库服务**: 
   - 启用 **Cloud Firestore**。
   - 采用 `Split Collection` 策略：`/clients` 存储私有客户数据，`/knowledge` 存储全局行业认知。
3. **身份验证**: 启用 **Google Login** 确保操作者身份的不可篡改性（用于技能审计）。
4. **安全准则**: 
   - 运行 `npm run deploy-rules` 定期同步 `firestore.rules`。
   - 严禁在客户端直接修改 `ClientStage` 等核心状态，需通过 Agent 建议后由管理员确认。

## 3. 环境变量与模型配置
- `GEMINI_API_KEY`: 系统的“认知核心”。建议使用 `gemini-1.5-flash` 或更高版本。
- **DeepSeek 支持**: 模型 ID 需设为 `deepseek-chat` 或 `deepseek-reasoner`。

## 4. 系统健壮性与容错
- **AI 响应安全**: 系统已引入安全解析机制。即使 AI 返回非标准 JSON，UI 也不会崩溃。
- **对话流保护**: 互动流渲染已加固。如果 AI 回复失败，系统会显示错误提示，不再会因为渲染错误导致页面刷新并跳回首页。

## 5. 开发建议
- 遵循 `AGENTS.md` 中的元规则，确保代码更改不破坏系统的长期认知逻辑。
- 在 `StrategicAdvisor.tsx` 中测试新技能时，优先使用“LLM 实验室”进行 Prompt 熔炼。
