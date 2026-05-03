# 战略 CRM 系统本地化部署指南

本指南将教你如何在本地环境中运行此系统，并配置 AI API。

## 1. 硬件与环境要求
- **Node.js**: 建议版本 18.0.0 或更高。
- **Git**: 用于代码拉取。
- **Firebase 账号**: 用于托管数据库和身份验证。

## 2. 克隆与安装
首先，将项目下载到本地：
```bash
git clone <your-repository-url>
cd <project-folder>
npm install
```

## 3. 链接 AI API (Gemini)
本系统使用 Google 的 Gemini AI。你需要获取一个 API Key。

1. **获取 API Key**: 访问 [Google AI Studio](https://aistudio.google.com/) 并创建一个免费的 API Key。
2. **本地配置**: 在项目根目录下，如果还没有 `.env` 文件，请创建一个，并填充以下内容：
   ```env
   GEMINI_API_KEY=你的_GEMINI_API_秘钥
   ```
   *注意：在本地开发环境下，Vite 会自动读取该变量。*

## 4. 链接数据库 (Firebase)
系统依赖 Firebase 进行数据同步。

1. **创建 Firebase 项目**: 在 [Firebase Console](https://console.firebase.google.com/) 创建新项目。
2. **启用服务**:
   - **Authentication**: 启用 Google 登录。
   - **Firestore Database**: 创建数据库（生产模式或测试模式均可）。
3. **获取配置组件**: 
   - 在 Firebase 项目设置中添加一个 "Web App"。
   - 复制生成的 `firebaseConfig` 对象。
4. **注入配置**:
   - 找到项目中的 `src/services/firebase-applet-config.json`（如果存在）或直接修改 `src/services/firebase.ts`。
   - 确保你的 Firebase 配置正确配置在对应的环境变量或配置文件中。

## 5. 启动系统
在终端运行以下命令：
```bash
npm run dev
```
系统通常会运行在 `http://localhost:3000`。

## 6. 构建生产版本
如果你想部署到服务器：
```bash
npm run build
```
这会生成一个 `dist` 文件夹，你可以使用 Nginx 或任何静态托管平台（如 Vercel, Firebase Hosting）来托管这些文件。

---

**关键代码位置：**
- **AI 逻辑**: `src/services/gemini.ts` - 所有的 AI 提示词和模型配置都在这里。
- **数据库逻辑**: `src/services/firebase.ts` - 负责数据连接。
- **安全规则**: `firestore.rules` - 部署到 Firebase 前务必检查该文件的安全设置。
