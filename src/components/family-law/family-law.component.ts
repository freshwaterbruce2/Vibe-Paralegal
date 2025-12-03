import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseDataService } from '../../services/case-data.service';
import { FamilyLawCaseDetails, FinancialLogEntry, KeyIssue } from '../../models';

@Component({
  selector: 'app-family-law',
  templateUrl: './family-law.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class FamilyLawComponent {
  caseDataService = inject(CaseDataService);
  
  // Data signals from the service
  details = this.caseDataService.familyLawDetails;
  keyIssues = this.caseDataService.familyLawKeyIssues;
  events = this.caseDataService.familyLawEvents;
  financialLog = this.caseDataService.familyLawFinancialLog;
  
  // Local state for the new entry form
  newLogEntry = signal<Omit<FinancialLogEntry, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: 0,
    type: 'Child Support'
  });

  handleDetailsInput(field: keyof FamilyLawCaseDetails, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.details.update(d => ({ ...d, [field]: value }));
  }
  
  handleIssueStatusChange(issueId: number, event: Event) {
    const newStatus = (event.target as HTMLSelectElement).value as KeyIssue['status'];
    this.keyIssues.update(issues => issues.map(issue => 
      issue.id === issueId ? { ...issue, status: newStatus } : issue
    ));
  }
  
  handleNewLogInput(field: keyof Omit<FinancialLogEntry, 'id'>, event: Event) {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const value = target.type === 'number' ? (target as HTMLInputElement).valueAsNumber : target.value;
    this.newLogEntry.update(entry => ({ ...entry, [field]: value }));
  }

  addFinancialLogEntry() {
    const entry = this.newLogEntry();
    if (!entry.description || entry.amount <= 0) {
      // Basic validation
      return;
    }
    const newEntryWithId: FinancialLogEntry = {
      ...entry,
      id: Date.now()
    };
    this.financialLog.update(log => [...log, newEntryWithId]);
    // Reset form
    this.newLogEntry.set({
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: 0,
      type: 'Child Support'
    });
  }

  removeFinancialLogEntry(id: number) {
    this.financialLog.update(log => log.filter(entry => entry.id !== id));
  }
}
