import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseDataService } from '../../services/case-data.service';

@Component({
  selector: 'app-contact-log',
  templateUrl: './contact-log.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class ContactLogComponent {
  caseDataService = inject(CaseDataService);
  contactLog = this.caseDataService.contactLog;
}
