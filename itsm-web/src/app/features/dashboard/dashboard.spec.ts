import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
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
import { IncidentService } from '../../core/services/incident';
import { CommentService } from '../../core/services/comment';
import { CategoryService } from '../../core/services/category';
import { PriorityService } from '../../core/services/priority';
import { UserService } from '../../core/services/user.service';
import { User, Incident, Category, Priority, Comment, Agent, Status } from '../../shared/models/user.model';
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

type ActiveView = 'dashboard' | 'queue' | 'all' | 'mine' | 'profile';

const STATUS_COL: Record<string, string> = {
  'Nuevo': 'new', 'Abierta': 'new',
  'Procesando': 'progress',
  'Espera info': 'waiting', 'Pendiente': 'waiting', 'Espera': 'waiting',
  'Cerrado': 'done', 'Resuelto': 'done',
};

const PRIORITY_ORDER: Record<string, number> = { //todo!!!
  'Crítica': 1, 'Critica': 1, 'Alta': 2, 'Normal': 3, 'Baja': 4,
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatIconModule, MatTableModule,
    MatSelectModule, MatFormFieldModule,
    MatProgressSpinnerModule, MatInputModule,
    SecureImagePipe,
    TopbarComponent, SidebarComponent,
    DrawerEmployeeComponent, LightboxComponent,
  ],
  templateUrl: 'dashboard.html',
  styleUrl: 'dashboard.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  user: User | null = null;
  activeView: ActiveView = 'dashboard';
  adminDashboardTab: 'queue' | 'my-tickets' = 'queue';

  // DATOS GENERALES
  incidents: Incident[] = [];
  incidentsOpen: Incident[] = [];
  incidentsResolved: Incident[] = [];
  incidentsOpenAdmin: Incident[] = [];
  incidentsResolvedAdmin: Incident[] = [];
  queueIncidents: Incident[] = [];
  categories: Category[] = [];
  priorities: Priority[] = [];
  statuses: Status[] = [];
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

  // ESTADOS
  loadingList = false;
  loadingQueue = false;
  filterPriority = '';
  filterCategory = '';

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

  // PERFIL
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordMsg = '';
  passwordError = '';
  savingPassword = false;
  // Edición de nombre y foto
  editingName = '';
  savingProfile = false;
  profileMsg = '';
  profileError = '';
  profilePhotoPreview: string | null = null;
  profilePhotoFile: File | null = null;

  // STATS
  totalIncidents = 0;
  unassignedCount = 0;
  inProgressCount = 0;
  resolvedCount = 0;

  displayedColumns = ['title', 'category', 'priority', 'status', 'reportedBy', 'assignedTo', 'createdAt'];

  readonly STATUS_FLOW: Record<string, string[]> = {
    'Nuevo': ['Procesando'], 'Abierta': ['Procesando'],
    'Procesando': ['Resuelto'],
    'Espera info': ['Procesando', 'Resuelto'],
    'Pendiente': ['Resuelto'], 'Espera': ['Resuelto'],
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
    private attachmentService: AttachmentService
  ) { }

  ngOnInit(): void {
    // Detectar móvil/tablet al iniciar
    this.checkScreen();

    // Detectar cambios de tamaño
    window.addEventListener('resize', this.resizeListener);

    // Cargar usuario y datos
    this.authService.me().subscribe({
      next: (response: { user: User }) => {
        this.user = response.user;
        this.editingName = response.user.name;
        this.loadReadComments();
        this.loadMeta();

        // Leer queryParam ?view=mine para redirigir desde create-incident
        const viewParam = this.route.snapshot.queryParamMap.get('view') as ActiveView | null;
        this.setView(viewParam ?? 'dashboard');

        if (this.isAdmin()) this.loadAgents();
        this.cdr.detectChanges();
      },
      error: () => this.authService.logout()
    });

    this.pollingInterval = setInterval(() => {
      if (this.activeView === 'dashboard') {
        if (this.isAdminOrAgent()) {
          this.loadQueue();
          this.loadMine();
          this.loadStats();
        } else {
          this.loadMine();
        }
      }
    }, 10000);
  }

  // ─── ROL
  isAdminOrAgent(): boolean {
    return !!(this.user?.roles.includes('ROLE_ADMIN') || this.user?.roles.includes('ROLE_AGENT'));
  }
  isAdmin(): boolean { return !!this.user?.roles.includes('ROLE_ADMIN'); }
  isEmployee(): boolean { return !this.isAdminOrAgent(); }

  // ─── META 
  loadMeta(): void {
    this.categoryService.getAll().subscribe((d: Category[]) => this.categories = d);
    this.priorityService.getAll().subscribe((d: Priority[]) => this.priorities = d);
    this.statusService.getAll().subscribe((d: Status[]) => this.statuses = d);
    this.loadStats();
  }

  loadAgents(): void {
    this.userService.getAgents().subscribe((d: Agent[]) => this.agents = d);
  }

  loadStats(): void {
    this.incidentService.getAll().subscribe({
      next: (data: Incident[]) => {
        this.totalIncidents = data.length;
        this.unassignedCount = data.filter(i => !i.assignedTo && !i.isClosed).length;
        this.inProgressCount = data.filter(i => STATUS_COL[i.status] === 'progress').length;
        this.resolvedCount = data.filter(i => i.isClosed).length;
        this.cdr.detectChanges();
      }
    });
  }

  // ─── VISTAS 
  onSidebarSetView(view: string): void { this.setView(view as ActiveView); }

  setView(view: ActiveView): void {
    this.activeView = view;
    // Cerrar inspector al cambiar de vista
    this.drawerOpen = false;
    this.selectedTicket = null;
    this.successMsg = '';
    this.errorMsg = '';

    if (view === 'dashboard') {
      if (this.isAdminOrAgent()) this.loadQueue();
      this.loadMine();
    } else if (view === 'all') {
      this.loadAll();
    } else if (view === 'mine') {
      this.loadMyCreated();
    } else if (view === 'profile') {
      this.editingName = this.user?.name ?? '';
      this.profileMsg = '';
      this.profileError = '';
    }
    this.cdr.detectChanges();
  }

  setAdminTab(tab: 'queue' | 'my-tickets'): void {
    this.adminDashboardTab = tab;
    this.cdr.detectChanges();
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
          : data.filter(i => !i.assignedToId || i.assignedToId === this.user?.id);
        this.unassignedCount = data.filter(i => !i.assignedTo).length;
        this.detectUnreadComments(this.queueIncidents);
        this.loadingQueue = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMsg = 'Error al cargar la cola';
        this.loadingQueue = false;
        this.cdr.detectChanges();
      }
    });
  }

  clearFilters(): void {
    this.filterPriority = '';
    this.filterCategory = '';
    this.loadQueue();
  }

  // Columnas kanban — Panel de asignación (admin ve todos)
  get colNew(): Incident[] {
    return this.queueIncidents.filter(i => !i.assignedTo && (!STATUS_COL[i.status] || STATUS_COL[i.status] === 'new'));
  }
  get colAssignedPanel(): Incident[] {
    return this.queueIncidents.filter(i => i.assignedTo && !i.isClosed && STATUS_COL[i.status] === 'new');
  }
  get colProcessingPanel(): Incident[] {
    return this.queueIncidents.filter(i => !i.isClosed && STATUS_COL[i.status] === 'progress');
  }
  get colWaitingPanel(): Incident[] {
    return this.queueIncidents.filter(i => !i.isClosed && STATUS_COL[i.status] === 'waiting');
  }
  get colDonePanel(): Incident[] {
    return this.queueIncidents.filter(i => STATUS_COL[i.status] === 'done' || i.isClosed);
  }

  // Columnas kanban — Agente (sus tickets)
  get colMine(): Incident[] {
    return this.queueIncidents.filter(i => i.assignedToId === this.user?.id && !i.isClosed && STATUS_COL[i.status] === 'new');
  }
  get colInProgress(): Incident[] {
    return this.queueIncidents.filter(i => i.assignedToId === this.user?.id && !i.isClosed && STATUS_COL[i.status] === 'progress');
  }
  get colWaiting(): Incident[] {
    return this.queueIncidents.filter(i => i.assignedToId === this.user?.id && !i.isClosed && STATUS_COL[i.status] === 'waiting');
  }
  get colDone(): Incident[] {
    const fromQueue = this.queueIncidents.filter(i => i.assignedToId === this.user?.id && (STATUS_COL[i.status] === 'done' || i.isClosed));
    if (this.isAdmin()) {
      return [...fromQueue, ...this.incidentsResolvedAdmin.filter(i => i.assignedToId === this.user?.id)];
    }
    return fromQueue;
  }

  // Columnas kanban — Mis tickets del admin
  get colAdminAssigned(): Incident[] {
    return this.incidentsOpenAdmin.filter(i => i.assignedToId === this.user?.id && !i.isClosed && STATUS_COL[i.status] === 'new');
  }
  get colAdminProcessing(): Incident[] {
    return this.incidentsOpenAdmin.filter(i => i.assignedToId === this.user?.id && !i.isClosed && STATUS_COL[i.status] === 'assigned');
  }
  get colAdminProgress(): Incident[] {
    return this.incidentsOpenAdmin.filter(i => i.assignedToId === this.user?.id && !i.isClosed && STATUS_COL[i.status] === 'progress');
  }
  get colAdminWaiting(): Incident[] {
    return this.incidentsOpenAdmin.filter(i => i.assignedToId === this.user?.id && !i.isClosed && STATUS_COL[i.status] === 'waiting');
  }
  get colAdminDone(): Incident[] {
    return [
      ...this.incidentsOpenAdmin.filter(i => i.assignedToId === this.user?.id && (i.isClosed || STATUS_COL[i.status] === 'done')),
      ...this.incidentsResolvedAdmin.filter(i => i.assignedToId === this.user?.id)
    ];
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
      error: () => { this.loadingList = false; }
    });
  }

  // ─── MIS INCIDENCIAS
  // Usado por admin y agente en la vista "mine" del sidebar
  loadMyCreated(): void {
    this.loadingList = true;
    this.incidentService.getAll().subscribe({
      next: (data: Incident[]) => {
        const mine = this.sortByPriority(data).filter(i => i.reportedById === this.user?.id);
        this.incidentsOpenAdmin = mine.filter(i => !i.isClosed);
        this.incidentsResolvedAdmin = mine.filter(i => i.isClosed);
        this.detectUnreadComments(this.incidentsOpenAdmin);
        this.loadingList = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingList = false; }
    });
  }

  //MENÚ HAMBURGUESA
  sidebarOpen = false;
  // Pestaña activa del inspector en móvil (info | attachments | chat)
  mobileInspectorTab: 'info' | 'attachments' | 'chat' = 'info';

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }
  
  closeSidebar() {
    this.sidebarOpen = false;
  }

  // ─── RESPONSIVE ──────────────────────────────────────────────
  activeKanbanTab = 'new';
  isMobile  = false;  // ≤ 600px
  isTablet  = false;  // 601–1024px

  // Guardamos la referencia para poder eliminarla en ngOnDestroy
  private resizeListener = () => this.checkScreen();

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

  /** True si estamos en móvil o tablet (el inspector ocupa pantalla completa) */
  get isSmallScreen(): boolean { return this.isMobile || this.isTablet; }





  // ─── DATOS DASHBOARD (empleado + kanban)
  loadMine(): void {
    this.loadingList = true;
    this.incidentService.getAll().subscribe({
      next: (data: Incident[]) => {
        const sorted = this.isAdminOrAgent()
          ? this.sortByPriority(data)
          : data.sort((a, b) => a.isClosed === b.isClosed ? 0 : a.isClosed ? 1 : -1);

        this.incidents = sorted;

        if (this.isEmployee()) {
          this.incidentsOpen = sorted.filter(i => !i.isClosed);
          this.incidentsResolved = sorted.filter(i => i.isClosed);
          this.detectUnreadComments(this.incidentsOpen);
        } else {
          // Para el dashboard del admin/agente necesitamos sus tickets asignados
          const mine = sorted.filter(i => i.reportedById === this.user?.id || i.assignedToId === this.user?.id);
          this.incidentsOpenAdmin = mine.filter(i => !i.isClosed);
          this.incidentsResolvedAdmin = mine.filter(i => i.isClosed);
          this.detectUnreadComments(this.incidentsOpenAdmin);
        }

        this.loadingList = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingList = false; }
    });
  }

  private detectUnreadComments(incidents: Incident[]): void {
    incidents.forEach(incident => {
      this.commentService.getByIncident(incident.id).subscribe({
        next: (comments: Comment[]) => {
          this.commentsByTicket[incident.id] = comments.length;
          const unread = comments.filter(c => c.authorId !== this.user?.id && !this.readCommentIds.has(c.id));
          const newSet = new Set<string>(this.ticketsWithUnreadComments);
          if (unread.length > 0) { newSet.add(incident.id); } else { newSet.delete(incident.id); }
          this.ticketsWithUnreadComments = newSet;
          this.cdr.detectChanges();
        }
      });
    });
  }

  private sortByPriority(data: Incident[]): Incident[] {
    return [...data].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      return pa !== pb ? pa - pb : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
      error: (err) => { console.error('History error:', err.status, err.message); }
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
        this.comments = data.map(c => ({ ...c, isOwn: c.authorId === this.user?.id }));
        this.loadingComments = false;
        this.markCommentsAsRead(incidentId, data);
        this.cdr.detectChanges();
        setTimeout(() => this.scrollChat(), 50);
      },
      error: () => { this.loadingComments = false; this.cdr.detectChanges(); }
    });
  }

  sendComment(): void {
    if (!this.newComment.trim() || !this.selectedTicket) return;
    this.sendingComment = true;
    const content = this.newComment.trim();

    this.commentService.create(this.selectedTicket.id, content).subscribe({
      next: (comment: Comment) => {
        this.comments.push({ ...comment, isOwn: true });
        this.newComment = '';
        this.sendingComment = false;

        if (this.isAdminOrAgent() && this.selectedTicket) {
          const esperaStatus = this.statuses.find(s => s.name === 'Espera info');
          if (esperaStatus && !this.selectedTicket.isClosed && this.selectedTicket.status !== 'Espera info') {
            this.changeTicketStatus(this.selectedTicket, esperaStatus.name);
          }
        }

        this.cdr.detectChanges();
        setTimeout(() => this.scrollChat(), 50);
      },
      error: () => { this.sendingComment = false; this.cdr.detectChanges(); }
    });
  }

  private scrollChat(): void {
    if (this.chatContainer?.nativeElement) {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    }
  }

  // ─── CAMBIAR ESTADO 
  changeTicketStatus(ticket: Incident, newStatus: string): void {
    this.changingStatus = true;
    this.incidentService.changeStatus(ticket.id, newStatus).subscribe({
      next: (updated: Incident) => {
        this.updateTicketInLists(updated);
        if (this.selectedTicket?.id === ticket.id) {
          this.selectedTicket = updated;
          if (this.drawerOpen) this.loadHistory(ticket.id);
        }
        this.successMsg = `Estado cambiado a: ${newStatus}`;
        this.changingStatus = false;
        if (this.activeView === 'dashboard' || this.activeView === 'queue') {
          this.loadQueue();
          if (this.isAdmin()) this.loadMine();
        }
        this.cdr.detectChanges();
        setTimeout(() => { this.successMsg = ''; this.cdr.detectChanges(); }, 4000);
      },
      error: () => { this.changingStatus = false; this.cdr.detectChanges(); }
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
        setTimeout(() => { this.successMsg = ''; this.cdr.detectChanges(); }, 4000);
      },
      error: (err: { error?: { error?: string } }) => {
        this.errorMsg = err.error?.error || 'No se pudo asumir';
        this.assigningId = null;
        this.cdr.detectChanges();
      }
    });
  }

  // ─── ASIGNAR A AGENTE (admin) 
  assignToAgent(): void {
    if (!this.selectedTicket || !this.selectedAgentId) return;
    this.assigningAgent = true;
    this.incidentService.assignToAgent(this.selectedTicket.id, this.selectedAgentId).subscribe({
      next: (updated: Incident) => {
        this.updateTicketInLists(updated);
        this.selectedTicket = updated;
        if (this.drawerOpen) this.loadHistory(updated.id);
        this.successMsg = `✓ Asignado a ${updated.assignedTo}`;
        this.assigningAgent = false;
        if (this.activeView === 'dashboard' || this.activeView === 'queue') this.loadQueue();
        if (this.isAdmin()) {
          this.loadMine();
          if (updated.assignedToId === this.user?.id) this.setAdminTab('my-tickets');
        }
        this.cdr.detectChanges();
        setTimeout(() => { this.successMsg = ''; this.cdr.detectChanges(); }, 4000);
      },
      error: () => { this.assigningAgent = false; this.cdr.detectChanges(); }
    });
  }

  private updateTicketInLists(updated: Incident): void {
    const upd = (list: Incident[]) => {
      const idx = list.findIndex(i => i.id === updated.id);
      if (idx !== -1) list[idx] = updated;
    };
    upd(this.incidents); upd(this.queueIncidents);
    upd(this.incidentsOpenAdmin); upd(this.incidentsResolvedAdmin);
    upd(this.incidentsOpen); upd(this.incidentsResolved);
  }

  // ─── PERFIL 
  onProfilePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.profileError = 'Solo se permiten imágenes.';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.profileError = 'La imagen no puede superar 5 MB.';
      return;
    }
    this.profilePhotoFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.profilePhotoPreview = e.target?.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  saveProfile(): void {
    this.profileMsg = '';
    this.profileError = '';
    if (!this.editingName.trim()) {
      this.profileError = 'El nombre no puede estar vacío.';
      return;
    }
    this.savingProfile = true;
    this.userService.updateProfile(this.editingName.trim(), this.profilePhotoFile ?? undefined).subscribe({
      next: (updated: User) => {
        this.user = updated;
        this.profileMsg = '✓ Perfil actualizado correctamente';
        this.profilePhotoFile = null;
        this.savingProfile = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.profileError = err.error?.error || 'Error al guardar el perfil';
        this.savingProfile = false;
        this.cdr.detectChanges();
      }
    });
  }

  savePassword(): void {
    this.passwordMsg = '';
    this.passwordError = '';
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.passwordError = 'Todos los campos son obligatorios'; return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Las contraseñas no coinciden'; return;
    }
    if (this.newPassword.length < 8) {
      this.passwordError = 'La nueva contraseña debe tener al menos 8 caracteres'; return;
    }
    this.savingPassword = true;
    this.userService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.passwordMsg = '✓ Contraseña actualizada correctamente';
        this.currentPassword = ''; this.newPassword = ''; this.confirmPassword = '';
        this.savingPassword = false;
        this.cdr.detectChanges();
      },
      error: (err: { error?: { error?: string } }) => {
        this.passwordError = err.error?.error || 'Error al cambiar la contraseña';
        this.savingPassword = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ─── ADJUNTOS
  loadAttachments(incidentId: string): void {
    this.loadingAttachments = true;
    this.attachments = [];
    this.attachmentService.getAll(incidentId).subscribe({
      next: (data) => { this.attachments = data; this.loadingAttachments = false; this.cdr.detectChanges(); },
      error: () => { this.loadingAttachments = false; this.cdr.detectChanges(); }
    });
  }

  getAttachmentUrl(attachmentId: string): string {
    return this.attachmentService.getDownloadUrl(this.selectedTicket!.id, attachmentId);
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); this.isDragOver = true; }

  onDrop(event: DragEvent): void {
    event.preventDefault(); this.isDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.setPendingFile(file);
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) this.setPendingFile(file);
    event.target.value = '';
  }

  private setPendingFile(file: File): void {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) { this.errorMsg = 'Tipo de archivo no permitido.'; return; }
    if (file.size > 10 * 1024 * 1024) { this.errorMsg = 'El archivo supera los 10 MB.'; return; }
    this.errorMsg = '';
    this.pendingFile = file;
    this.pendingDescription = '';
    this.cdr.detectChanges();
  }

  cancelPending(): void { this.pendingFile = null; this.pendingDescription = ''; }

  uploadAttachment(): void {
    if (!this.pendingFile || !this.selectedTicket) return;
    this.uploadingAttachment = true;
    this.attachmentService.upload(this.selectedTicket.id, this.pendingFile, this.pendingDescription).subscribe({
      next: (att) => {
        this.attachments.unshift(att);
        this.pendingFile = null; this.pendingDescription = '';
        this.uploadingAttachment = false;
        this.successMsg = 'Archivo subido correctamente';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMsg = err.error?.error || 'Error al subir archivo';
        this.uploadingAttachment = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteAttachment(attachment: Attachment): void {
    if (!confirm(`¿Eliminar "${attachment.originalName}"?`)) return;
    this.deletingAttachmentId = attachment.id;
    this.attachmentService.delete(this.selectedTicket!.id, attachment.id).subscribe({
      next: () => {
        this.attachments = this.attachments.filter(a => a.id !== attachment.id);
        this.deletingAttachmentId = null;
        this.successMsg = 'Archivo eliminado';
        this.cdr.detectChanges();
      },
      error: () => { this.deletingAttachmentId = null; this.cdr.detectChanges(); }
    });
  }

  openAttachmentPreview(attachment: Attachment): void { this.previewAttachment = attachment; }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getImageUrl(attachment: Attachment): string | null {
    if (!attachment.isImage) return null;
    return this.attachmentService.getDownloadUrl(this.selectedTicket!.id, attachment.id);
  }

  // ─── HELPERS
  isAssignedToMe(ticket: Incident): boolean { return ticket.assignedToId === this.user?.id; }
  hasUnreadComments(ticketId: string): boolean { return this.ticketsWithUnreadComments.has(ticketId); }
  hasComments(ticketId: string): boolean { return (this.commentsByTicket[ticketId] ?? 0) > 0; }

  getPriorityClass(priority: string): string {
    const map: Record<string, string> = {
      'Crítica': 'priority-critical', 'Critica': 'priority-critical',
      'Alta': 'priority-high', 'Normal': 'priority-medium', 'Baja': 'priority-low',
    };
    return map[priority] ?? '';
  }

  get userInitials(): string {
    if (!this.user?.name) return '?';
    return this.user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  }

  get today(): string {
    return new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  goToCreate(): void { this.router.navigate(['/incidents/create']); }
  logout(): void { this.authService.logout(); }

  getAuditDotClass(field: string, newValue: string | null): string {
    if (field === 'assignedTo') return 'dot-assigned';
    const map: Record<string, string> = {
      'Nuevo': 'dot-new', 'Procesando': 'dot-progress',
      'Espera info': 'dot-waiting', 'Resuelto': 'dot-done', 'Cerrado': 'dot-done',
    };
    return map[newValue ?? ''] ?? 'dot-new';
  }

  getAuditBadgeClass(newValue: string | null): string {
    const map: Record<string, string> = {
      'Nuevo': 'audit-status-new', 'Procesando': 'audit-status-progress',
      'Espera info': 'audit-status-waiting', 'Resuelto': 'audit-status-done', 'Cerrado': 'audit-status-done',
    };
    return map[newValue ?? ''] ?? '';
  }

  get currentUser() { return this.user; }

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
        this.loadQueue(); this.loadMine();
        this.setAdminTab('my-tickets');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMsg = err.error?.error || 'No se pudo asumir';
        this.assigningId = null;
        this.cdr.detectChanges();
      }
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
      error: () => this.cdr.detectChanges()
    });
  }

  private get readStorageKey(): string { return `helpdesk_read_${this.user?.id}`; }
  private readCommentIds: Set<string> = new Set();

  private loadReadComments(): void {
    try {
      const stored = localStorage.getItem(this.readStorageKey);
      this.readCommentIds = new Set(stored ? JSON.parse(stored) : []);
    } catch { this.readCommentIds = new Set(); }
  }

  private markCommentsAsRead(ticketId: string, comments: Comment[]): void {
    comments.forEach(c => this.readCommentIds.add(c.id));
    try { localStorage.setItem(this.readStorageKey, JSON.stringify([...this.readCommentIds])); } catch { }
    const newSet = new Set<string>(this.ticketsWithUnreadComments);
    newSet.delete(ticketId);
    this.ticketsWithUnreadComments = newSet;
    this.cdr.detectChanges();
  }

  private saveReadComments(): void {
    try { localStorage.setItem(this.readStorageKey, JSON.stringify([...this.readCommentIds])); } catch { }
  }
}