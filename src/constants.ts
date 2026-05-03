import { ClientStage } from "./types";

export const PHASE_MATRIX: Record<ClientStage, {
  label: string;
  decisionState: string;
  internalStatus: string;
  keyQuestion: string;
  yourRole: string;
  keyAction: string;
  successSignal: string;
  riskSignal: string;
  nextTarget: string;
  orgAction: string;
}> = {
  phase_0: {
    label: 'Phase 0: 现状惯性',
    decisionState: 'Status Quo',
    internalStatus: '业务照旧，没人主动提AI',
    keyQuestion: '为什么要变？',
    yourRole: '行业观察者',
    keyAction: '输出趋势、案例、风险变化',
    successSignal: '客户开始关注你内容',
    riskSignal: '已读不回、无兴趣',
    nextTarget: '进入认知阶段',
    orgAction: '感兴趣了解'
  },
  phase_1: {
    label: 'Phase 1: 认知觉醒',
    decisionState: 'Awareness',
    internalStatus: '感觉行业在变，但与自己关系不明',
    keyQuestion: '这和我有关吗？',
    yourRole: '思想领袖',
    keyAction: '分享未被共识洞察、行业变化',
    successSignal: '主动问你：这个怎么做？',
    riskSignal: '只觉得热闹',
    nextTarget: '进入问题阶段',
    orgAction: '调研与问题判断'
  },
  phase_2: {
    label: 'Phase 2: 问题归属',
    decisionState: 'Problem Ownership',
    internalStatus: '意识到问题，但未形成owner',
    keyQuestion: '这是不是我们的问题？谁负责？',
    yourRole: '外部推动者',
    keyAction: '帮客户定义问题、量化损失、识别矛盾点',
    successSignal: '客户开始用你的语言描述问题',
    riskSignal: '兴趣高但无人推进',
    nextTarget: '形成内部owner',
    orgAction: '明确推动人及推动路径'
  },
  phase_3: {
    label: 'Phase 3: 优先级确认',
    decisionState: 'Priority Justification',
    internalStatus: '问题存在，但资源有限',
    keyQuestion: '为什么现在做，而不是以后？',
    yourRole: '商业案例构建者',
    keyAction: '制造紧迫感、ROI逻辑、竞品对标、窗口期论证',
    successSignal: '客户开始谈时间点/年度计划',
    riskSignal: '一直说以后再看',
    nextTarget: '项目列入优先级',
    orgAction: '争取资源，立项'
  },
  phase_4: {
    label: 'Phase 4: 方案定义',
    decisionState: 'Solution Framing',
    internalStatus: '决定解决问题，但方案未定',
    keyQuestion: '自建/外包？做多大？',
    yourRole: '联合架构师',
    keyAction: '共创pilot scope、方案结构、风险拆解',
    successSignal: '客户问细节、范围、案例',
    riskSignal: '同时找多家比价无结构',
    nextTarget: '方案倾向你',
    orgAction: 'POC或pilot验证'
  },
  phase_5: {
    label: 'Phase 5: 组织对齐',
    decisionState: 'Organizational Alignment',
    internalStatus: '多部门参与，意见不一致',
    keyQuestion: 'IT/采购/老板是否同意？',
    yourRole: '交易策划者',
    keyAction: '多线程推进、组织地图经营、帮内部说服',
    successSignal: '引荐更多决策者进场',
    riskSignal: 'champion失联、反复拉扯',
    nextTarget: '达成一致',
    orgAction: 'Bidding或汇报'
  },
  phase_6: {
    label: 'Phase 6: 商业决策',
    decisionState: 'Commercial Decision',
    internalStatus: '已准备购买',
    keyQuestion: '选谁、怎么签、何时上',
    yourRole: '可信赖的收官者',
    keyAction: '商务谈判、合同路径、排期保障',
    successSignal: '谈PO、法务、上线时间',
    riskSignal: '被拖延、突然沉默',
    nextTarget: '成交',
    orgAction: '确定合作方式及PO'
  },
  phase_7: {
    label: 'Phase 7: 验证扩展',
    decisionState: 'Proof & Expansion',
    internalStatus: '已合作，评估效果',
    keyQuestion: '值不值得继续扩大？',
    yourRole: '增长伙伴',
    keyAction: '复盘结果、二期路线图、扩部门复制',
    successSignal: '客户主动谈下一期',
    riskSignal: '项目做完即沉默',
    nextTarget: '扩单/长期合作',
    orgAction: '是否能扩大合作范围'
  }
};
