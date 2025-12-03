import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseDataService } from './services/case-data.service';
import { NotificationService } from './services/notification.service';
import { AiService } from './services/ai.service';
import { SettingsService } from './services/settings.service';
import { ActiveTab, ViolationAlert } from './models';

// Import all feature components
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
import { FileAnalyzerComponent } from './components/file-analyzer/file-analyzer.component';
import { FamilyLawComponent } from './components/family-law/family-law.component';
import { MobileUploadComponent } from './components/mobile-upload/mobile-upload.component';


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
    ViolationAnalysisComponent,
    FileAnalyzerComponent,
    FamilyLawComponent,
    MobileUploadComponent
  ]
})
export class AppComponent {
  caseDataService = inject(CaseDataService);
  notificationService = inject(NotificationService);
  settings = inject(SettingsService);
  
  // --- UI STATE SIGNALS ---
  activeTab: WritableSignal<ActiveTab>;
  isSettingsOpen = signal(false);

  constructor() {
    // Determine initial view: main app or mobile upload page
    const isMobileUpload = new URLSearchParams(window.location.search).has('mobile-upload');
    this.activeTab = signal(isMobileUpload ? 'mobile-upload' : 'details');

    if (!isMobileUpload) {
        this.checkDeadlinesOnLoad();
    }
  }

  setActiveTab(tab: ActiveTab) {
    this.activeTab.set(tab);
  }

  // --- SETTINGS & EXPORT ---
  toggleSettings() {
    this.isSettingsOpen.update(open => !open);
  }

  handleSettingsInput(field: 'userEmail' | 'notifyOnDeadlines' | 'notifyOnViolations' | 'deepseekApiKey', event: Event) {
    const input = event.target as HTMLInputElement;
    if (field === 'userEmail' || field === 'deepseekApiKey') {
      this.settings[field].set(input.value);
    } else {
      this.settings[field].set(input.checked);
    }
  }

  exportCaseFile() {
    try {
      // Create a clean, persistent-only version of violation alerts for export
      const cleanViolationAlerts = this.caseDataService.violationAlerts()?.map(alert => {
          const { isFetchingDetails, isDetailedAnalysisVisible, showInitialDetails, detailSearchQuery, ...persistentData } = alert;
          return persistentData;
      });

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
        violationAlerts: cleanViolationAlerts,
        chatHistory: this.caseDataService.messages(),
        familyLawDetails: this.caseDataService.familyLawDetails(),
        familyLawKeyIssues: this.caseDataService.familyLawKeyIssues(),
        familyLawEvents: this.caseDataService.familyLawEvents(),
        familyLawFinancialLog: this.caseDataService.familyLawFinancialLog(),
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
      this.notificationService.addToast('Export Failed', 'Could not generate the case file.', 'error');
    }
  }

  private checkDeadlinesOnLoad() {
    if (!this.settings.notifyOnDeadlines() || !this.settings.userEmail()) {
      return;
    }
    
    if (sessionStorage.getItem('deadlineNotified')) return;

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
      this.notificationService.notify(subject, body, this.settings.userEmail());
      sessionStorage.setItem('deadlineNotified', 'true');
    }
  }
}
