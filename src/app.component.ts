import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal, ElementRef, ViewChild, AfterViewChecked, computed, Signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';

// --- DATA INTERFACES ---
interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChecklistItem {
  id: number;
  text: string;
  checked: boolean;
}

interface Contact {
  date: string;
  person: string;
  method: string;
  said: string[];
  iSaid: string[];
  followUp: string[];
  discrepancy?: { title: string; detail: string; };
}

interface Deadline {
  date: string;
  what: string;
  action: string;
  status: 'TODAY' | 'Pending' | 'Future' | 'CRITICAL';
  isCritical: boolean;
}

interface DamageValues {
  lostWages: number;
  insuranceCosts: number;
  medicalExpenses: number;
}

interface CaseDetails {
  win: string;
  phone: string;
  accommodationClaim: string;
  disabilityClaim: string;
  leaveClaim: string;
  sedgwickAccommodationContact: string;
  sedgwickDisabilityContact: string;
  sedgwickEmail: string;
  blueCrossContact: string;
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

interface CaseDocument {
  id: string;
  name: string;
  content: string;
  uploaded: string;
}

type ActiveTab = 'details' | 'documents' | 'chat' | 'timeline' | 'actions' | 'evidence' | 'contacts' | 'deadlines' | 'damages';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class AppComponent implements AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  geminiService = inject(GeminiService);
  
  // --- STATE SIGNALS ---
  activeTab: WritableSignal<ActiveTab> = signal('details');
  
  // Chat State
  messages: WritableSignal<Message[]> = signal<Message[]>([]);
  loading: WritableSignal<boolean> = signal(false);
  error: WritableSignal<string | null> = signal(null);
  chatPrompt: WritableSignal<string> = signal('');

  // Case Data State
  caseDetails: WritableSignal<CaseDetails> = signal(this.getInitialCaseDetails());
  masterTimeline: WritableSignal<string> = signal(this.getInitialMasterTimeline());
  actionTracker: WritableSignal<ChecklistItem[]> = signal(this.getInitialActionTracker());
  evidenceHave: WritableSignal<ChecklistItem[]> = signal(this.getInitialEvidenceHave());
  evidenceNeed: WritableSignal<ChecklistItem[]> = signal(this.getInitialEvidenceNeed());
  contactLog: WritableSignal<Contact[]> = signal(this.getInitialContactLog());
  deadlineCalendar: WritableSignal<Deadline[]> = signal(this.getInitialDeadlineCalendar());
  damageCalculator: WritableSignal<DamageValues> = signal(this.getInitialDamageValues());
  
  // Document State
  documents: WritableSignal<CaseDocument[]> = signal(this.getInitialDocuments());
  selectedDocument: WritableSignal<CaseDocument | null> = signal(null);
  documentSearchQuery: WritableSignal<string> = signal('');
  
  // --- COMPUTED SIGNALS ---
  totalDamages: Signal<number> = computed(() => {
    const damages = this.damageCalculator();
    return (damages.lostWages || 0) + (damages.insuranceCosts || 0) + (damages.medicalExpenses || 0);
  });

  filteredDocuments: Signal<CaseDocument[]> = computed(() => {
    const query = this.documentSearchQuery().toLowerCase().trim();
    if (!query) return this.documents();
    return this.documents().filter(doc => 
      doc.name.toLowerCase().includes(query) || 
      doc.content.toLowerCase().includes(query)
    );
  });

  // --- LIFECYCLE & HELPERS ---
  private shouldScrollToBottom = false;

