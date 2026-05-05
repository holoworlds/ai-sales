# Nexus AI 部署指南 (Deployment Guide)

## 1. Firebase 集成步骤
1. 在 [Firebase Console](https://console.firebase.google.com/) 创建项目。
2. 启用 **Firestore Database** 并选择云区域。
3. 启用 **Google Authentication**。
4. 运行 `npm run deploy-rules` 同步 `firestore.rules`。

## 2. 环境变量配置
在 `.env` 文件中配置以下变量：
- `GEMINI_API_KEY`: 驱动 Layer 3/7 认知引擎的核心密钥。

## 3. 生产环境优化
- 启用 `onSnapshot` 监听时的 `includeMetadataChanges: false` 以减少不必要的重绘。
- 使用 `firebase-blueprint.json` 中的结构作为所有数据导入的唯一标准。
