import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseDataService } from '../../services/case-data.service';

@Component({
  selector: 'app-evidence-log',
  templateUrl: './evidence-log.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class EvidenceLogComponent {
  caseDataService = inject(CaseDataService);
  evidenceHave = this.caseDataService.evidenceHave;
  evidenceNeed = this.caseDataService.evidenceNeed;

  toggleEvidenceHaveItem(id: number) {
    this.evidenceHave.update(items => items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  }

  toggleEvidenceNeedItem(id: number) {
    this.evidenceNeed.update(items => items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  }
}
