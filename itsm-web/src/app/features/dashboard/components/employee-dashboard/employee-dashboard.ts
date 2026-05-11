import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Incident } from '../../../../shared/models/user.model';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './employee-dashboard.html',
  styleUrl: './employee-dashboard.scss',
})
export class EmployeeDashboardComponent {
  @Input() incidentsOpen: Incident[] = [];
  @Input() incidentsResolved: Incident[] = [];
  @Input() allMyIncidents: Incident[] = [];
  @Input() loadingList = false;
  
  @Output() openDrawer = new EventEmitter<Incident>();
  @Output() goToCreate = new EventEmitter<void>();
  @Output() rateTicket = new EventEmitter<{ticket: Incident, rating: number}>();

  onRate(event: MouseEvent, t: Incident, stars: number) {
    event.stopPropagation();
    this.rateTicket.emit({ ticket: t, rating: stars });
  }

  // Input helpers passed from parent
  @Input() hasUnreadComments!: (id: string) => boolean;
  @Input() hasComments!: (id: string) => boolean;

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
