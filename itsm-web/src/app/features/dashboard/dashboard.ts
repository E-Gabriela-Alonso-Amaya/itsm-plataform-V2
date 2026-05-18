import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/services/auth';
import { ApiService } from '../../core/services/api';
import { IncidentService } from '../../core/services/incident';
import { CommentService } from '../../core/services/comment';
import { CategoryService } from '../../core/services/category';
import { PriorityService } from '../../core/services/priority';
import { UserService } from '../../core/services/user.service';
import {
  User,
  Incident,
  Category,
  Priority,
  Comment,
  Agent,
  Status,
} from '../../shared/models/user.model';
import { StatusService } from '../../core/services/status.service';
import { AuditService } from '../../core/services/audit.service';
import { AuditLog } from '../../shared/models/user.model';
import { AttachmentService } from '../../core/services/attachment.service';
import { Attachment } from '../../shared/models/attachment.model';
import { SecureImagePipe } from '../../core/pipes/secure-image-pipe';
import { TopbarComponent } from './components/topbar/topbar';
import { SidebarComponent } from './components/sidebar/sidebar';
import { DrawerEmployeeComponent } from './components/drawer-employee/drawer-employee';
import { LightboxComponent } from './components/lightbox/lightbox';
import { AllIncidentsComponent } from './components/all-incidents/all-incidents.component';
import { AdminPanelComponent } from '../admin/admin-panel';
import { CompanyService } from '../../core/services/company.service';
import { ProfileComponent } from './components/profile/profile';
import { AgentWorkComponent } from './components/agent-work/agent-work';
import { EmployeeDashboardComponent } from './components/employee-dashboard/employee-dashboard';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard';
import { MyIncidentsComponent } from './components/my-incidents/my-incidents';
import { TicketInspectorComponent } from './components/ticket-inspector/ticket-inspector';
import { DashboardHeaderComponent } from './components/dashboard-header/dashboard-header';
import { StatusMessageComponent } from './components/status-message/status-message';
import { SystemSettingsComponent } from './components/system-settings/system-settings';

type ActiveView = 'dashboard' | 'queue' | 'all' | 'mine' | 'profile' | 'admin' | 'admin_users' | 'admin_invite' | 'admin_matrix' | 'admin_projects' | 'admin_config_tech' | 'admin_ui' | 'admin_audit' | 'admin_history' | 'agent_work' | 'agent_history' | 'settings';

const STATUS_COL: Record<string, string> = {
  Nuevo: 'new',
  Abierta: 'new',
  Procesando: 'progress',
  'Espera info': 'waiting',
  Pendiente: 'waiting',
  Espera: 'waiting',
  Cerrado: 'done',
  Resuelto: 'done',
};

