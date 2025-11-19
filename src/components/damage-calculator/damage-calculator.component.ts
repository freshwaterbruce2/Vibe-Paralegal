import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { CaseDataService } from '../../services/case-data.service';
import { DamageValues } from '../../models';

@Component({
  selector: 'app-damage-calculator',
  templateUrl: './damage-calculator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe]
})
export class DamageCalculatorComponent {
  caseDataService = inject(CaseDataService);
  damageCalculator = this.caseDataService.damageCalculator;
  totalDamages = this.caseDataService.totalDamages;

  handleDamageInput(field: keyof DamageValues, event: Event) {
    const value = (event.target as HTMLInputElement).valueAsNumber || 0;
    this.damageCalculator.update(d => ({ ...d, [field]: value }));
  }
}
