import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseDataService } from '../../services/case-data.service';
import { AiService } from '../../services/ai.service';
import { NotificationService } from '../../services/notification.service';
import { SettingsService } from '../../services/settings.service';
import { HighlightService } from '../../services/highlight.service';
import { SanitizationService } from '../../services/sanitization.service';
import { ViolationAlert } from '../../models';

@Component({
  selector: 'app-violation-analysis',
  templateUrl: './violation-analysis.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class ViolationAnalysisComponent {
  caseDataService = inject(CaseDataService);
  aiService = inject(AiService);
  notificationService = inject(NotificationService);
  settings = inject(SettingsService);
  highlighter = inject(HighlightService);
  sanitizer = inject(SanitizationService);

  // Data from Service
  violationAlerts = this.caseDataService.violationAlerts;
  caseDetails = this.caseDataService.caseDetails;
  
  // Local UI State
  analysisLoading = signal(false);
  error = signal<string | null>(null);
  statuteModalContent = signal<{ title: string; url: string } | null>(null);
  
  async analyzeForViolations() {
    if (this.analysisLoading()) return;
    this.analysisLoading.set(true);
    this.error.set(null);
    
    const oldAlerts = this.violationAlerts() || [];

    try {
      const fullContext = this.caseDataService.getFullContext();
      const responseText = await this.aiService.analyzeViolations(fullContext);
      
      const newAlertsData = JSON.parse(responseText);
      const newAlerts: ViolationAlert[] = Array.isArray(newAlertsData) ? newAlertsData : [];

      this.violationAlerts.set(newAlerts.map(a => ({ ...a, showInitialDetails: false, detailSearchQuery: '', isDetailedAnalysisVisible: false })));

      // Notify on new high-severity violations
      this.checkForNewViolations(oldAlerts, newAlerts);

    } catch (e: any) {
      this.error.set(e.message || 'Analysis failed. Please check the console.');
      this.violationAlerts.set(oldAlerts); // Revert to old state on failure
    } finally {
      this.analysisLoading.set(false);
    }
  }

  private checkForNewViolations(oldAlerts: ViolationAlert[], newAlerts: ViolationAlert[]) {
     if (this.settings.notifyOnViolations() && this.settings.userEmail()) {
        const oldHighSeverityTitles = new Set(oldAlerts.filter(a => a.severity === 'High').map(a => a.title));
        const newHighSeverityAlerts = newAlerts.filter(a => a.severity === 'High' && !oldHighSeverityTitles.has(a.title));
        
        if (newHighSeverityAlerts.length > 0) {
          const subject = `New High-Severity Violation Alert in Case ${this.caseDetails().win}`;
          const body = `The AI has identified ${newHighSeverityAlerts.length} new high-severity violation(s):\n\n${newHighSeverityAlerts.map(a => `- ${a.title}`).join('\n')}`;
          this.notificationService.notify(subject, body, this.settings.userEmail());
        }
      }
  }

  async toggleDetailedAnalysis(alertToToggle: ViolationAlert) {
    // If it's already visible, just hide it.
    if (alertToToggle.isDetailedAnalysisVisible) {
      this.updateAlert(alertToToggle.title, { isDetailedAnalysisVisible: false });
      return;
    }
    
    // Show it immediately
    this.updateAlert(alertToToggle.title, { isDetailedAnalysisVisible: true });

    // If we already have the text, we're done.
    if (alertToToggle.detailedExplanation) return;

    // Otherwise, fetch the details.
    this.updateAlert(alertToToggle.title, { isFetchingDetails: true, detailedExplanation: '' });
    
    try {
      const fullContext = this.caseDataService.getFullContext();
      const stream = this.aiService.getViolationDetailsStream(fullContext, alertToToggle);

      for await (const chunk of stream) {
        this.violationAlerts.update(alerts => alerts.map(alert => 
            alert.title === alertToToggle.title 
            ? { ...alert, detailedExplanation: (alert.detailedExplanation || '') + chunk.text }
            : alert
        ));
      }
    } catch (e) {
      this.updateAlert(alertToToggle.title, { detailedExplanation: 'Error: Could not fetch details.' });
    } finally {
      this.updateAlert(alertToToggle.title, { isFetchingDetails: false });
    }
  }

  private updateAlert(title: string, props: Partial<ViolationAlert>) {
     this.violationAlerts.update(alerts => alerts.map(alert => 
        alert.title === title ? { ...alert, ...props } : alert
    ));
  }

  toggleInitialDetails(alertToToggle: ViolationAlert) {
    this.updateAlert(alertToToggle.title, { showInitialDetails: !alertToToggle.showInitialDetails });
  }

  handleViolationDetailSearch(alertToUpdate: ViolationAlert, event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.updateAlert(alertToUpdate.title, { detailSearchQuery: query });
  }

  getSanitizedAndHighlightedDetail(alert: ViolationAlert): string {
    const sanitized = this.sanitizer.sanitize(alert.detailedExplanation || '');
    return this.highlighter.highlight(sanitized, alert.detailSearchQuery);
  }

  handleDetailClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor && anchor.href) {
      event.preventDefault();
      // Basic security check for safe protocols
      if (anchor.protocol === 'http:' || anchor.protocol === 'https:') {
          this.statuteModalContent.set({ title: anchor.innerText, url: anchor.href });
      } else {
          this.notificationService.addToast('Blocked Link', 'For security, only HTTP/HTTPS links can be opened.', 'error');
      }
    }
  }

  closeStatuteModal() {
    this.statuteModalContent.set(null);
  }
}
