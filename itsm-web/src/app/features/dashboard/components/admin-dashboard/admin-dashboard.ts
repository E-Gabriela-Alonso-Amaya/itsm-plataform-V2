import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Incident, Agent, Category, Priority } from '../../../../shared/models/user.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboardComponent {
  @Input() totalIncidents: number = 0;
  @Input() globalStats: any = null;
  @Input() adminDashboardTab: 'queue' | 'my-tickets' = 'queue';
  @Input() allCompanyIncidents: Incident[] = [];
  @Input() filterPriority: string = '';
  @Input() filterCategory: string = '';
  @Input() priorities: Priority[] = [];
  @Input() categories: Category[] = [];
  @Input() isMobile: boolean = false;
  @Input() activeKanbanTab: string = 'new';
  @Input() agents: Agent[] = [];
  @Input() assignDropdownId: string | null = null;
  @Input() assigningId: string | null = null;
  @Input() selectedTicket: Incident | null = null;
  @Input() selectedCompany: string = 'global';
  @Input() currentUserId: string = '';
  @Input() currentUserRole: string = '';
  @Input() goalResolutionTime: number = 2;

  // Kanban Columns
  @Input() colNew: Incident[] = [];
  @Input() colAssignedPanel: Incident[] = [];
  @Input() colProcessingPanel: Incident[] = [];
  @Input() colWaitingPanel: Incident[] = [];
  @Input() colDonePanel: Incident[] = [];
  
  // My Tickets Admin Columns
  @Input() colAdminAssigned: Incident[] = [];
  @Input() colAdminProcessing: Incident[] = [];
  @Input() colAdminProgress: Incident[] = [];
  @Input() colAdminWaiting: Incident[] = [];
  @Input() colAdminDone: Incident[] = [];

  @Output() setDashboardTab = new EventEmitter<'queue' | 'my-tickets'>();
  @Output() loadQueue = new EventEmitter<void>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() setKanbanTab = new EventEmitter<string>();
  @Output() openDrawer = new EventEmitter<Incident>();
  @Output() assignToMe = new EventEmitter<Incident>();
  @Output() toggleAssignDropdown = new EventEmitter<string>();
  @Output() quickAssignToAgent = new EventEmitter<{ticket: Incident, agentId: string}>();
  @Output() updateStatus = new EventEmitter<{ticket: Incident, status: string}>();
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

  onFilterChange() {
    this.loadQueue.emit();
  }

  onAssignAgent(ticket: Incident, agentId: string) {
    this.quickAssignToAgent.emit({ticket, agentId});
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
    const rounded = Math.round(progress * 100) / 100;
    return Math.max(rounded, 0);
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

  /** Tiempo total desde creación (para columnas Nuevo/Asignado) */
  getCreationTime(ticket: Incident): string {
    if (!ticket.createdAt) return '';
    const start = new Date(ticket.createdAt).getTime();
    const end = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : new Date().getTime();
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  /** Tiempo de trabajo real (desde startedAt) */
  getWorkTime(ticket: Incident): string {
    if (!ticket.startedAt) return '0m';
    const start = new Date(ticket.startedAt).getTime();
    const end = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : new Date().getTime();
    
    const totalPaused = (ticket.totalPausedMs || 0);
    const currentPause = ticket.pausedAt ? (new Date().getTime() - new Date(ticket.pausedAt).getTime()) : 0;
    
    const diffMs = (end - start) - totalPaused - currentPause;
    const absDiffMs = Math.abs(diffMs);
    const hours = Math.floor(absDiffMs / (1000 * 60 * 60));
    const mins = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  get workloadPercentage(): number {
    // Calcula un porcentaje basado en la cantidad de tickets asumiendo 100 como una carga muy alta
    return Math.min(Math.round((this.totalIncidents / 100) * 100), 100);
  }

  get totalToday(): number {
    const today = new Date();
    today.setHours(0,0,0,0);
    return this.allCompanyIncidents.filter(i => {
      const created = new Date(i.createdAt);
      return created >= today;
    }).length;
  }

  get totalPreviousUnresolved(): number {
    const today = new Date();
    today.setHours(0,0,0,0);
    return this.allCompanyIncidents.filter(i => {
      const created = new Date(i.createdAt);
      return created < today && !i.isClosed && i.status !== 'Resuelto' && i.status !== 'Cerrado';
    }).length;
  }

  /** Determina si se debe mostrar la barra de SLA según el estado */
  shouldShowSla(status: string): boolean {
    const activeStatuses = ['Procesando', 'En progreso', 'Espera info', 'Espera', 'Pendiente', 'Espera información'];
    return activeStatuses.includes(status);
  }

  /** Determina el color de la barra según el estado (para columnas sin SLA activo) */
  getQueueColor(status: string): string {
    const s = status?.toLowerCase();
    if (s === 'asignado' || s === 'asignados' || s === 'assigned') return '#7c3aed'; // Púrpura
    return '#9ca3af'; // Gris
  }
  get satisfactionScore(): string {
    const ratedIncidents = this.allCompanyIncidents.filter(i => typeof i.rating === 'number' && i.rating > 0);
    
    if (ratedIncidents.length === 0) {
      return '0';
    }

    const total = ratedIncidents.reduce((sum, i) => sum + i.rating!, 0);
    const avg = total / ratedIncidents.length;
    return avg.toFixed(1);
  }

  get avgResponseTime(): string {
    if (this.selectedCompany === 'global' && this.globalStats?.avgResponseTime) {
      return this.globalStats.avgResponseTime;
    }

    const resolvedTickets = this.allCompanyIncidents.filter(i => 
      (i.isClosed || i.status === 'Resuelto' || i.status === 'Cerrado') && 
      i.createdAt && 
      (i.resolvedAt || i.updatedAt)
    );

    if (resolvedTickets.length === 0) {
      return '0h';
    }

    let totalHours = 0;
    resolvedTickets.forEach(ticket => {
      const start = new Date(ticket.createdAt).getTime();
      const endAt = ticket.resolvedAt ? ticket.resolvedAt : ticket.updatedAt;
      const end = new Date(endAt!).getTime();
      
      const diffHours = (end - start) / (1000 * 60 * 60);
      if (diffHours > 0) totalHours += diffHours;
    });

    const avg = totalHours / resolvedTickets.length;
    return avg.toFixed(1) + 'h';
  }

  get satisfactionStars(): number[] {
    const scoreStr = this.satisfactionScore;
    if (scoreStr === '0') return [];
    const score = parseFloat(scoreStr);
    const fullStars = Math.floor(score);
    return Array(fullStars).fill(0).map((_, i) => i + 1);
  }

  get hasHalfStar(): boolean {
    if (this.satisfactionScore === '0') return false;
    const score = parseFloat(this.satisfactionScore);
    return (score % 1) >= 0.5;
  }

  get topAgentsDynamic(): any[] {
    if (this.selectedCompany === 'global' && this.globalStats?.topAgents) {
      // Filtrar los administradores de la lista global
      return this.globalStats.topAgents.filter((a: any) => {
        const agentObj = this.agents.find(ag => ag.name === a.name);
        return agentObj ? !agentObj.roles.includes('ROLE_ADMIN') : true;
      });
    }

    // Filtrar administradores
    const pureAgents = this.agents.filter(a => !a.roles.includes('ROLE_ADMIN'));

    // Si estamos en una empresa específica, filtramos por agentes ASIGNADOS a esa empresa
    // aunque no tengan tickets todavía.
    let companyAgents = pureAgents;
    if (this.selectedCompany !== 'global') {
      companyAgents = pureAgents.filter(agent => 
        agent.companies?.some(c => c.id === this.selectedCompany)
      );
    }

    // Calcular estadísticas basadas en los tickets de la empresa seleccionada
    const agentStats = companyAgents.map(agent => {
      const assignedTickets = this.allCompanyIncidents.filter(i => i.assignedToId === agent.id);
      const resolvedTickets = assignedTickets.filter(i => i.isClosed || i.status === 'Resuelto' || i.status === 'Cerrado');
      
      const assignedCount = assignedTickets.length;
      const resolvedCount = resolvedTickets.length;
      const performance = assignedCount > 0 ? Math.round((resolvedCount / assignedCount) * 100) : 0;
      
      return {
        name: agent.name,
        resolved: resolvedCount,
        performance: performance,
        assigned: assignedCount
      };
    });

    // Mostrar agentes asignados (aunque tengan 0 tickets)
    agentStats.sort((a, b) => b.resolved - a.resolved);
    return agentStats.slice(0, 4);
  }
}
