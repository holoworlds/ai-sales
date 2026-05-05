# Nexus AI Security Specification

## 1. 数据安全性原则
- **身份隔离**: 所有数据项必须包含 `ownerId`，且读写规则必须校验 `request.auth.uid == resource.data.ownerId`。
- **不可篡改字段**: `createdAt` 在创建后禁止修改。
- **系统保留字段**: `projectScore` 和 `stage` 的大幅变动应基于 AI 推理逻辑，避免手动批量注入脏数据。

## 2. 字段级校验 (Data Invariants)
- **Client**: `company` 不能为空，长度不超过 100 字符。
- **Knowledge**: 必须属于 `strategy`, `competitor`, `customer_case`, `industry`, `product` 分类之一。

## 3. 审计日志
- 所有的 `EvolutionProposal`（进化提案）审核状态必须记录在 `agent_logs` 中，不可物理删除。
