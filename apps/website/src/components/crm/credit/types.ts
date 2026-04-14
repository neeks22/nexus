export interface LenderTier {
  tier: string;
  ficoMin: number;
  ficoMax: number;
  rate: string;
  maxLTV: string;
  maxPayCall: string;
  reserve: string;
  color: string;
}

export interface Lender {
  name: string;
  tiers: LenderTier[];
  minIncome: number;
  maxKm: number;
  maxTerm: number;
  special: string[];
  noGo: string[];
  adminFee?: string;
}

export interface ScoredResult {
  score: number;
  tier: LenderTier | null;
  reasons: string[];
  warnings: string[];
  lender: string;
}

export interface CustomerProfile {
  fico: string;
  income: string;
  situation: string;
  selfEmployed: boolean;
  downPayment: string;
  desiredPayment: string;
  vehicleYear: string;
  vehicleKm: string;
  vehiclePrice: string;
}

export interface ScoringProfile {
  fico: number;
  income: number;
  situation: string;
  selfEmployed: boolean;
}

export interface CreditGrade {
  grade: string;
  color: string;
  summary: string;
}
