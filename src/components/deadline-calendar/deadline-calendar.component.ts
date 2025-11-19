import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseDataService } from '../../services/case-data.service';

@Component({
  selector: 'app-deadline-calendar',
  templateUrl: './deadline-calendar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class DeadlineCalendarComponent {
  caseDataService = inject(CaseDataService);
  deadlineCalendar = this.caseDataService.deadlineCalendar;
}
