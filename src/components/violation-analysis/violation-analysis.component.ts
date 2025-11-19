import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseDataService } from '../../services/case-data.service';
import { AiService } from '../../services/ai.service';
import { NotificationService } from '../../services/notification.service';
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

  // Data from Service
  violationAlerts = this.caseDataService.violationAlerts;
  caseDetails = this.caseDataService.caseDetails;
  
  // Local UI State
  analysisLoading = signal(false);
  error = signal<string | null>(null);

  // Loaded from app component local storage on startup
  userEmail = signal(JSON.parse(localStorage.getItem('caseAppSettings') || '{}').userEmail || '');
  notifyOnViolations = signal(JSON.parse(localStorage.getItem('caseAppSettings') || '{}').notifyOnViolations !== false);

  async analyzeForViolations() {
    if (this.analysisLoading()) return;
    this.analysisLoading.set(true);
    this.error.set(null);
    
    const oldAlerts = this.violationAlerts() || [];

    try {
      const fullContext = this.caseDataService.getFullContext();
      const responseText = await this.aiService.analyzeViolations(fullContext);
      const cleanedJson = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      const newAlerts: ViolationAlert[] = JSON.parse(cleanedJson);
      this.violationAlerts.set(newAlerts.map(a => ({ ...a, showInitialDetails: false, detailSearchQuery: '' })));

      // Check for new high-severity violations to notify user
      if (this.notifyOnViolations() && this.userEmail()) {
        const oldHighSeverityTitles = new Set(oldAlerts.filter(a => a.severity === 'High').map(a => a.title));
        const newHighSeverityAlerts = newAlerts.filter(a => a.severity === 'High' && !oldHighSeverityTitles.has(a.title));
        
        if (newHighSeverityAlerts.length > 0) {
          const subject = `New High-Severity Violation Alert in Case ${this.caseDetails().win}`;
          const body = `The AI has identified ${newHighSeverityAlerts.length} new high-severity violation(s):\n\n${newHighSeverityAlerts.map(a => `- ${a.title}`).join('\n')}\n\nPlease review the Violation Analysis tab for details.`;
          this.notificationService.notify(subject, body, this.userEmail());
        }
      }

    } catch (e) {
      console.error("Violation analysis failed:", e);
      const errorMessage = 'An error occurred during violation analysis. The AI may have returned an invalid response. Please try again or check the console for details.';
      this.error.set(errorMessage);
      this.violationAlerts.set([]); // Set to empty to stop spinner
    } finally {
      this.analysisLoading.set(false);
    }
  }

  async getViolationDetails(alertToExpand: ViolationAlert) {
    if (alertToExpand.isExpanding) return;

    // Set loading state for the specific alert
    this.violationAlerts.update(alerts => 
      alerts!.map(alert => 
        alert.title === alertToExpand.title 
        ? { ...alert, isExpanding: true, detailedExplanation: '', detailSearchQuery: '' } // Reset explanation and search for re-fetch
        : alert
      )
    );

    try {
      const fullContext = this.caseDataService.getFullContext();
      const stream = this.aiService.getViolationDetailsStream(fullContext, alertToExpand);

      for await (const chunk of stream) {
        const chunkText = chunk.text;
        this.violationAlerts.update(alerts => {
          if (!alerts) return null;
          return alerts.map(alert => {
            if (alert.title === alertToExpand.title) {
              return {
                ...alert,
                detailedExplanation: (alert.detailedExplanation || '') + chunkText
              };
            }
            return alert;
          });
        });
      }
    } catch (e) {
      console.error("Failed to get violation details:", e);
      // Handle error state on the specific alert
      this.violationAlerts.update(alerts => 
        alerts!.map(alert => 
          alert.title === alertToExpand.title 
          ? { ...alert, detailedExplanation: 'Error: Could not fetch details. Please try again.' }
          : alert
        )
      );
    } finally {
      // Set loading state to false
      this.violationAlerts.update(alerts => 
        alerts!.map(alert => 
          alert.title === alertToExpand.title 
          ? { ...alert, isExpanding: false } 
          : alert
        )
      );
    }
  }

  toggleInitialDetails(alertToToggle: ViolationAlert) {
    this.violationAlerts.update(alerts => {
      if (!alerts) return null;
      return alerts.map(alert => 
        alert.title === alertToToggle.title 
          ? { ...alert, showInitialDetails: !alert.showInitialDetails } 
          : alert
      );
    });
  }

  handleViolationDetailSearch(alertToUpdate: ViolationAlert, event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.violationAlerts.update(alerts => {
      if (!alerts) return null;
      return alerts.map(alert =>
        alert.title === alertToUpdate.title
          ? { ...alert, detailSearchQuery: query }
          : alert
      );
    });
  }

  getHighlightedViolationDetail(alert: ViolationAlert): string {
    const content = alert.detailedExplanation || '';
    const query = (alert.detailSearchQuery || '').trim();

    // The prose class will handle whitespace, but replacing newlines with <br> ensures paragraph breaks are respected.
    const formattedContent = content.replace(/\n/g, '<br>');

    if (!query) {
      return formattedContent;
    }

    try {
      // Escape special characters for regex
      const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      return formattedContent.replace(regex, `<mark class="bg-yellow-400 text-black px-1 rounded">$1</mark>`);
    } catch (e) {
      console.error("Error creating regex for highlighting:", e);
      return formattedContent; // Return unhighlighted on error
    }
  }
}