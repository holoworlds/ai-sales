export type ClientStage = 
  | 'phase_0' // Status Quo
  | 'phase_1' // Awareness
  | 'phase_2' // Problem Ownership
  | 'phase_3' // Priority Justification
  | 'phase_4' // Solution Framing
  | 'phase_5' // Organizational Alignment
  | 'phase_6' // Commercial Decision
  | 'phase_7'; // Proof & Expansion

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
  ownerId: string;
  createdAt: any;
  updatedAt: any;
}

export interface Interaction {
  id: string;
  clientId: string;
  type: 'chat' | 'email' | 'meeting' | 'call';
  content: string;
  aiReplySuggestion?: string;
  feedback?: string;
  timestamp: any;
  authorId: string;
}

export interface ContentAsset {
  id: string;
  clientId: string;
  title: string;
  type: 'PPT' | 'Report' | 'Strategy' | 'Prompt' | 'Journey';
  body: string;
  ownerId: string;
  createdAt: any;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  sourceType: 'document' | 'feedback' | 'market_report' | 'word' | 'ppt' | 'excel' | 'pdf';
  tags: string[];
  ownerId: string;
  category: 'strategy' | 'competitor' | 'industry' | 'product' | 'customer_case';
  createdAt: any;
  updatedAt: any;
}

export interface AgentSkill {
  id: string;
  name: string;
  type: 'analysis' | 'generation' | 'strategy';
  description: string;
  logic: string; // The prompt template or logic
  performanceScore: number;
  applicablePhases: ClientStage[];
  usageCount: number;
  ownerId: string;
  createdAt: any;
}

export interface AgentInteraction {
  id: string;
  clientId?: string; // Optional if global
  query: string;
  response: {
    analysis: string;
    decision: string;
    recommendedAction: string;
    generatedMessage: string;
    usedSkills: string[];
    confidence: number;
  };
  feedback?: {
    score: number; // -2 to +2
    comment?: string;
  };
  timestamp: any;
  ownerId: string;
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
