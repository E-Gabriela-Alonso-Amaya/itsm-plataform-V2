import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Incident, User } from '../../../../shared/models/user.model';

@Component({
  selector: 'app-agent-work',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './agent-work.html',
  styleUrl: './agent-work.scss',
})
export class AgentWorkComponent {
  @Input() user: User | null = null;
  @Input() agentStats: any = null;
  
  // Kanban Columns
  @Input() colAvailable: Incident[] = [];
  @Input() colMine: Incident[] = [];
  @Input() colInProgress: Incident[] = [];
  @Input() colWaiting: Incident[] = [];
  @Input() colDone: Incident[] = [];

  @Output() openDrawer = new EventEmitter<Incident>();
  @Output() assign = new EventEmitter<Incident>();
  @Output() updateStatus = new EventEmitter<{ticket: Incident, status: string}>();

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

  getSlaProgress(ticket: Incident): number {
    if (!ticket.slaHours || !ticket.createdAt) return 0;
    const startAt = ticket.startedAt || ticket.createdAt;
    if (!startAt) return 0;
    const start = new Date(startAt).getTime();
    const end = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : new Date().getTime();
    
    // Restar tiempo pausado
    const totalPaused = (ticket.totalPausedMs || 0);
    const currentPause = ticket.pausedAt ? (new Date().getTime() - new Date(ticket.pausedAt).getTime()) : 0;
    
    const elapsedMs = (end - start) - totalPaused - currentPause;
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    
    const progress = (elapsedHours / ticket.slaHours) * 100;
    const rounded = Math.round(progress * 100) / 100;
    
    return Math.max(rounded, 0); 
  }

  getSlaWidth(ticket: Incident): number {
    return Math.min(this.getSlaProgress(ticket), 100);
  }

  getSlaColor(ticket: Incident): string {
    const progress = this.getSlaProgress(ticket);
    if (progress >= 100) return '#ef4444'; // Rojo si supera o iguala el 100%
    if (progress > 80) return '#f59e0b';  // Ámbar si supera el 80%
    return '#10b981'; // Verde por defecto
  }

  getElapsedTime(ticket: Incident): string {
    const startAt = ticket.startedAt || ticket.createdAt;
    if (!startAt) return '';
    const start = new Date(startAt).getTime();
    const end = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : new Date().getTime();
    
    // Restar tiempo pausado
    const totalPaused = (ticket.totalPausedMs || 0);
    const currentPause = ticket.pausedAt ? (new Date().getTime() - new Date(ticket.pausedAt).getTime()) : 0;
    
    const diffMs = (end - start) - totalPaused - currentPause;
    
    const isOverdue = diffMs < 0 && ticket.slaHours ? false : (ticket.slaHours ? (diffMs / (1000*60*60) > ticket.slaHours) : false);
    // Realmente queremos el tiempo transcurrido "efectivo"
    const absDiffMs = Math.abs(diffMs);
    const hours = Math.floor(absDiffMs / (1000 * 60 * 60));
    const mins = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    return diffMs < 0 ? `-${timeStr}` : timeStr;
  }
}
