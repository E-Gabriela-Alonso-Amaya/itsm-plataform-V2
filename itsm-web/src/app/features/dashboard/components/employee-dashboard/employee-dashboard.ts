import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
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
  encapsulation: ViewEncapsulation.None,
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

  /** Tickets activos: en proceso, nuevos, abiertos (no en espera ni resueltos) */
  get colActive(): Incident[] {
    const waitingStatuses = ['Espera info', 'Pendiente'];
    const doneStatuses = ['Resuelto', 'Cerrado'];
    return this.incidentsOpen.filter(
      t => !waitingStatuses.includes(t.status) && !doneStatuses.includes(t.status)
    );
  }

  /** Tickets en espera de respuesta del empleado */
  get colWaiting(): Incident[] {
    const waitingStatuses = ['Espera info', 'Pendiente'];
    return this.incidentsOpen.filter(t => waitingStatuses.includes(t.status));
  }

  getSlaProgress(ticket: Incident): number {
    if (!ticket.slaHours || !ticket.createdAt) return 0;
    const startAt = ticket.startedAt || ticket.createdAt;
    if (!startAt) return 0;
    const start = new Date(startAt).getTime();
    const end = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : new Date().getTime();
    const totalPaused = (ticket.totalPausedMs || 0);
    const currentPause = ticket.pausedAt ? (new Date().getTime() - new Date(ticket.pausedAt).getTime()) : 0;
    const elapsedMs = (end - start) - totalPaused - currentPause;
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    const progress = (elapsedHours / ticket.slaHours) * 100;
    return Math.max(Math.round(progress * 100) / 100, 0);
  }

  getSlaWidth(ticket: Incident): number {
    return Math.min(this.getSlaProgress(ticket), 100);
  }

  getSlaColor(ticket: Incident): string {
    const progress = this.getSlaProgress(ticket);
    if (progress >= 100) return '#ef4444';
    if (progress > 80) return '#f59e0b';
    return '#10b981';
  }

  getElapsedTime(ticket: Incident): string {
    const startAt = ticket.startedAt || ticket.createdAt;
    if (!startAt) return '';
    const start = new Date(startAt).getTime();
    const end = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : new Date().getTime();
    const totalPaused = (ticket.totalPausedMs || 0);
    const currentPause = ticket.pausedAt ? (new Date().getTime() - new Date(ticket.pausedAt).getTime()) : 0;
    const diffMs = (end - start) - totalPaused - currentPause;
    const absDiffMs = Math.abs(diffMs);
    const hours = Math.floor(absDiffMs / (1000 * 60 * 60));
    const mins = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    return diffMs < 0 ? `-${timeStr}` : timeStr;
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
