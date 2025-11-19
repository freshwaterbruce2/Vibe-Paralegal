import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseDataService } from '../../services/case-data.service';

@Component({
  selector: 'app-action-tracker',
  templateUrl: './action-tracker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class ActionTrackerComponent {
  caseDataService = inject(CaseDataService);
  actionTracker = this.caseDataService.actionTracker;

  toggleActionTrackerItem(id: number) {
    this.actionTracker.update(items => items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  }
}
