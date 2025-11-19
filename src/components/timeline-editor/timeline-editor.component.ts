import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseDataService } from '../../services/case-data.service';

@Component({
  selector: 'app-timeline-editor',
  templateUrl: './timeline-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class TimelineEditorComponent {
  caseDataService = inject(CaseDataService);
  masterTimeline = this.caseDataService.masterTimeline;

  handleTimelineInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.masterTimeline.set(textarea.value);
  }
}
