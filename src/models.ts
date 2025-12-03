// --- DATA INTERFACES ---
export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface ChecklistItem {
  id: number;
  text: string;
  checked: boolean;
}

export interface Contact {
  date: string;
  person: string;
  method: string;
  said: string[];
  iSaid: string[];
  followUp: string[];
  discrepancy?: { title: string; detail: string; };
}

export interface Deadline {
  date: string;
  what: string;
  action: string;
  status: 'TODAY' | 'Pending' | 'Future' | 'CRITICAL';
  isCritical: boolean;
}

export interface DamageValues {
  lostWages: number;
  insuranceCosts: number;
  medicalExpenses: number;
}

export interface CaseDetails {
  win: string;
  phone: string;
  accommodationClaim: string;
  disabilityClaim: string;
  leaveClaim: string;
  sedgwickAccommodationContact: string;
  sedgwickDisabilityContact: string;
  sedgwickEmail: string;
  blueCrossContact: string;
  primaryInsurancePolicyName: string;
  policyNumber: string;
  insuranceProviderContact: string;
  injuryDate: string;
  denialDate: string;
  approvalDate: string;
  insuranceStopDate: string;
  clearedToWorkDate: string;
  accommodationDeadline: string;
  eeocDeadline: string;
  violations: string;
  caseValue: string;
  caseSummary: string;
}

export interface CaseDocument {
  id: string;
  name: string;
  content: string;
  uploaded: string;
}

export interface ViolationAlert {
  // --- Persistent Data ---
  title: string;
  explanation: string;
  severity: 'High' | 'Medium' | 'Low';
  references: string[];
  recommendations: string[];
  detailedExplanation?: string; // This IS persistent, fetched from AI

  // --- Transient UI State (should NOT be saved/exported) ---
  isFetchingDetails?: boolean;
  isDetailedAnalysisVisible?: boolean;
  showInitialDetails?: boolean;
  detailSearchQuery?: string;
}

// --- FAMILY LAW MODELS ---
export interface FamilyLawCaseDetails {
  caseNumber: string;
  county: string;
  opposingParty: string;
  opposingCounsel: string;
}

export interface KeyIssue {
  id: number;
  name: string;
  status: 'Pending' | 'Resolved' | 'Disputed' | 'In Progress';
}

export interface FamilyLawEvent {
  date: string;
  description: string;
  type: 'Hearing' | 'Mediation' | 'Deadline' | 'Meeting';
}

export interface FinancialLogEntry {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'Child Support' | 'Alimony' | 'Legal Fees' | 'Other';
}


export type ActiveTab = 'details' | 'documents' | 'chat' | 'timeline' | 'actions' | 'evidence' | 'contacts' | 'deadlines' | 'damages' | 'violations' | 'analyzer' | 'family' | 'mobile-upload';