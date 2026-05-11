import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Incident } from '../../../../shared/models/user.model';

@Component({
  selector: 'app-agent-history',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './agent-history.html',
  styleUrl: './agent-history.scss',
})
export class AgentHistoryComponent {
  @Input() tickets: Incident[] = [];
  @Output() openDrawer = new EventEmitter<Incident>();
  @Output() goToCreate = new EventEmitter<void>();

  getPriorityClass(priority: string): string {
    const map: Record<string, string> = {
      Crítica: 'priority-critical',
      Critica: 'priority-critical',
      Alta: 'priority-high',
      Normal: 'priority-medium',
      Baja: 'priority-low',
    };
    return map[priority] ?? '';
  }
}
