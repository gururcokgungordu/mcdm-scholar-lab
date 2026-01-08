
export type CriterionDirection = 'max' | 'min';
export type UserRole = 'USER' | 'PRO' | 'ADMIN';
export type FuzzyNumberType = 'Crisp' | 'Triangular' | 'Trapezoidal' | 'Type-2' | 'Intuitionistic';
export type NormalizationType = 'Vector' | 'Linear' | 'Logarithmic';
export type AggregationLogic = 'Distance-to-Ideal' | 'Weighted-Sum' | 'Outranking' | 'Ratio-System';

export interface User {
  id: string;
  name: string;
  email: string;
  university: string;
  school: string;
  purpose: 'education' | 'research' | 'commercial' | 'other';
  role: UserRole;
  isPro: boolean;
}

export interface Criterion {
  name: string;
  weight: number;
  direction: CriterionDirection;
}

export interface MethodologyModule {
  fuzzyType: FuzzyNumberType;
  normalization: NormalizationType;
  aggregation: AggregationLogic;
  defuzzification: string; // Method used: e.g. "Centroid", "Mean of Maximum"
}

export interface MCDMAnalysis {
  method: string;
  applicationArea: string;
  fuzzySystem: string;
  numberSet: string;
  criteria: Criterion[];
  alternatives: string[];
  matrix: number[][];
  originalRanking: { alternative: string; score: number; rank: number }[];
  summary: string;
  logicModule: MethodologyModule; // New: Atomic parts
}

export interface GlobalMethodology {
  id: string;
  paperName: string;
  method: string;
  application: string;
  fuzzySystem: string;
  numberSet: string;
  timestamp: number;
  logicModule: MethodologyModule; // New: To allow cross-paper synthesis
  userId?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  paperName: string;
  analysis: MCDMAnalysis;
  userId?: string;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type AppView = 'AUTH' | 'DASHBOARD' | 'ANALYZER' | 'IDEA_TOOL' | 'MODEL_BUILDER' | 'WRITER' | 'SETTINGS' | 'ADMIN_PANEL' | 'REFERENCE_CALC' | 'NEW_STUDY' | 'SENSITIVITY';
