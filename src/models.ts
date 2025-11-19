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
}

export interface CaseDocument {
  id: string;
  name: string;
  content: string;
  uploaded: string;
}

export interface ViolationAlert {
  title: string;
  explanation:string;
  severity: 'High' | 'Medium' | 'Low';
  references: string[];
  recommendations: string[];
  detailedExplanation?: string;
  isExpanding?: boolean;
}

export type ActiveTab = 'details' | 'documents' | 'chat' | 'timeline' | 'actions' | 'evidence' | 'contacts' | 'deadlines' | 'damages' | 'violations';