  constructor() {
    this.loadStateFromLocalStorage();
    // Auto-save any changes to local storage
    effect(() => {
      this.saveStateToLocalStorage();
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom(): void {
    if (this.chatContainer) {
      try {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      } catch(err) { /* Ignore */ }
    }
  }

  setActiveTab(tab: ActiveTab) {
    this.activeTab.set(tab);
    if (tab === 'chat') {
        this.shouldScrollToBottom = true;
    }
    this.selectedDocument.set(null); // Reset document view when changing tabs
  }

  // --- EVENT HANDLERS ---
  handleCaseDetailsInput(field: keyof CaseDetails, event: Event) {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.caseDetails.update(details => ({ ...details, [field]: input.value }));
  }

  handleTimelineInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.masterTimeline.set(textarea.value);
  }

  handlePromptInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.chatPrompt.set(textarea.value);
  }

  handleKeydownEnter(event: KeyboardEvent) {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  toggleActionTrackerItem(id: number) {
    this.actionTracker.update(items => items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  }

  toggleEvidenceHaveItem(id: number) {
    this.evidenceHave.update(items => items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  }

  toggleEvidenceNeedItem(id: number) {
    this.evidenceNeed.update(items => items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  }

  handleDamageInput(field: keyof DamageValues, event: Event) {
    const value = (event.target as HTMLInputElement).valueAsNumber || 0;
    this.damageCalculator.update(d => ({ ...d, [field]: value }));
  }
  
  async handleDocumentUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const newDocument: CaseDocument = {
        id: `doc_${Date.now()}`,
        name: file.name,
        content: content,
        uploaded: new Date().toLocaleDateString()
      };
      this.documents.update(docs => [...docs, newDocument]);
    } catch (e) {
      console.error("Error reading file:", e);
      // You might want to show an error to the user here
    }
     // Reset file input
    (event.target as HTMLInputElement).value = '';
  }

  selectDocument(doc: CaseDocument | null) {
    this.selectedDocument.set(doc);
  }

  handleSearchInput(event: Event) {
    this.documentSearchQuery.set((event.target as HTMLInputElement).value);
  }

  getHighlightedContent(content: string): string {
    const query = this.documentSearchQuery().trim();
    if (!query) return content.replace(/\n/g, '<br>');

    const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    return content.replace(regex, `<mark class="bg-yellow-400 text-black px-1 rounded">$1</mark>`).replace(/\n/g, '<br>');
  }

  // --- AI INTERACTION ---
  async sendMessage() {
    const prompt = this.chatPrompt().trim();
    if (!prompt) return;
    await this._executePrompt(prompt, prompt);
  }

  async generateActionPlan() {
    const userRequest = this.chatPrompt().trim();
    const actionPlanBasePrompt = 'Based on the entire case file provided (including case details, documents, timeline, trackers, and financial data), generate a detailed, step-by-step action plan. For each step, explain the action, its purpose, and any relevant deadlines or legal/policy citations.';
    
    const fullPrompt = userRequest
      ? `${actionPlanBasePrompt} The user has provided the following specific focus for this plan: "${userRequest}"`
      : actionPlanBasePrompt;
    
    const userMessage = `Generate Action Plan${userRequest ? `: ${userRequest}` : ''}`;

    await this._executePrompt(fullPrompt, userMessage);
  }

  private getFullContext(): string {
    const details = this.caseDetails();
    const damages = this.damageCalculator();
    const totalDamages = this.totalDamages();

    const formatChecklist = (title: string, items: ChecklistItem[]) => 
      `${title}:\n${items.map(i => `- [${i.checked ? 'X' : ' '}] ${i.text}`).join('\n')}`;

    const documentContext = this.documents().map(d => `--- Document: ${d.name} ---\n${d.content}`).join('\n\n');

    return `
# COMPLETE CASE FILE OVERVIEW

## Core Case Details
${Object.entries(details).map(([key, value]) => `- ${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${value}`).join('\n')}

## Master Timeline
${this.masterTimeline()}

## Action Tracker
${formatChecklist('Must Do Today', this.actionTracker())}

## Evidence Log
${formatChecklist('Evidence We Have', this.evidenceHave())}
${formatChecklist('Evidence We Need To Get', this.evidenceNeed())}

## Deadlines
${this.deadlineCalendar().map(d => `- ${d.date}: ${d.what} (${d.status})`).join('\n')}

## Damage Calculation
- Lost Wages: $${damages.lostWages.toFixed(2)}
- Insurance Costs: $${damages.insuranceCosts.toFixed(2)}
- Medical Expenses: $${damages.medicalExpenses.toFixed(2)}
- **GRAND TOTAL: $${totalDamages.toFixed(2)}**

## Case Documents Content
${documentContext}
`;
  }

  private async _executePrompt(prompt: string, userMessage: string) {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.messages.update(m => [...m, { role: 'user', text: userMessage }]);
    this.chatPrompt.set('');
    this.shouldScrollToBottom = true;

    this.messages.update(m => [...m, { role: 'model', text: '' }]);

    try {
      const fullContext = this.getFullContext();
      const stream = await this.geminiService.sendMessageStream(fullContext, prompt);

      for await (const chunk of stream) {
        const chunkText = chunk.text;
        this.messages.update(currentMessages => {
          const lastMessage = currentMessages[currentMessages.length - 1];
          if (lastMessage && lastMessage.role === 'model') {
            lastMessage.text += chunkText;
          }
          return [...currentMessages];
        });
        this.shouldScrollToBottom = true;
      }
    } catch (e) {
      console.error(e);
      const errorMessage = 'An error occurred. Please check the browser console for details.';
      this.error.set(errorMessage);
      this.messages.update(m => {
        const lastMessage = m[m.length - 1];
        if (lastMessage && lastMessage.role === 'model' && lastMessage.text === '') {
           return m.slice(0, m.length - 1);
        }
        if (lastMessage) {
            lastMessage.text = errorMessage;
        }
        return [...m];
      });
    } finally {
      this.loading.set(false);
      this.shouldScrollToBottom = true;
    }
  }

  formatMessageText(text: string): string {
    return text.replace(/\n/g, '<br>');
  }

  // --- LOCAL STORAGE PERSISTENCE ---
  private saveStateToLocalStorage() {
    try {
      const stateToSave = {
        messages: this.messages(),
        caseDetails: this.caseDetails(),
        masterTimeline: this.masterTimeline(),
        actionTracker: this.actionTracker(),
        evidenceHave: this.evidenceHave(),
        evidenceNeed: this.evidenceNeed(),
        contactLog: this.contactLog(),
        deadlineCalendar: this.deadlineCalendar(),
        damageCalculator: this.damageCalculator(),
        documents: this.documents()
      };
      localStorage.setItem('caseFileState', JSON.stringify(stateToSave));
    } catch (e) {
      console.error("Failed to save state to local storage", e);
    }
  }

  private loadStateFromLocalStorage() {
    try {
      const savedStateJSON = localStorage.getItem('caseFileState');
      if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON);
        this.messages.set(savedState.messages || this.getInitialMessages());
        this.caseDetails.set(savedState.caseDetails || this.getInitialCaseDetails());
        this.masterTimeline.set(savedState.masterTimeline || this.getInitialMasterTimeline());
        this.actionTracker.set(savedState.actionTracker || this.getInitialActionTracker());
        this.evidenceHave.set(savedState.evidenceHave || this.getInitialEvidenceHave());
        this.evidenceNeed.set(savedState.evidenceNeed || this.getInitialEvidenceNeed());
        this.contactLog.set(savedState.contactLog || this.getInitialContactLog());
        this.deadlineCalendar.set(savedState.deadlineCalendar || this.getInitialDeadlineCalendar());
        this.damageCalculator.set(savedState.damageCalculator || this.getInitialDamageValues());
        this.documents.set(savedState.documents || this.getInitialDocuments());
      } else {
        // First time load, set initial state
        this.messages.set(this.getInitialMessages());
      }
    } catch (e) {
      console.error("Failed to load state from local storage", e);
       this.messages.set(this.getInitialMessages());
    }
  }
  
  // --- INITIAL DATA FACTORIES ---
  private getInitialMessages(): Message[] {
    return [{ role: 'model', text: 'Hello! This is your AI Paralegal Assistant. I have been briefed with your entire case file, including all documents. Ask me any questions or request an action plan.' }];
  }

  private getInitialCaseDetails(): CaseDetails {
    return {
      win: '221050055', phone: '(803) 825-2876',
      accommodationClaim: 'C5830D8173-0001-01', disabilityClaim: '4A2507JQ7RH-0001', leaveClaim: 'C507170204800603AA',
      sedgwickAccommodationContact: '855-489-1600', sedgwickDisabilityContact: '800-492-5678', sedgwickEmail: 'WalmartForms@sedgwicksir.com',
      blueCrossContact: 'MEMBER_SERVICES_NUMBER',
      injuryDate: 'May 24, 2025', denialDate: 'July 14, 2025', approvalDate: 'August 19, 2025',
      insuranceStopDate: '~June 30, 2025 (DURING FMLA)', clearedToWorkDate: 'November 14, 2025',
      accommodationDeadline: 'November 22, 2025', eeocDeadline: 'May 10, 2026',
      violations: '"Temporary condition" denial (illegal per federal courts), No interactive process (ADA requirement), Insurance terminated during FMLA (illegal), No notice of insurance termination, Religious accommodation pending',
      caseValue: '$275,000-$625,000'
    };
  }

  private getInitialMasterTimeline(): string {
    return `## MASTER TIMELINE

- **May 24, 2025:** Injury occurred.
- **July 14, 2025:** Initial accommodation denial letter received (cited "temporary condition").
- **August 19, 2025:** Subsequent accommodation approval letter received (for reassignment search).
- **~June 30, 2025:** Health insurance terminated during FMLA leave.
- **September 5, 2025:** STD payment stub shows no insurance premium deduction.
- **October 30, 2025:** Disability & Leave Approval letter received.
- **November 3, 2025:** MRI results received showing degenerative disc disease and disc extrusion.
- **November 14, 2025:** Medically cleared to return to work with restrictions.
- **November 15, 2025:** Phone call with HR (T'Challa), told to come in 11/16, case "closed". Contradicts Sedgwick.
- **November 22, 2025:** Official accommodation search deadline from Sedgwick.
- **May 10, 2026:** EEOC filing deadline (300 days from July 14 denial).`;
  }

  private getInitialActionTracker(): ChecklistItem[] {
    return [
      { id: 1, text: 'Meet with Christina about religious accommodation', checked: false },
      { id: 2, text: 'Ask about accommodation case status (open vs closed?)', checked: false },
      { id: 3, text: 'Get case closure in WRITING if they say it\'s closed', checked: false },
      { id: 4, text: 'Document everything Christina says', checked: false },
      { id: 5, text: 'Note any physical issues with work', checked: false },
      { id: 6, text: 'Ask about insurance premium deductions', checked: false }
    ];
  }

  private getInitialEvidenceHave(): ChecklistItem[] {
    return [
      { id: 1, text: 'July 14 accommodation denial letter (CRITICAL)', checked: true },
      { id: 2, text: 'August 19 accommodation approval letter', checked: true },
      { id: 3, text: 'All Sedgwick letters (July-October)', checked: true },
      { id: 4, text: 'Medical records from Colonial Healthcare', checked: true },
      { id: 5, text: 'Dr. Becksvoort notes and restrictions', checked: true },
      { id: 6, text: 'MRI X-ray results (degenerative disc disease)', checked: true },
      { id: 7, text: 'September 5 STD payment stub (no insurance deduction)', checked: true },
      { id: 8, text: 'November 15 email to Christina/Tichala', checked: true }
    ];
  }

  private getInitialEvidenceNeed(): ChecklistItem[] {
    return [
      { id: 1, text: 'Blue Cross Blue Shield termination date (exact)', checked: false },
      { id: 2, text: 'Blue Cross denial of reinstatement (in writing)', checked: false },
      { id: 3, text: 'All STD payment stubs May-October (check for premium deductions)', checked: false },
      { id: 4, text: 'Private insurance policy and premium amounts', checked: false },
      { id: 5, text: 'Accommodation case closure letter (if they say it\'s closed)', checked: false },
      { id: 6, text: 'Religious accommodation decision (when made)', checked: false }
    ];
  }

  private getInitialContactLog(): Contact[] {
    return [
      {
        date: "November 15, 2025 (evening)", person: "T'Challa (Walmart HR)", method: "Phone call",
        said: ["Come in Saturday 11/16", "Same position (Imports Loader)", "Same pay ($26.40/hour)", "Accommodation case CLOSED", "Religious accommodation through Christina"],
        iSaid: ["Asked about case status", "Confirmed I'd come in Saturday"],
        followUp: ["Get case closure in writing", "Clarify with Sedgwick about open vs closed"],
        discrepancy: { title: "DISCREPANCY NOTED", detail: "T'Challa says closed, Sedgwick says open. There is a 6-day gap to the deadline." }
      },
      {
        date: "November 15, 2025 (day)", person: "Sedgwick rep", method: "Phone call",
        said: ["Case C5830D8173-0001-01 STILL OPEN", "Deadline November 22, 2025", "Case active through deadline"],
        iSaid: ["Asked about case status"],
        followUp: []
      }
    ];
  }
  
  private getInitialDeadlineCalendar(): Deadline[] {
    return [
      { date: 'Nov 16, 2025', what: 'Meet Christina', action: 'Ask questions, document everything', status: 'TODAY', isCritical: false },
      { date: 'Nov 18, 2025', what: 'Monday follow-up', action: 'Call Blue Cross, call Sedgwick if needed', status: 'Pending', isCritical: false },
      { date: 'Nov 22, 2025', what: 'Accommodation deadline', action: 'Monitor for communication', status: 'Pending', isCritical: false },
      { date: 'Dec 16, 2025', what: '30 days from return', action: 'Check religious accommodation status', status: 'Future', isCritical: false },
      { date: 'May 10, 2026', what: 'EEOC deadline', action: '300 days from July 14 denial', status: 'CRITICAL', isCritical: true }
    ];
  }

  private getInitialDamageValues(): DamageValues {
    return { lostWages: 18900, insuranceCosts: 2500, medicalExpenses: 850 };
  }

  private getInitialDocuments(): CaseDocument[] {
    return [
        { id: 'doc_1', name: 'Disability_and_Leave_Approval_10-30-2025.txt', uploaded: 'Pre-loaded', content: `October 30,2025 Disability and Leave Approval
web: mySedgwick® | phone: 800-492-5678 | email: WalmartForms@sedgwicksir.com | fax: 859-264-4372 or 859-280-3270 | postal: P.O. Box 14028, Lexington, KY 40512
Bruce A. Freshwater 2529 William Brunson Rd Summerton, SC 29148 Associate WIN: 221050055
Dear Bruce:
We are pleased to inform you that your request for Short-Term Disability (STD) pay and a leave of absence have been approved. We are here to support you and to answer your questions as the process moves forward.
Here are some important details about your disability pay and leave of absence request:
Pay
• Disability claim number: 4A2507JQ7RH-0001
• Disability dates approved: 05/24/2025 - 11/21/2025
  o Waiting period dates: 05/24/2025 - 05/30/2025
  o Disability pay dates: 05/31/2025 - 11/21/2025
• Disability pay: STD Basic Benefits: 50% of average weekly wage, no maximum for up to 25 weeks following a 7 calendar day waiting period.
• Pay Calculation: The STD benefit amount you will receive was calculated using a percentage of your average earnings from the 26 pay periods prior to your last date worked prior to going on leave.
Leave
• Leave case number: C507170204800603AA
• Leave dates approved: 05/24/2025 - 08/24/2025
  o Personal Medical Leave dates: 05/24/2025 - 08/24/2025 = 13.67 week(s) (Non job-protected)
  o Federal Family and Medical Leave Act dates: 05/24/2025 - 08/11/2025 = 12.00 week(s) (Job-protected)
• Estimated Return to work date: 11/22/2025
Note: For the dates listed as job-protected, you will generally be able to return to your position or an equivalent one.`},
        { id: 'doc_2', name: 'MRI_Lumbar_Spine_Report_11-03-2025.txt', uploaded: 'Pre-loaded', content: `MRI LUMBAR SPINE WITHOUT CONTRAST [72148]
Requesting Physician: BECKSVOORT, CODY W
Order Date: 10/30/2025
HISTORY: Lumbar radiculopathy and lower back pain.
FINDINGS:
Normal lumbar lordosis.
L4-5: Mild degenerative disc disease. Small posterior broad-based disc bulge eccentric to the right with an associated central and right central annular fissure. Mild facet osteoarthritis. No central stenosis. Mild bilateral subarticular recess narrowing. Mild left neural foraminal narrowing.
L5-S1: Moderate degenerative disc disease. Small posterior broad-based disc bulge with a small superimposed left central disc extrusion with inferior extension. This extruded disc abuts the left traversing S1 nerve root. No central stenosis. Mild bilateral subarticular recess narrowing. Moderate bilateral neural foraminal narrowing.
IMPRESSION:
1. Degenerative disc disease and lumbar spondylosis, most significant at the L5-S1 level where there is a left central disc extrusion with inferior extension. This abuts the left traversing S1 nerve root. Please see comments for level by level analysis.
Gregory Schwartzman MD 11/03/2025 10:16 AM (US/Eastern)`},
        { id: 'doc_3', name: 'Returning_from_Leave_of_Absence_07-21-2025.txt', uploaded: 'Pre-loaded', content: `July 21, 2025 Returning from Leave of Absence
Dear Bruce:
We have received information indicating you are able to return to work but have restrictions or limitations Your case has been referred to our Return from Leave of Absence department for further review. You will receive additional information from your Return from Leave of Absence examiner in reference to the status of your return to work within seven days.
Name: Bruce A. Freshwater
Disability claim number: 4A2507JQ7RH-0001
Leave case number: C507170204800603AA
Referral date: 07/21/2025
Important: Additional medical information may be required. If so, we will work with you and your health care provider to get the information we need to determine if you're able to return to work. If you are unable to return to work, either with or without an accommodation, you may be required to remain on leave.`},
        { id: 'doc_4', name: 'Extending_Disability_Leave_10-14-2025.txt', uploaded: 'Pre-loaded', content: `October 14, 2025 Extending Your Disability and Leave of Absence
Dear Bruce:
We received your request for an extension to your current short-term disability (STD) pay and leave of absence. Your leave is currently approved through 08/24/2025, and your disability pay is currently approved through 10/09/2025. Your disability pay will stop on this date.
To extend your disability pay and leave of absence, please send additional medical information to Sedgwick.
Pay
• Disability claim number: 4A2507JQ7RH-0001
• Disability pay: STD Basic Benefits: 50% of average weekly wage...
Leave
• Leave case number: C507170204800603AA
• Leave type: Eligible for Family and Medical Leave Act (FMLA) Personal Medical Leave if approved
• Extension date requested: 10/10/2025
Here's what you need to do next:
Ask your healthcare provider to send us additional objective medical information...
Medical due date: Your medical information is due no later than 10/29/2025.`},
    ];
  }
}