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
  @Input() isTablet: boolean = false;
  @Input() activeKanbanTab: string = 'new';
  @Input() agents: Agent[] = [];
  @Input() assignDropdownId: string | null = null;
  @Input() assigningId: string | null = null;
  @Input() selectedTicket: Incident | null = null;
  private _selectedCompany: string = 'global';

  @Input()
  set selectedCompany(value: string) {
    this._selectedCompany = value;
    if (value === 'global') {
      this.activeGlobalChart = 'workload';
    } else {
      this.activeGlobalChart = null;
    }
  }

  get selectedCompany(): string {
    return this._selectedCompany;
  }

  @Input() currentUserId: string = '';
  @Input() currentUserRole: string = '';
  @Input() goalResolutionTime: number = 2;
  @Input() priorityDropdownId: string | null = null;
  @Output() viewHistory = new EventEmitter<void>();

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

  activeGlobalChart: 'workload' | 'response' | 'satisfaction' | 'performance' | null = 'workload';

  toggleChart(chart: 'workload' | 'response' | 'satisfaction' | 'performance'): void {
    if (this.selectedCompany === 'global') {
      this.activeGlobalChart = chart;
    } else {
      if (this.activeGlobalChart === chart) {
        this.activeGlobalChart = null;
      } else {
        this.activeGlobalChart = chart;
      }
    }
  }

  get workloadChartData() {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('es-ES', { weekday: 'short' });
      
      const createdCount = this.allCompanyIncidents.filter(inc => {
        const cDate = new Date(inc.createdAt);
        return cDate.getDate() === d.getDate() && cDate.getMonth() === d.getMonth() && cDate.getFullYear() === d.getFullYear();
      }).length;

      const resolvedCount = this.allCompanyIncidents.filter(inc => {
        if (!inc.resolvedAt && !inc.updatedAt) return false;
        if (!inc.isClosed && inc.status !== 'Resuelto' && inc.status !== 'Cerrado') return false;
        const rDate = new Date(inc.resolvedAt || inc.updatedAt!);
        return rDate.getDate() === d.getDate() && rDate.getMonth() === d.getMonth() && rDate.getFullYear() === d.getFullYear();
      }).length;

      data.push({ label, created: createdCount, resolved: resolvedCount, fullDate: d });
    }
    const highestVal = Math.max(...data.map(d => Math.max(d.created, d.resolved)), 5);
    return data.map(d => ({
      ...d,
      createdHeight: (d.created / highestVal) * 100,
      resolvedHeight: (d.resolved / highestVal) * 100
    }));
  }

  get responseChartData() {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('es-ES', { weekday: 'short' });
      
      const resolvedThatDay = this.allCompanyIncidents.filter(inc => {
        if (!inc.resolvedAt && !inc.updatedAt) return false;
        if (!inc.isClosed && inc.status !== 'Resuelto' && inc.status !== 'Cerrado') return false;
        const rDate = new Date(inc.resolvedAt || inc.updatedAt!);
        return rDate.getDate() === d.getDate() && rDate.getMonth() === d.getMonth() && rDate.getFullYear() === d.getFullYear();
      });

      let avg = 0;
      if (resolvedThatDay.length > 0) {
        let totalHours = 0;
        resolvedThatDay.forEach(inc => {
           const start = new Date(inc.createdAt).getTime();
           const end = new Date(inc.resolvedAt || inc.updatedAt!).getTime();
           totalHours += (end - start) / (1000 * 60 * 60);
        });
        avg = totalHours / resolvedThatDay.length;
      }
      data.push({ label, value: parseFloat(avg.toFixed(1)), fullDate: d });
    }
    const highest = Math.max(...data.map(d => d.value), this.goalResolutionTime * 2 || 10);
    return data.map(d => ({ ...d, height: (d.value / highest) * 100 }));
  }

  get responseLinePoints() {
    const rawData = this.responseChartData;
    const highestVal = Math.max(...rawData.map(d => d.value), 4);
    
    const svgWidth = 600;
    const svgHeight = 200;
    const paddingX = 40;
    const paddingY = 30;
    
    const usableWidth = svgWidth - paddingX * 2;
    const usableHeight = svgHeight - paddingY * 2;
    const stepX = usableWidth / 6;

    return rawData.map((d, i) => {
      const x = paddingX + i * stepX;
      const ratio = highestVal > 0 ? d.value / highestVal : 0;
      const y = svgHeight - paddingY - (ratio * usableHeight);
      return {
        x,
        y,
        label: d.label,
        value: d.value,
        fullDate: d.fullDate
      };
    });
  }

  get responseLineChartPath(): string {
    const points = this.responseLinePoints;
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }

  get responseLineChartAreaPath(): string {
    const points = this.responseLinePoints;
    if (points.length === 0) return '';
    const path = this.responseLineChartPath;
    const first = points[0];
    const last = points[points.length - 1];
    const svgHeight = 200;
    const paddingY = 30;
    const baselineY = svgHeight - paddingY;
    return `${path} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z`;
  }

  get satisfactionChartData() {
    const data = [
      { label: '5 Estrellas', stars: 5, value: 0 },
      { label: '4 Estrellas', stars: 4, value: 0 },
      { label: '3 Estrellas', stars: 3, value: 0 },
      { label: '2 Estrellas', stars: 2, value: 0 },
      { label: '1 Estrella', stars: 1, value: 0 }
    ];

    const rated = this.allCompanyIncidents.filter(i => typeof i.rating === 'number' && i.rating > 0);
    rated.forEach(inc => {
      const starLevel = Math.round(inc.rating!);
      const bucket = data.find(d => d.stars === starLevel);
      if (bucket) bucket.value++;
    });

    const highest = Math.max(...data.map(d => d.value), 5);
    return data.map(d => ({ ...d, width: (d.value / highest) * 100 }));
  }

  get allAgentsPerformanceData() {
    const pureAgents = this.agents.filter(a => !a.roles.includes('ROLE_ADMIN'));
    
    let companyAgents = pureAgents;
    if (this.selectedCompany !== 'global') {
      companyAgents = pureAgents.filter(agent => 
        agent.companies?.some(c => c.id === this.selectedCompany)
      );
    }
    
    return companyAgents.map(agent => {
      const assignedTickets = this.allCompanyIncidents.filter(i => i.assignedToId === agent.id);
      const resolvedTickets = assignedTickets.filter(i => i.isClosed || i.status === 'Resuelto' || i.status === 'Cerrado');
      
      const assignedCount = assignedTickets.length;
      const resolvedCount = resolvedTickets.length;
      const performance = assignedCount > 0 ? Math.round((resolvedCount / assignedCount) * 100) : 0;
      
      let avgResolutionTime = 0;
      const resolvedWithTimes = resolvedTickets.filter(i => i.createdAt && (i.resolvedAt || i.updatedAt));
      if (resolvedWithTimes.length > 0) {
        let totalHours = 0;
        resolvedWithTimes.forEach(inc => {
          const start = new Date(inc.createdAt).getTime();
          const end = new Date(inc.resolvedAt || inc.updatedAt!).getTime();
          totalHours += (end - start) / (1000 * 60 * 60);
        });
        avgResolutionTime = parseFloat((totalHours / resolvedWithTimes.length).toFixed(1));
      }
      
      return {
        id: agent.id,
        name: agent.name,
        assigned: assignedCount,
        resolved: resolvedCount,
        performance: performance,
        avgTime: avgResolutionTime
      };
    }).sort((a, b) => b.assigned - a.assigned);
  }

  @Output() setDashboardTab = new EventEmitter<'queue' | 'my-tickets'>();
  @Output() loadQueue = new EventEmitter<void>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() setKanbanTab = new EventEmitter<string>();
  @Output() openDrawer = new EventEmitter<Incident>();
  @Output() assignToMe = new EventEmitter<Incident>();
  @Output() toggleAssignDropdown = new EventEmitter<string>();
  @Output() quickAssignToAgent = new EventEmitter<{ticket: Incident, agentId: string}>();
  @Output() updateStatus = new EventEmitter<{ticket: Incident, status: string}>();
  @Output() updatePriority = new EventEmitter<{ticket: Incident, priorityId: number}>();
  @Output() togglePriorityDropdown = new EventEmitter<string>();
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
