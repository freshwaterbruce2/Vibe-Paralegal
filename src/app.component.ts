import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseDataService } from './services/case-data.service';
import { NotificationService } from './services/notification.service';
import { ActiveTab } from './models';

// Import all new feature components
import { CaseDetailsComponent } from './components/case-details/case-details.component';
import { DocumentViewerComponent } from './components/document-viewer/document-viewer.component';
import { ChatComponent } from './components/chat/chat.component';
import { TimelineEditorComponent } from './components/timeline-editor/timeline-editor.component';
import { ActionTrackerComponent } from './components/action-tracker/action-tracker.component';
import { EvidenceLogComponent } from './components/evidence-log/evidence-log.component';
import { ContactLogComponent } from './components/contact-log/contact-log.component';
import { DeadlineCalendarComponent } from './components/deadline-calendar/deadline-calendar.component';
import { DamageCalculatorComponent } from './components/damage-calculator/damage-calculator.component';
import { ViolationAnalysisComponent } from './components/violation-analysis/violation-analysis.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CaseDetailsComponent,
    DocumentViewerComponent,
    ChatComponent,
    TimelineEditorComponent,
    ActionTrackerComponent,
    EvidenceLogComponent,
    ContactLogComponent,
    DeadlineCalendarComponent,
    DamageCalculatorComponent,
    ViolationAnalysisComponent
  ]
})
export class AppComponent {
  caseDataService = inject(CaseDataService);
  notificationService = inject(NotificationService);
  
  // --- UI STATE SIGNALS ---
  activeTab: WritableSignal<ActiveTab> = signal('details');
  
  // Settings State
  isSettingsOpen = signal(false);
  userEmail = signal('');
  notifyOnDeadlines = signal(true);
  notifyOnViolations = signal(true);

  constructor() {
    this.loadSettingsFromLocalStorage();
    this.checkDeadlinesOnLoad();
    // Auto-save settings changes to local storage
    effect(() => {
      this.saveSettingsToLocalStorage();
    });
  }

  setActiveTab(tab: ActiveTab) {
    this.activeTab.set(tab);
  }

  // --- SETTINGS & EXPORT ---
  toggleSettings() {
    this.isSettingsOpen.update(open => !open);
  }

  handleSettingsInput(field: 'userEmail' | 'notifyOnDeadlines' | 'notifyOnViolations', event: Event) {
    const input = event.target as HTMLInputElement;
    if (field === 'userEmail') {
      this.userEmail.set(input.value);
    } else {
      const signal = this[field];
      if (typeof signal === 'function' && 'set' in signal) {
        (signal as WritableSignal<boolean>).set(input.checked);
      }
    }
  }

  exportCaseFile() {
    try {
      const caseData = {
        caseDetails: this.caseDataService.caseDetails(),
        masterTimeline: this.caseDataService.masterTimeline(),
        actionTracker: this.caseDataService.actionTracker(),
        evidenceHave: this.caseDataService.evidenceHave(),
        evidenceNeed: this.caseDataService.evidenceNeed(),
        contactLog: this.caseDataService.contactLog(),
        deadlineCalendar: this.caseDataService.deadlineCalendar(),
        damageCalculator: this.caseDataService.damageCalculator(),
        documents: this.caseDataService.documents(),
        violationAlerts: this.caseDataService.violationAlerts()?.map(({ isExpanding, detailedExplanation, ...rest }) => rest), // Don't save transient state
        chatHistory: this.caseDataService.messages(),
      };

      const jsonData = JSON.stringify(caseData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `case-file-WIN-${this.caseDataService.caseDetails().win || 'data'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to export case file:", e);
      this.notificationService.notify('Export Failed', 'Could not generate the case file. Please check the console.', this.userEmail() || 'error-log');
    }
  }

  private saveSettingsToLocalStorage() {
     try {
       const settings = {
         userEmail: this.userEmail(),
         notifyOnDeadlines: this.notifyOnDeadlines(),
         notifyOnViolations: this.notifyOnViolations()
       };
       localStorage.setItem('caseAppSettings', JSON.stringify(settings));
     } catch (e) {
       console.error("Failed to save settings to local storage", e);
     }
  }

  private loadSettingsFromLocalStorage() {
      try {
        const savedSettingsJSON = localStorage.getItem('caseAppSettings');
        if (savedSettingsJSON) {
            const settings = JSON.parse(savedSettingsJSON);
            this.userEmail.set(settings.userEmail || '');
            this.notifyOnDeadlines.set(settings.notifyOnDeadlines !== false); // default true
            this.notifyOnViolations.set(settings.notifyOnViolations !== false); // default true
        }
      } catch (e) {
        console.error("Failed to load settings from local storage", e);
      }
  }

  private checkDeadlinesOnLoad() {
    if (!this.notifyOnDeadlines() || !this.userEmail()) {
      return;
    }
    
    // Use sessionStorage to ensure we only notify once per session
    if (sessionStorage.getItem('deadlineNotified')) {
      return;
    }

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const upcomingDeadlines = this.caseDataService.deadlineCalendar().filter(d => {
      const deadlineDate = new Date(d.date);
      return d.isCritical && deadlineDate >= today && deadlineDate <= thirtyDaysFromNow;
    });

    if (upcomingDeadlines.length > 0) {
      const subject = `Upcoming Critical Deadline Alert for Case ${this.caseDataService.caseDetails().win}`;
      const body = `You have ${upcomingDeadlines.length} critical deadline(s) approaching within the next 30 days:\n\n${upcomingDeadlines.map(d => `- ${d.date}: ${d.what}`).join('\n')}\n\nPlease review the Deadline Calendar for details.`;
      this.notificationService.notify(subject, body, this.userEmail());
      sessionStorage.setItem('deadlineNotified', 'true');
    }
  }
}
