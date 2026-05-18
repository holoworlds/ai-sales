export type ClientStage = 
  | 'phase_0' // Status Quo
  | 'phase_1' // Awareness
  | 'phase_2' // Problem Ownership
  | 'phase_3' // Priority Justification
  | 'phase_4' // Solution Framing
  | 'phase_5' // Organizational Alignment
  | 'phase_6' // Commercial Decision
  | 'phase_7'; // Proof & Expansion

export enum LLMProvider {
  GOOGLE = 'Google',
  OPENAI = 'OpenAI',
  DEEPSEEK = 'Deepseek',
  KIMI = 'Kimi',
  CUSTOM = 'Custom'
}

export interface Client {
  id: string;
  name: string;
  company: string;
  industry?: string;
  stage: ClientStage;
  phaseDescription?: string;
  memorySummary?: string;
  nextActionDate?: any;
  nextActionSuggestion?: string;
  nextActionCompleted?: boolean;
  promoter?: string;
  promoterDept?: string;
  keyPerson?: string;
  groupMeeting?: string;
  interestedProducts?: string;
  product?: string;
  budgetScale?: string;
  scale?: string;
  projectScore?: number;
  scoreDetails?: {
    strategicValue: number;
    feasibility: number;
    progress: number;
    breakdown: Record<string, number>;
  };
  resistancePoint?: string;
  missingMaterials?: string;
  progress?: string;
  decisionMatrix?: {
    role: string;
    keyAction: string;
    successSignal: string;
    riskSignal: string;
    nextTarget: string;
  };
  manualScoreDetails?: {
    strategicValue?: boolean;
    feasibility?: boolean;
    progress?: boolean;
  };
  isStageManual?: boolean;
  ownerId: string;
  createdAt: any;
  updatedAt: any;
}

export interface Interaction {
  id: string;
  clientId: string;
  type: 'chat' | 'email' | 'meeting' | 'call' | 'note';
  content: string;
  aiReplySuggestion?: string;
  feedback?: string;
  timestamp: any;
  authorId: string;
  processed?: boolean;
  replyToId?: string;
}

export interface ContentAsset {
  id: string;
  clientId: string;
  title: string;
  type: 'PPT' | 'Report' | 'Strategy' | 'Prompt' | 'Journey' | 'Briefing';
  body: string;
  rawInput?: string;
  briefingData?: {
    summary: string;
    keyUpdates: string[];
    risks: Array<{ risk: string; impact: string }>;
    opportunities: string[];
    nextActions: Array<{ who: string; what: string; when: string }>;
    resourceRequests: Array<{ resource: string; reason: string }>;
    stakeholderMapping: {
      currentLandscape: string[];
      competitorAnalysis?: {
        competitorName: string;
        theirStrengths: string[];
        theirRisks: string[];
      };
    };
    winningStrategy: string;
    strategicImplication: string;
  };
  ownerId: string;
  createdAt: any;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  sourceType: 'document' | 'feedback' | 'market_report' | 'word' | 'ppt' | 'excel' | 'pdf' | 'markdown';
  tags: string[];
  ownerId: string;
  category: 'strategy' | 'competitor' | 'industry' | 'product' | 'customer_case';
  createdAt: any;
  updatedAt: any;
}

export interface AgentSkill {
  id: string;
  name: string;
  type: 'analysis' | 'generation' | 'strategy' | 'evolved';
  description: string;
  logic: string; // The prompt template or logic
  performanceScore: number;
  applicablePhases: ClientStage[];
  usageCount: number;
  ownerId: string;
  createdAt: any;
}

export interface Product {
  id: string;
  name: string;
  industry: string;
  coreValue: string;
  targetUser: string;
  usageScenario: string;
  ownerId: string;
  createdAt: any;
}

export interface AgentInteraction {
  id: string;
  clientId?: string; // Optional if global
  query: string;
  type: 'reasoning' | 'lab';
  result: {
    analysis: string;
    decision?: string;
    recommendedAction?: string;
    generatedMessage?: string;
    usedSkills?: string[];
    confidence?: number;
    labResult?: string;
    labType?: string;
  };
  feedback?: {
    score: number; // -2 to +2
    comment?: string;
  };
  timestamp: any;
  ownerId: string;
  createdAt: any;
}

export interface LLMConfig {
  id: string;
  provider: LLMProvider | string;
  modelId: string;
  displayName: string;
  apiKey: string;
  baseUrl?: string;
  isPrimary: boolean;
  status: 'Active' | 'Inactive' | 'Error';
  latency?: number;
  ownerId: string;
  createdAt: any;
  updatedAt?: any;
}

export interface EvolutionProposal {
  id: string;
  problem: string;
  rootCause: string;
  missingCapability: string;
  suggestedSkillName: string;
  suggestedSkillDescription: string;
  suggestedSkillLogic: string;
  evaluation?: string;
  isManual?: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
  ownerId: string;
  createdAt: any;
}

export interface JourneyLog {
  id: string;
  productId: string;
  productName: string;
  customerMessage: string;
  insight: any;
  ownerId: string;
  timestamp: any;
}

export interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  componentStack?: string;
  route?: string;
  view?: string;
  state?: any;
  lastClickEvent?: {
    tag: string;
    id: string;
    className: string;
    text: string;
    timestamp: number;
  };
  lastSetState?: {
    component: string;
    timestamp: number;
  };
  lastPromiseReject?: {
    reason: any;
    timestamp: number;
  };
  timestamp: string;
  browserInfo: {
    userAgent: string;
    language: string;
    platform: string;
  };
}
