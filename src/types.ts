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
  memorySummary?: string;
  nextActionDate?: any;
  nextActionSuggestion?: string;
  nextActionCompleted?: boolean;
  promoter?: string;
  keyPerson?: string;
  groupMeeting?: string;
  product?: string;
  scale?: string;
  projectScore?: number;
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
  createdAt: any;
  updatedAt: any;
}