const PRIORITY_ORDER: Record<string, number> = {
  'Crítica': 1,
  'Critica': 1,
  'Alta': 2,
  'Media': 3,
  'Normal': 3,
  'Baja': 4,
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatInputModule,
    TopbarComponent,
    SidebarComponent,
    DrawerEmployeeComponent,
    LightboxComponent,
    AllIncidentsComponent,
    AdminPanelComponent,
    ProfileComponent,
    AgentWorkComponent,
    EmployeeDashboardComponent,
    AdminDashboardComponent,
    MyIncidentsComponent,
    TicketInspectorComponent,
    DashboardHeaderComponent,
    SystemSettingsComponent,
    StatusMessageComponent,
  ],
  templateUrl: 'dashboard.html',
  styleUrl: 'dashboard.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  user: User | null = null;
  activeView: ActiveView | 'loading' = 'loading';
  selectedCompany: string = 'global';
  adminDashboardTab: 'queue' | 'my-tickets' = 'queue';

  // DATOS GENERALES
  incidents: Incident[] = [];
  incidentsOpen: Incident[] = [];
  incidentsResolved: Incident[] = [];
  allMyIncidents: Incident[] = [];
  incidentsOpenAdmin: Incident[] = [];
  incidentsResolvedAdmin: Incident[] = [];
  queueIncidents: Incident[] = [];
  categories: Category[] = [];
  priorities: Priority[] = [];
  statuses: Status[] = [];
  users: User[] = [];
  agents: Agent[] = [];
  auditLogs: AuditLog[] = [];

  // ADJUNTOS
  attachments: Attachment[] = [];
  loadingAttachments = false;
  uploadingAttachment = false;
  deletingAttachmentId: string | null = null;
  pendingFile: File | null = null;
  pendingDescription = '';
  isDragOver = false;
  previewAttachment: Attachment | null = null;

  commentsByTicket: Record<string, number> = {};
  ticketsWithUnreadComments: Set<string> = new Set<string>();

  priorityDropdownId: string | null = null;
  loadingList = false;
  loadingQueue = false;
  filterPriority = '';
  filterCategory = '';

  // Kanban Columns
  colNew: Incident[] = [];
  colAssignedPanel: Incident[] = [];
  colProcessingPanel: Incident[] = [];
  colWaitingPanel: Incident[] = [];
  colDonePanel: Incident[] = [];

  colAvailable: Incident[] = [];
  colMine: Incident[] = [];
  colInProgress: Incident[] = [];
  colWaiting: Incident[] = [];
  colDone: Incident[] = [];

  colAdminAssigned: Incident[] = [];
  colAdminProgress: Incident[] = [];
  colAdminWaiting: Incident[] = [];
  colAdminDone: Incident[] = [];

  // DRAWER / INSPECTOR
  drawerOpen = false;
  selectedTicket: Incident | null = null;

  // CHAT
  comments: Comment[] = [];
  loadingComments = false;
  newComment = '';
  sendingComment = false;

  // ASIGNACIÓN
  selectedAgentId = '';
  assigningAgent = false;
  changingStatus = false;

  // MENSAJES
  successMsg = '';
  errorMsg = '';
  assigningId: string | null = null;
  unassignedCount: number = 0;
  totalIncidents: number = 0;

  // PERFIL (Movido a ProfileComponent)

  get myCreatedTickets(): Incident[] {
    return this.incidents.filter(i => i.reportedById === this.user?.id).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  get myWorkedTickets(): Incident[] {
    return this.incidents.filter(i => i.assignedToId === this.user?.id).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  get myHistoryTickets(): Incident[] {
    return this.incidents.filter(i =>
      i.reportedById === this.user?.id || i.assignedToId === this.user?.id
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // STATS
  agentStats: any = null;
  globalStats: any = null;
  loadingStats = false;
  
  get goalResolutionTime(): number {
    const g = localStorage.getItem('itsm_goal_resolution_time');
    return g ? parseFloat(g) : 2;
  }

  // RESPONSIVE / UI
  sidebarOpen = false;
  activeKanbanTab = 'new';
  isMobile = false;
  isTablet = false;
  private resizeListener = () => this.checkScreen();

  displayedColumns = [
    'title',
    'category',
    'priority',
    'status',
    'reportedBy',
    'assignedTo',
    'createdAt',
  ];

  readonly STATUS_FLOW: Record<string, string[]> = {
    Nuevo: ['Procesando'],
    Abierta: ['Procesando'],
    Procesando: ['Resuelto'],
    'Espera info': ['Procesando', 'Resuelto'],
    Pendiente: ['Resuelto'],
    Espera: ['Resuelto'],
  };

  constructor(
    private authService: AuthService,
    private incidentService: IncidentService,
    private commentService: CommentService,
    private categoryService: CategoryService,
    private priorityService: PriorityService,
    private userService: UserService,
    private statusService: StatusService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private auditService: AuditService,
    private attachmentService: AttachmentService,
    private companyService: CompanyService,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    // 1. Escuchar cambios de empresa globalmente
    this.companyService.activeCompanyId$.subscribe(id => {
      setTimeout(() => {
        this.selectedCompany = id;
        this.refreshCurrentView();
        this.cdr.detectChanges();
      });
    });

    // 2. Datos de usuario
    this.authService.me().subscribe({
      next: (res: any) => {
        this.user = res.user;
        this.loadReadComments();
        this.loadMeta();

        if (this.isAdmin()) {
          this.activeView = 'dashboard';
          this.loadAgents();
        } else if (this.isAgent()) {
          this.activeView = 'agent_work';
        } else {
          this.activeView = 'dashboard';
        }

        this.cdr.detectChanges();
      },
      error: () => this.authService.logout(),
    });

    this.checkScreen();
    window.addEventListener('resize', this.resizeListener);

    this.pollingInterval = setInterval(() => {
      // Refrescar datos automáticamente en vistas de gestión
      const refreshViews = ['dashboard', 'agent_work', 'queue', 'mine', 'agent_history', 'admin_history'];
      if (refreshViews.includes(this.activeView)) {
        this.loadData();
      }
    }, 5000);
  }

  // ─── ROL
  isAdminOrAgent(): boolean {
    if (!this.user) return false;
    return this.user.roles.includes('ROLE_ADMIN') || this.user.roles.includes('ROLE_AGENT');
  }
  isAdmin(): boolean {
    return !!this.user?.roles.includes('ROLE_ADMIN');
  }
  isAgent(): boolean {
    return !!this.user?.roles.includes('ROLE_AGENT');
  }
  isEmployee(): boolean {
    return !this.isAdminOrAgent();
  }

  // ─── META
  loadMeta(): void {
    this.categoryService.getAll().subscribe((d: Category[]) => {
      Promise.resolve().then(() => {
        this.categories = d;
      });
    });

    this.priorityService.getAll().subscribe((d: Priority[]) => {
      const seen = new Set();
      const filtered = d.filter(p => {
        const val = p.name.trim();
        if (seen.has(val)) return false;
        seen.add(val);
        return true;
      });
      Promise.resolve().then(() => {
        this.priorities = filtered;
      });
    });

    this.statusService.getAll().subscribe((d: Status[]) => {
      Promise.resolve().then(() => {
        this.statuses = d;
      });
    });
    
    if (this.isAdminOrAgent()) {
      this.loadStats();
      this.loadAgents();
      if (this.isAdmin()) {
        this.userService.getUsers().subscribe(d => {
          Promise.resolve().then(() => {
            this.users = d;
          });
        });
      }
    }
  }

  loadAgents(): void {
    this.userService.getAgents().subscribe((d: Agent[]) => {
      Promise.resolve().then(() => {
        this.agents = d;
      });
    });
  }

  loadStats(): void {
    if (!this.user || !this.isAdminOrAgent()) return;
    this.loadingStats = true;
    this.api.get('/stats').subscribe({
      next: (data) => {
        // Combinamos datos reales con mock para el diseño premium si es necesario
        if (this.isAdmin()) {
          const agents = (data as any).agentPerformance || [];
          agents.sort((a: any, b: any) => b.closed - a.closed);
          const topAgents = agents.slice(0, 3).map((a: any) => ({
             name: a.name,
             resolved: a.closed,
             performance: a.performance
          }));

          this.globalStats = {
            ...(data as any),
            avgResponseTime: (data as any).avgGlobalResolutionTime !== undefined ? (data as any).avgGlobalResolutionTime + 'h' : '1.2h',
            satisfaction: 4.8, // Mock as it's not in the API yet
            topAgents: topAgents.length > 0 ? topAgents : [
              { name: 'Ana Lopez', resolved: 24, performance: 98 },
              { name: 'Carlos Ruiz', resolved: 21, performance: 92 },
              { name: 'Elena Sanz', resolved: 18, performance: 89 }
            ]
          };
        } else {
          // Las estadísticas del agente se calculan dinámicamente en updateKanbanColumns
          this.calculateAgentStats();
        }
        this.loadingStats = false;
        this.cdr.detectChanges();
      },
      error: () => {
        // Fallback mock para desarrollo/demo
        this.calculateAgentStats();
        this.globalStats = { avgResponseTime: '1.2h', totalResolved: 156, satisfaction: '4.8/5' };
        this.loadingStats = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ─── VISTAS
  onSidebarSetView(view: string): void {
    this.setView(view as ActiveView);
  }

  onSetCompany(companyId: string): void {
    this.companyService.setActiveCompany(companyId);
  }

  setView(view: ActiveView): void {
    this.activeView = view;
    // Cerrar inspector al cambiar de vista
    this.drawerOpen = false;
    this.selectedTicket = null;
    this.successMsg = '';
    this.errorMsg = '';

    if (view === 'dashboard' || view === 'agent_work') {
      if (this.isAdminOrAgent()) this.loadQueue();
      this.loadMine();
    } else if (view === 'all' || view === 'admin_history' || view === 'agent_history') {
      this.loadAll();
    } else if (view === 'mine') {
      this.loadMyCreated();
    } else if (view === 'profile') {
      // Logic moved to ProfileComponent
    }
    this.cdr.detectChanges();
  }

  setAdminTab(tab: 'queue' | 'my-tickets'): void {
    this.adminDashboardTab = tab;
    this.cdr.detectChanges();
  }

  // ─── REFRESCO AUTOMÁTICO (polling)
  loadData(): void {
    const view = this.activeView;
    if (this.isAdminOrAgent()) {
      if (view === 'dashboard' || view === 'agent_work' || view === 'queue') {
        this.loadQueue();
        this.loadMine();
        this.loadStats();
      } else if (view === 'agent_history' || view === 'admin_history') {
        this.loadAll();
      }
    } else {
      // Empleado
      if (view === 'dashboard') {
        this.loadMine();
      } else if (view === 'mine') {
        this.loadMyCreated();
      }
    }
    
    // Si hay un ticket abierto, refrescamos sus comentarios y adjuntos
    if (this.drawerOpen && this.selectedTicket) {
      this.loadComments(this.selectedTicket.id);
      this.loadAttachments(this.selectedTicket.id);
    }
  }

  // ─── KANBAN
  loadQueue(): void {
    this.loadingQueue = true;
    this.errorMsg = '';
    const filters: Record<string, string> = {};
    if (this.filterPriority) filters['priority'] = this.filterPriority;
    if (this.filterCategory) filters['category'] = this.filterCategory;

    this.incidentService.getQueue(filters).subscribe({
      next: (data: Incident[]) => {
        this.queueIncidents = this.isAdmin()
          ? data
          : data.filter((i) => !i.assignedToId || i.assignedToId === this.user?.id);
        this.totalIncidents = data.length;
        this.unassignedCount = data.filter((i) => !i.assignedTo).length;
        this.detectUnreadComments(this.queueIncidents);
        this.updateKanbanColumns();
        this.loadingQueue = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMsg = 'Error al cargar la cola';
        this.loadingQueue = false;
        this.cdr.detectChanges();
      },
    });
  }

  clearFilters(): void {
    this.filterPriority = '';
    this.filterCategory = '';
    this.loadQueue();
  }

  // Devuelve true si el ticket fue resuelto/cerrado en las últimas 24 horas.
  // Usa resolvedAt (backend) > updatedAt > createdAt en ese orden de preferencia.
  isWithin24h(ticket: Incident): boolean {
    const raw = (ticket as any).resolvedAt ?? (ticket as any).updatedAt ?? ticket.createdAt;
    if (!raw) return true;
    
    // Si ya viene en formato ISO o compatible con Date()
    const date = new Date(raw);
    if (isNaN(date.getTime())) return true; // fallback
    
    return Date.now() - date.getTime() <= 24 * 60 * 60 * 1000;
  }

  updateKanbanColumns(): void {
    // Admin Panel Columns
    this.colNew = this.queueIncidents.filter(
      (i) => !i.assignedTo && (!STATUS_COL[i.status] || STATUS_COL[i.status] === 'new'),
    );
    this.colAssignedPanel = this.queueIncidents.filter(
      (i) => i.assignedTo && !i.isClosed && STATUS_COL[i.status] === 'new',
    );
    this.colProcessingPanel = this.queueIncidents.filter((i) => !i.isClosed && STATUS_COL[i.status] === 'progress');
    this.colWaitingPanel = this.queueIncidents.filter((i) => !i.isClosed && STATUS_COL[i.status] === 'waiting');
    this.colDonePanel = this.queueIncidents.filter(
      (i) => (STATUS_COL[i.status] === 'done' || i.isClosed) && this.isWithin24h(i),
    );

    // Agent Work Columns
    const myCatNames = this.user?.categories?.map(c => c.name) || [];
    this.colAvailable = this.queueIncidents.filter(i => 
      !i.assignedTo && myCatNames.includes(i.category)
    );
    this.colMine = this.queueIncidents.filter(
      (i) => i.assignedToId === this.user?.id && !i.isClosed && (STATUS_COL[i.status] === 'new' || !STATUS_COL[i.status])
    );
    this.colInProgress = this.queueIncidents.filter(
      (i) => i.assignedToId === this.user?.id && !i.isClosed && STATUS_COL[i.status] === 'progress'
    );
    this.colWaiting = this.queueIncidents.filter(
      (i) => i.assignedToId === this.user?.id && !i.isClosed && STATUS_COL[i.status] === 'waiting'
    );
    this.colDone = this.queueIncidents.filter(
      (i) => i.assignedToId === this.user?.id && (i.isClosed || STATUS_COL[i.status] === 'done') && this.isWithin24h(i)
    );

    // Admin "My Tickets" tab
    this.colAdminAssigned = this.incidentsOpenAdmin.filter(
      (i) => i.assignedToId === this.user?.id && !i.isClosed && (STATUS_COL[i.status] === 'new' || !STATUS_COL[i.status]),
    );
    this.colAdminProgress = this.incidentsOpenAdmin.filter(
      (i) => i.assignedToId === this.user?.id && !i.isClosed && STATUS_COL[i.status] === 'progress',
    );
    this.colAdminWaiting = this.incidentsOpenAdmin.filter(
      (i) => i.assignedToId === this.user?.id && !i.isClosed && STATUS_COL[i.status] === 'waiting',
    );
    this.colAdminDone = this.incidentsResolvedAdmin.filter(i => this.isWithin24h(i));

    this.calculateAgentStats();
  }

  private calculateAgentStats(): void {
    if (!this.user || !this.isAgent()) return;

    const myTickets = this.queueIncidents.filter(i => i.assignedToId === this.user?.id);
    const resolvedTickets = myTickets.filter(i => i.isClosed || STATUS_COL[i.status] === 'done');
    const activeTickets = myTickets.filter(i => !i.isClosed && STATUS_COL[i.status] !== 'done');

    // 1. Mis Activos
    const myActiveCount = activeTickets.length;

    // 2. Resueltos Hoy
    const today = new Date();
    const myResolvedToday = resolvedTickets.filter(i => {
      const dateStr = (i as any).resolvedAt ?? (i as any).updatedAt ?? i.createdAt;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    }).length;

    // 3. Tiempo Medio de Resolución
    let avgResolutionTime = '0h';
    const resolvedWithTimes = resolvedTickets.filter(i => i.startedAt && (i as any).resolvedAt);
    if (resolvedWithTimes.length > 0) {
      let totalMs = 0;
      resolvedWithTimes.forEach(i => {
        const start = new Date(i.startedAt!).getTime();
        const end = new Date((i as any).resolvedAt!).getTime();
        const paused = i.totalPausedMs || 0;
        totalMs += (end - start) - paused;
      });
      const avgMs = totalMs / resolvedWithTimes.length;
      const avgHours = avgMs / (1000 * 60 * 60);
      avgResolutionTime = avgHours.toFixed(1) + 'h';
    }

    // 4. Alertas SLA (tickets activos que superan el 100%)
    let slaAlerts = 0;
    activeTickets.forEach(i => {
      if (i.slaHours && i.createdAt) {
        const startAt = i.startedAt || i.createdAt;
        const start = new Date(startAt).getTime();
        const end = new Date().getTime();
        const totalPaused = (i.totalPausedMs || 0);
        const currentPause = i.pausedAt ? (new Date().getTime() - new Date(i.pausedAt).getTime()) : 0;
        const elapsedMs = (end - start) - totalPaused - currentPause;
        const elapsedHours = elapsedMs / (1000 * 60 * 60);
        if (elapsedHours >= i.slaHours) {
          slaAlerts++;
        }
      }
    });

    this.agentStats = {
      myActiveCount,
      myResolvedToday,
      avgResolutionTime,
      slaAlerts
    };
  }

  // ─── LISTA TODAS
  loadAll(): void {
    this.loadingList = true;
    this.incidentService.getAll().subscribe({
      next: (data: Incident[]) => {
        this.incidents = this.sortByPriority(data);
        this.loadingList = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingList = false;
      },
    });
  }

  // ─── MIS INCIDENCIAS
  // Usado por admin y agente en la vista "mine" del sidebar
  loadMyCreated(): void {
    this.loadingList = true;
    this.incidentService.getAll().subscribe({
      next: (data: Incident[]) => {
        const mine = this.sortByPriority(data).filter((i) => i.reportedById === this.user?.id);
        this.incidentsOpenAdmin = mine.filter((i) => !i.isClosed);
        this.incidentsResolvedAdmin = mine.filter((i) => i.isClosed);
        this.detectUnreadComments(this.incidentsOpenAdmin);
        this.loadingList = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingList = false;
      },
    });
  }

  loadMine(): void {
    this.loadingList = true;
    this.incidentService.getAll().subscribe({
      next: (data: Incident[]) => {
        const sorted = this.isAdminOrAgent()
          ? this.sortByPriority(data)
          : data.sort((a, b) => (a.isClosed === b.isClosed ? 0 : a.isClosed ? 1 : -1));

        this.incidents = sorted;

        if (this.isEmployee()) {
          const allMine = sorted.filter(i => i.reportedById === this.user?.id);
          this.allMyIncidents = allMine;
          this.incidentsOpen = allMine.filter((i) => !i.isClosed);
          this.incidentsResolved = allMine.filter((i) => i.isClosed && this.isWithin24h(i));
          this.detectUnreadComments(this.incidentsOpen);
        } else {
          const mine = sorted.filter(
            (i) => i.reportedById === this.user?.id || i.assignedToId === this.user?.id,
          );
          this.incidentsOpenAdmin = mine.filter((i) => !i.isClosed);
          this.incidentsResolvedAdmin = mine.filter((i) => i.isClosed);
          this.detectUnreadComments(this.incidentsOpenAdmin);
        }

        this.loadingList = false;
        this.updateKanbanColumns();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingList = false;
        this.cdr.detectChanges();
      },
    });
  }

  onRateTicket(event: {ticket: Incident, rating: number}): void {
    const { ticket, rating } = event;
    this.incidentService.rate(ticket.id, rating).subscribe({
      next: () => {
        ticket.rating = rating;
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error al valorar:', err)
    });
  }

  // Pestaña activa del inspector en móvil (info | attachments | chat)
  mobileInspectorTab: 'info' | 'attachments' | 'chat' = 'info';

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }
  closeSidebar() {
    this.sidebarOpen = false;
  }
  setKanbanTab(tab: string): void {
    this.activeKanbanTab = tab;
    this.cdr.detectChanges();
  }
  checkScreen(): void {
    const w = window.innerWidth;
    this.isMobile = w <= 600;
    this.isTablet = w > 600 && w <= 1024;
    this.cdr.detectChanges();
  }
  get isSmallScreen(): boolean {
    return this.isMobile || this.isTablet;
  }

  private detectUnreadComments(incidents: Incident[]): void {
    incidents.forEach((incident) => {
      this.commentService.getByIncident(incident.id).subscribe({
        next: (comments: Comment[]) => {
          this.commentsByTicket[incident.id] = comments.length;
          const unread = comments.filter(
            (c) => c.authorId !== this.user?.id && !this.readCommentIds.has(c.id),
          );
          const newSet = new Set<string>(this.ticketsWithUnreadComments);
          if (unread.length > 0) {
            newSet.add(incident.id);
          } else {
            newSet.delete(incident.id);
          }
          this.ticketsWithUnreadComments = newSet;
          this.cdr.detectChanges();
        },
      });
    });
  }

  private sortByPriority(data: Incident[]): Incident[] {
    return [...data].sort((a, b) => {
      const pa = a.priorityOrder ?? 99;
      const pb = b.priorityOrder ?? 99;
      return pa !== pb
        ? pa - pb
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  // ─── INSPECTOR INLINE (admin/agente)
  openDrawer(ticket: Incident): void {
    // Toggle: pinchar el mismo ticket lo cierra
    if (this.selectedTicket?.id === ticket.id && this.drawerOpen) {
      this.closeDrawer();
      return;
    }

    this.selectedTicket = ticket;
    this.drawerOpen = true;
    this.comments = [];
    this.auditLogs = [];
    this.newComment = '';
    this.selectedAgentId = ticket.assignedToId ?? '';
    this.pendingFile = null;
    this.pendingDescription = '';
    this.attachments = [];

    // En móvil/tablet bloqueamos el scroll del body (pantalla completa)
    if (this.isSmallScreen) {
      document.body.style.overflow = 'hidden';
      // Empezar siempre por la pestaña "info" en móvil
      this.mobileInspectorTab = 'info';
    }

    this.cdr.detectChanges();

    this.loadComments(ticket.id);
    this.loadAttachments(ticket.id);
    if (this.isAdminOrAgent()) this.loadHistory(ticket.id);

    // En desktop hacemos scroll al inspector
    if (!this.isSmallScreen) {
      setTimeout(() => {
        const el = document.getElementById('inline-inspector');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  }

  loadHistory(incidentId: string): void {
    this.auditService.getHistory(incidentId).subscribe({
      next: (logs) => {
        this.auditLogs = [...logs];
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('History error:', err.status, err.message);
      },
    });
  }

  ngOnDestroy(): void {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    window.removeEventListener('resize', this.resizeListener);
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.selectedTicket = null;
    document.body.style.overflow = ''; // restaurar scroll
    this.cdr.detectChanges();
  }

  // ─── CHAT
  loadComments(incidentId: string): void {
    this.loadingComments = true;
    this.commentService.getByIncident(incidentId).subscribe({
      next: (data: Comment[]) => {
        console.log('Comments loaded for ticket ' + incidentId + ':', data);
        this.comments = data.map((c) => ({ ...c, isOwn: String(c.authorId) === String(this.user?.id) }));
        this.loadingComments = false;
        this.markCommentsAsRead(incidentId, data);
        this.cdr.detectChanges();
        setTimeout(() => this.scrollChat(), 50);
      },
      error: () => {
        this.loadingComments = false;
        this.cdr.detectChanges();
      },
    });
  }

  sendComment(content?: string): void {
    const text = content ?? this.newComment.trim();
    if (!text || !this.selectedTicket) return;
    this.sendingComment = true;

    this.commentService.create(this.selectedTicket.id, text).subscribe({
      next: (comment: Comment) => {
        this.comments.push({ ...comment, isOwn: true });
        if (!content) this.newComment = '';
        this.sendingComment = false;

        if (this.isAdminOrAgent() && this.selectedTicket) {
          const esperaStatus = this.statuses.find((s) => s.name === 'Espera info');
          if (
            esperaStatus &&
            !this.selectedTicket.isClosed &&
            this.selectedTicket.status === 'Procesando' // Solo si estaba procesando
          ) {
            this.changeTicketStatus(this.selectedTicket, esperaStatus.name);
          }
        }

        this.cdr.detectChanges();
        setTimeout(() => this.scrollChat(), 50);
      },
      error: () => {
        this.sendingComment = false;
        this.cdr.detectChanges();
      },
    });
  }

  private scrollChat(): void {
    if (this.chatContainer?.nativeElement) {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    }
  }

  // ─── CAMBIAR ESTADO
  changeTicketStatus(ticket: Incident, newStatus: string): void {
    if (!ticket) return;
    this.changingStatus = true;
    this.errorMsg = '';
    this.successMsg = `⌛ Cambiando estado a ${newStatus}...`;
    this.cdr.detectChanges();

    this.incidentService.changeStatus(ticket.id, newStatus).subscribe({
      next: (updated: Incident) => {
        this.updateTicketInLists(updated);
        if (this.selectedTicket?.id === ticket.id) {
          this.selectedTicket = updated;
          if (this.drawerOpen) this.loadHistory(ticket.id);
        }
        this.successMsg = `Estado cambiado a: ${newStatus}`;
        this.changingStatus = false;
        if (this.activeView === 'dashboard' || this.activeView === 'queue' || this.activeView === 'agent_work') {
          this.loadQueue();
          if (this.isAdmin()) this.loadMine();
        }
        this.cdr.detectChanges();
        setTimeout(() => {
          this.successMsg = '';
          this.cdr.detectChanges();
        }, 4000);
      },
      error: (err: any) => {
        console.error('Error al cambiar el estado del ticket:', err);
        this.errorMsg = err.error?.error || 'No se pudo cambiar el estado del ticket.';
        this.changingStatus = false;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.errorMsg = '';
          this.cdr.detectChanges();
        }, 5000);
      },
    });
  }

  nextStatuses(ticket: Incident): string[] {
    return this.STATUS_FLOW[ticket.status] ?? [];
  }

  // ─── ASUMIR TICKET
  assign(ticket: Incident): void {
    this.assigningId = ticket.id;
    this.successMsg = '';
    this.errorMsg = '';
    this.incidentService.assignToMe(ticket.id).subscribe({
      next: (updated: Incident) => {
        this.updateTicketInLists(updated);
        this.successMsg = `✓ Has asumido: "${ticket.title}"`;
        this.assigningId = null;
        this.loadQueue();
        setTimeout(() => {
          this.successMsg = '';
          this.cdr.detectChanges();
        }, 4000);
      },
      error: (err: { error?: { error?: string } }) => {
        this.errorMsg = err.error?.error || 'No se pudo asumir';
        this.assigningId = null;
        this.cdr.detectChanges();
      },
    });
  }

  // ─── ASIGNAR A AGENTE (admin)
  assignToAgent(agentId?: string): void {
    const id = agentId ?? this.selectedAgentId;
    if (!this.selectedTicket || !id) return;
    this.assigningAgent = true;
    this.incidentService.assignToAgent(this.selectedTicket.id, id).subscribe({
      next: (updated: Incident) => {
        this.updateTicketInLists(updated);
        this.selectedTicket = updated;
        if (this.drawerOpen) this.loadHistory(updated.id);
        
        if (updated.pendingAssigneeId) {
          this.successMsg = `✓ Asignación enviada a ${updated.pendingAssigneeName} (Pendiente)`;
        } else {
          this.successMsg = `✓ Asignado a ${updated.assignedTo}`;
        }
        
        this.assigningAgent = false;
        if (this.activeView === 'dashboard' || this.activeView === 'queue') this.loadQueue();
        if (this.isAdmin()) {
          this.loadMine();
          if (updated.assignedToId === this.user?.id) this.setAdminTab('my-tickets');
        }
        this.cdr.detectChanges();
        setTimeout(() => {
          this.successMsg = '';
          this.cdr.detectChanges();
        }, 4000);
      },
      error: () => {
        this.assigningAgent = false;
        this.cdr.detectChanges();
      },
    });
  }

  confirmAssignment(ticket: Incident): void {
    this.successMsg = '⌛ Confirmando asignación...';
    this.cdr.detectChanges();
    this.incidentService.confirmAssignment(ticket.id).subscribe({
      next: (updated) => {
        this.updateTicketInLists(updated);
        this.selectedTicket = updated;
        this.loadHistory(updated.id);
        this.successMsg = '✓ Asignación confirmada';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.successMsg = '';
          this.cdr.detectChanges();
        }, 4000);
      },
      error: (err) => {
        this.errorMsg = err.error?.error || 'Error al confirmar';
        this.cdr.detectChanges();
      }
    });
  }

  rejectAssignment(ticket: Incident): void {
    if (!confirm('¿Rechazar esta asignación? El ticket volverá al técnico anterior.')) return;
    this.successMsg = '⌛ Rechazando asignación...';
    this.cdr.detectChanges();
    this.incidentService.rejectAssignment(ticket.id).subscribe({
      next: (updated) => {
        this.updateTicketInLists(updated);
        this.selectedTicket = updated;
        this.loadHistory(updated.id);
        this.successMsg = '✓ Asignación rechazada';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.successMsg = '';
          this.cdr.detectChanges();
        }, 4000);
      },
      error: (err) => {
        this.errorMsg = err.error?.error || 'Error al rechazar';
        this.cdr.detectChanges();
      }
    });
  }

  private updateTicketInLists(updated: Incident): void {
    const upd = (list: Incident[]) => {
      const idx = list.findIndex((i) => i.id === updated.id);
      if (idx !== -1) list[idx] = updated;
    };
    upd(this.incidents);
    upd(this.queueIncidents);
    upd(this.incidentsOpenAdmin);
    upd(this.incidentsResolvedAdmin);
    upd(this.incidentsOpen);
    upd(this.incidentsResolved);
    this.updateKanbanColumns();
  }

  // ─── ADJUNTOS
  loadAttachments(incidentId: string): void {
    this.loadingAttachments = true;
    this.attachments = [];
    this.attachmentService.getAll(incidentId).subscribe({
      next: (data) => {
        this.attachments = data;
        this.loadingAttachments = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingAttachments = false;
        this.cdr.detectChanges();
      },
    });
  }

  getAttachmentUrl(attachmentId: string): string {
    return this.attachmentService.getDownloadUrl(this.selectedTicket!.id, attachmentId);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.setPendingFile(file);
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) this.setPendingFile(file);
    event.target.value = '';
  }

  private setPendingFile(file: File): void {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowed.includes(file.type)) {
      this.errorMsg = 'Tipo de archivo no permitido.';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.errorMsg = 'El archivo supera los 10 MB.';
      return;
    }
    this.errorMsg = '';
    this.pendingFile = file;
    this.pendingDescription = '';
    this.cdr.detectChanges();
  }

  cancelPending(): void {
    this.pendingFile = null;
    this.pendingDescription = '';
  }

  uploadAttachment(): void {
    if (!this.pendingFile || !this.selectedTicket) return;
    this.uploadingAttachment = true;
    this.attachmentService
      .upload(this.selectedTicket.id, this.pendingFile, this.pendingDescription)
      .subscribe({
        next: (att) => {
          this.attachments.unshift(att);
          this.pendingFile = null;
          this.pendingDescription = '';
          this.uploadingAttachment = false;
          this.successMsg = 'Archivo subido correctamente';
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMsg = err.error?.error || 'Error al subir archivo';
          this.uploadingAttachment = false;
          this.cdr.detectChanges();
        },
      });
  }

  deleteAttachment(attachment: Attachment): void {
    if (!confirm(`¿Eliminar "${attachment.originalName}"?`)) return;
    this.deletingAttachmentId = attachment.id;
    this.attachmentService.delete(this.selectedTicket!.id, attachment.id).subscribe({
      next: () => {
        this.attachments = this.attachments.filter((a) => a.id !== attachment.id);
        this.deletingAttachmentId = null;
        this.successMsg = 'Archivo eliminado';
        this.cdr.detectChanges();
      },
      error: () => {
        this.deletingAttachmentId = null;
        this.cdr.detectChanges();
      },
    });
  }

  openAttachmentPreview(attachment: Attachment): void {
    this.previewAttachment = attachment;
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024,
      sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getImageUrl(attachment: Attachment): string | null {
    if (!attachment.isImage) return null;
    return this.attachmentService.getDownloadUrl(this.selectedTicket!.id, attachment.id);
  }

  // ─── HELPERS
  isAssignedToMe(ticket: Incident): boolean {
    return ticket.assignedToId === this.user?.id;
  }
  hasUnreadComments(ticketId: string): boolean {
    return this.ticketsWithUnreadComments.has(ticketId);
  }
  hasComments(ticketId: string): boolean {
    return (this.commentsByTicket[ticketId] ?? 0) > 0;
  }

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

  get userInitials(): string {
    if (!this.user?.name) return '?';
    return this.user.name
      .split(' ')
      .map((n: string) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  get today(): string {
    return new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  goToCreate(): void {
    this.router.navigate(['/incidents/create']);
  }
  logout(): void {
    this.authService.logout();
  }

  getAuditDotClass(field: string, newValue: string | null): string {
    if (field === 'assignedTo') return 'dot-assigned';
    const map: Record<string, string> = {
      Nuevo: 'dot-new',
      Procesando: 'dot-progress',
      'Espera info': 'dot-waiting',
      Resuelto: 'dot-done',
      Cerrado: 'dot-done',
    };
    return map[newValue ?? ''] ?? 'dot-new';
  }

  getAuditBadgeClass(newValue: string | null): string {
    const map: Record<string, string> = {
      Nuevo: 'audit-status-new',
      Procesando: 'audit-status-progress',
      'Espera info': 'audit-status-waiting',
      Resuelto: 'audit-status-done',
      Cerrado: 'audit-status-done',
    };
    return map[newValue ?? ''] ?? '';
  }

  get currentUser() {
    return this.user;
  }

  private pollingInterval: any = null;
  assignDropdownId: string | null = null;

  toggleAssignDropdown(ticketId: string): void {
    this.assignDropdownId = this.assignDropdownId === ticketId ? null : ticketId;
    this.cdr.detectChanges();
  }

  assignToMe(ticket: Incident): void {
    this.assigningId = ticket.id;
    this.incidentService.assignToMe(ticket.id).subscribe({
      next: (updated: Incident) => {
        this.updateTicketInLists(updated);
        this.successMsg = `✓ Te has asignado: "${ticket.title}"`;
        this.assigningId = null;
        this.loadQueue();
        this.loadMine();
        this.setAdminTab('my-tickets');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMsg = err.error?.error || 'No se pudo asumir';
        this.assigningId = null;
        this.cdr.detectChanges();
      },
    });
  }

  quickAssignToAgent(ticket: Incident, agentId: string): void {
    this.assignDropdownId = null;
    this.incidentService.assignToAgent(ticket.id, agentId).subscribe({
      next: (updated: Incident) => {
        this.updateTicketInLists(updated);
        this.successMsg = `✓ Asignado a ${updated.assignedTo}`;
        this.loadQueue();
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges(),
    });
  }

  private get readStorageKey(): string {
    return `helpdesk_read_${this.user?.id}`;
  }
  private readCommentIds: Set<string> = new Set();

  private loadReadComments(): void {
    try {
      const stored = localStorage.getItem(this.readStorageKey);
      this.readCommentIds = new Set(stored ? JSON.parse(stored) : []);
    } catch {
      this.readCommentIds = new Set();
    }
  }

  private markCommentsAsRead(ticketId: string, comments: Comment[]): void {
    comments.forEach((c) => this.readCommentIds.add(c.id));
    try {
      localStorage.setItem(this.readStorageKey, JSON.stringify([...this.readCommentIds]));
    } catch {}
    
    // Actualizar flags en el objeto local para feedback inmediato
    const ticket = this.incidents.find(i => i.id === ticketId);
    if (ticket) {
      ticket.hasUnreadMessagesForAgent = false;
      ticket.hasUnreadMessagesForEmployee = false;
    }
    if (this.selectedTicket && this.selectedTicket.id === ticketId) {
      this.selectedTicket.hasUnreadMessagesForAgent = false;
      this.selectedTicket.hasUnreadMessagesForEmployee = false;
    }

    const newSet = new Set<string>(this.ticketsWithUnreadComments);
    newSet.delete(ticketId);
    this.ticketsWithUnreadComments = newSet;
    this.cdr.detectChanges();
  }

  private saveReadComments(): void {
    try {
      localStorage.setItem(this.readStorageKey, JSON.stringify([...this.readCommentIds]));
    } catch {}
  }

  addStatusMessage(msg: string, type: 'success' | 'error' = 'success'): void {
    if (type === 'success') {
      this.successMsg = msg;
      this.errorMsg = '';
    } else {
      this.errorMsg = msg;
      this.successMsg = '';
    }
    setTimeout(() => {
      if (type === 'success' && this.successMsg === msg) this.successMsg = '';
      if (type === 'error' && this.errorMsg === msg) this.errorMsg = '';
      this.cdr.detectChanges();
    }, 4000);
    this.cdr.detectChanges();
  }

  refreshCurrentView(): void {
    if (!this.user) return;
    
    if (this.activeView === 'dashboard' || this.activeView === 'agent_work') {
       if (this.isAdminOrAgent()) {
         this.loadQueue();
         this.loadMine();
       } else {
         this.loadMine();
       }
    } else if (this.activeView === 'all') {
       this.loadAll();
    } else if (this.activeView === 'mine' || this.activeView === 'agent_history') {
       this.loadMyCreated();
    }
    this.loadStats();
    this.cdr.detectChanges();
  }

  togglePriorityDropdown(id: string): void {
    this.priorityDropdownId = (this.priorityDropdownId === id) ? null : id;
  }

  changeTicketPriority(ticket: Incident, priorityId: number): void {
    this.incidentService.changePriority(ticket.id, priorityId).subscribe({
      next: (updated) => {
        const idx = this.incidents.findIndex(i => i.id === updated.id);
        if (idx !== -1) this.incidents[idx] = updated;
        
        if (this.selectedTicket?.id === ticket.id) {
          this.selectedTicket = updated;
          this.loadHistory(ticket.id);
        }

        this.loadData(); // Reload to refresh Kanban columns
        this.priorityDropdownId = null;
        this.addStatusMessage(`✓ Prioridad de "${ticket.title}" cambiada a ${updated.priority}`, 'success');
      },
      error: () => this.addStatusMessage('Error al cambiar prioridad', 'error')
    });
  }
}