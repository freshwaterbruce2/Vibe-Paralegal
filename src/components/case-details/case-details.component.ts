import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseDataService } from '../../services/case-data.service';
import { CaseDetails } from '../../models';

@Component({
  selector: 'app-case-details',
  templateUrl: './case-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class CaseDetailsComponent {
  caseDataService = inject(CaseDataService);
  caseDetails = this.caseDataService.caseDetails;

  handleCaseDetailsInput(field: keyof CaseDetails, event: Event) {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.caseDetails.update(details => ({ ...details, [field]: input.value }));
  }
}
