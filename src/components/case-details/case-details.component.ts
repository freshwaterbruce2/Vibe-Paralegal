import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseDataService } from '../../services/case-data.service';
import { CaseDetails } from '../../models';
import { AiService } from '../../services/ai.service';

@Component({
  selector: 'app-case-details',
  templateUrl: './case-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class CaseDetailsComponent {
  caseDataService = inject(CaseDataService);
  aiService = inject(AiService);
  caseDetails = this.caseDataService.caseDetails;

  summaryLoading = signal(false);
  summaryError = signal<string | null>(null);

  handleCaseDetailsInput(field: keyof CaseDetails, event: Event) {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.caseDetails.update(details => ({ ...details, [field]: input.value }));
  }

  async generateCaseSummary() {
    if (this.summaryLoading()) return;

    this.summaryLoading.set(true);
    this.summaryError.set(null);
    // Clear previous summary before generating a new one
    this.caseDetails.update(details => ({ ...details, caseSummary: '' }));

    try {
      const fullContext = this.caseDataService.getFullContext();
      const stream = this.aiService.generateCaseSummaryStream(fullContext);

      for await (const chunk of stream) {
        const chunkText = chunk.text;
        this.caseDetails.update(details => ({
          ...details,
          caseSummary: details.caseSummary + chunkText
        }));
      }
    } catch (e) {
      console.error('Failed to generate case summary:', e);
      this.summaryError.set('Failed to generate summary. Please check the console for details.');
      this.caseDetails.update(details => ({ ...details, caseSummary: 'Error: Could not generate summary.' }));
    } finally {
      this.summaryLoading.set(false);
    }
  }
}