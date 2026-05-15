
// src/app/features/admin/admin-panel.ts

import { Component, OnInit, ChangeDetectorRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminService, AdminUser, CreateUserRequest } from '../../core/services/admin.service';
import { Category, Priority } from '../../shared/models/user.model';

type AdminTab = 'users' | 'matrix' | 'projects' | 'ui' | 'services' | 'audit';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.scss',
})
export class AdminPanelComponent implements OnInit, OnChanges {
  @Input() subView: string = 'admin';
  @Input() selectedCompany: string = 'global';
  activeTab: AdminTab = 'users';

  // ── Mensajes globales ─────────────────────────────────────────
  successMsg = '';
  errorMsg   = '';

  // USUARIOS
  users: AdminUser[]    = [];
  loadingUsers          = false;

  // Formulario crear/editar usuario
  showUserForm          = false;
  editingUser: AdminUser | null = null;

  uName        = '';
  uEmail       = '';
  uPassword    = '';
  uRole        = 'ROLE_AGENT';
  uNewPassword = '';
  savingUser   = false;

  // CATEGORÍAS
  categories: Category[] = [];
  loadingCats            = false;

  showCatForm   = false;
  editingCat: Category | null = null;
  catName       = ''
  catOrder      = 99;
  savingCat     = false;
  deletingCatId: number | null = null;

  // PRIORIDADES
  priorities: Priority[] = [];
  loadingPris            = false;

  showPriForm   = false;
  editingPri: Priority | null = null;
  priName       = '';
  priOrder      = 99;
  priSla: number | null = null;
  savingPri     = false;
  deletingPriId: number | null = null;

  // EMPRESAS (PROYECTOS)
  companies: any[] = [];
  loadingCompanies = false;
  showCompanyForm = false;
  savingCompany = false;
  
  // NAVEGACIÓN DE EMPRESAS
  projectView: 'add' | 'list' | 'edit' = 'list';
  editingCompany: any | null = null;
  companySubTab: 'users' | 'cats' | 'pris' | 'agents' = 'users';
  compName = '';
  companyInviteName = '';
  companyInviteEmail = '';

  // INVITACIONES (integradas en tab usuarios)
  inviteEmail = '';
  inviting = false;
  lastInviteUrl = '';
  copiedLink = false;
  showInvitePanel = false;

  // AUDITORÍA
  auditLogs: any[] = [];
  loadingAudit = false;

  // ASIGNACIÓN (matrix) — tarjetas expandibles
  expandedAgentId: string | null = null;
  savingMatrixId: string | null = null;
  agentSelectedCompany: { [userId: string]: string } = {};

  // CATEGORÍAS / PRIORIDADES — campo empresa
  catCompanyId = '';
  priCompanyId = '';

  // AJUSTES DEL SISTEMA
  primaryColor = '#0ea5e9';
  secondaryColor = '#64748b';
  logoFile: File | null = null;
  logoPreview: string | null = null;
  settingsMsg = '';
  goalResolutionTime: number = 2;
  userSearchQuery: string = '';
  projectSearchQuery: string = '';
  matrixSearchQuery: string = '';

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.syncSubView();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['subView']) {
      this.syncSubView();
    }
    if (changes['selectedCompany']) {
      this.handleCompanyChange();
    }
  }

  // ── Configuración de Vistas ───────────────────────────────────
  get headerInfo() {
    if (this.subView.startsWith('admin_users') || this.subView === 'admin_matrix') {
      return { title: 'Gestión de Usuarios', icon: 'people', sub: 'Agentes, empleados, invitaciones y asignación de empresas/categorías' };
    }
    if (this.subView === 'admin_projects' || this.subView === 'admin_config_tech') {
      return { title: 'Proyectos y Empresas', icon: 'business', sub: 'Configuración de clientes y parámetros técnicos' };
    }
    return { title: 'Ajustes del Sistema', icon: 'settings', sub: 'Configuración global y registros de actividad' };
  }

  get visibleTabs(): AdminTab[] {
    if (this.subView.startsWith('admin_users') || this.subView === 'admin_matrix') {
      const tabs: AdminTab[] = ['users'];
      if (this.selectedCompany === 'global') tabs.push('matrix');
      return tabs;
    }
    if (this.subView === 'admin_projects' || this.subView === 'admin_config_tech') {
      return ['projects'];
    }
    return ['ui', 'services', 'audit'];
  }

  private syncSubView(): void {
    const tabs = this.visibleTabs;
    if (this.subView === 'admin_users') this.setTab('users');
    else if (this.subView === 'admin_matrix') this.setTab('matrix');
    else if (this.subView === 'admin_projects') this.setTab('projects');
    else if (this.subView === 'admin_config_tech') this.setTab('projects');
    else if (this.subView === 'admin_ui') this.setTab('ui');
    else if (this.subView === 'admin_audit') this.setTab('audit');
    else {
      if (!tabs.includes(this.activeTab)) {
        this.setTab(tabs[0]);
      } else {
        this.loadTab(this.activeTab);
      }
    }
  }

  setTab(tab: AdminTab): void {
    this.activeTab = tab;
    this.clearMsg();
    this.closeAllForms();
    this.loadTab(tab);
  }

  private loadTab(tab: AdminTab): void {
    if (tab === 'users')      { this.loadUsers(); this.loadCompanies(); this.loadCategories(); }
    if (tab === 'matrix')     { this.loadUsers(); this.loadCategories(); this.loadCompanies(); }
    if (tab === 'projects')   { this.loadCompanies(); this.loadCategories(); this.loadPriorities(); }
    if (tab === 'audit')      this.loadAuditLogs();
  }

  // ══════════════════════════════════════════════════════════════
  // USUARIOS
  // ══════════════════════════════════════════════════════════════
  loadUsers(): void {
    this.loadingUsers = true;
    this.adminService.getUsers().subscribe({
      next: (data) => { this.users = data; this.loadingUsers = false; this.cdr.detectChanges(); },
      error: (e) => { this.errorMsg = e.error?.error || 'Error al cargar usuarios'; this.loadingUsers = false; this.cdr.detectChanges(); }
    });
  }

  openCreateUser(): void {
    this.editingUser = null;
    this.uName = ''; this.uEmail = ''; this.uPassword = ''; this.uRole = 'ROLE_AGENT'; this.uNewPassword = '';
    this.showUserForm = true;
    this.showInvitePanel = false;
    this.clearMsg();
  }

  get filteredUsers(): AdminUser[] {
    let list: AdminUser[] = [];
    if (this.selectedCompany === 'global') {
      // En Global mostramos técnicos y administradores
      list = this.users.filter(u => u.role === 'ROLE_ADMIN' || u.role === 'ROLE_AGENT');
    } else {
      // En una empresa mostramos SOLO los empleados registrados a esa empresa
      list = this.users.filter(u => u.role === 'ROLE_USER' && this.hasCompany(u, this.selectedCompany));
    }

    if (this.userSearchQuery.trim()) {
      const q = this.userSearchQuery.toLowerCase().trim();
      list = list.filter(u => 
        u.name.toLowerCase().includes(q) || 
        u.email.toLowerCase().includes(q)
      );
    }
    return list;
  }

  get filteredCompanies(): any[] {
    let list = this.companies;
    if (this.projectSearchQuery.trim()) {
      const q = this.projectSearchQuery.toLowerCase().trim();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }
    return list;
  }

  get filteredMatrixAgents(): AdminUser[] {
    let list = this.agents;
    if (this.matrixSearchQuery.trim()) {
      const q = this.matrixSearchQuery.toLowerCase().trim();
      list = list.filter(a => 
        a.name.toLowerCase().includes(q) || 
        a.email.toLowerCase().includes(q)
      );
    }
    return list;
  }

  openEditUser(u: AdminUser): void {
    this.editingUser = u;
    this.uName = u.name; this.uEmail = u.email; this.uRole = u.role; this.uPassword = ''; this.uNewPassword = '';
    this.showUserForm = true;
    this.showInvitePanel = false;
    this.clearMsg();
  }

  cancelUserForm(): void {
    this.showUserForm = false;
    this.editingUser = null;
  }

  saveUser(): void {
    this.clearMsg();
    if (!this.uName.trim() || !this.uEmail.trim()) {
      this.errorMsg = 'Nombre y email son obligatorios'; return;
    }
    if (!this.editingUser && !this.uPassword.trim()) {
      this.errorMsg = 'La contraseña es obligatoria al crear un usuario'; return;
    }
    this.savingUser = true;

    if (!this.editingUser) {
      const payload: CreateUserRequest = {
        name: this.uName.trim(), email: this.uEmail.trim(),
        password: this.uPassword, role: this.uRole,
      };
      this.adminService.createUser(payload).subscribe({
        next: (u) => {
          this.users.unshift(u);
          this.showUserForm = false;
          this.successMsg = `✓ Usuario "${u.name}" creado correctamente`;
          this.savingUser = false;
          this.cdr.detectChanges();
        },
        error: (e) => { this.errorMsg = e.error?.error || 'Error al crear usuario'; this.savingUser = false; this.cdr.detectChanges(); }
      });
    } else {
      const payload: any = { name: this.uName.trim(), email: this.uEmail.trim(), role: this.uRole };
      if (this.uNewPassword.trim()) payload.newPassword = this.uNewPassword.trim();

      this.adminService.updateUser(this.editingUser.id, payload).subscribe({
        next: (updated) => {
          const idx = this.users.findIndex(u => u.id === updated.id);
          if (idx !== -1) this.users[idx] = updated;
          this.showUserForm = false;
          this.editingUser = null;
          this.successMsg = `✓ Usuario "${updated.name}" actualizado`;
          this.savingUser = false;
          this.cdr.detectChanges();
        },
        error: (e) => { this.errorMsg = e.error?.error || 'Error al actualizar'; this.savingUser = false; this.cdr.detectChanges(); }
      });
    }
  }

  toggleUser(u: AdminUser): void {
    this.clearMsg();
    this.adminService.toggleUser(u.id).subscribe({
      next: (updated: AdminUser) => {
        const idx = this.users.findIndex(x => x.id === updated.id);
        if (idx !== -1) this.users[idx] = updated;
        this.successMsg = `Usuario ${updated.isActive ? 'activado' : 'desactivado'}`;
        this.cdr.detectChanges();
      },
      error: (e: any) => { this.errorMsg = e.error?.error || 'Error al cambiar estado'; this.cdr.detectChanges(); }
    });
  }

  roleLabel(role: string): string {
    const map: Record<string, string> = {
      'ROLE_ADMIN': 'Administrador', 'ROLE_AGENT': 'Agente', 'ROLE_USER': 'Empleado',
    };
    return map[role] ?? role;
  }

  // ══════════════════════════════════════════════════════════════
  // INVITACIONES (integradas en pestaña Usuarios)
  // ══════════════════════════════════════════════════════════════
  toggleInvitePanel(): void {
    this.showInvitePanel = !this.showInvitePanel;
    if (this.showInvitePanel) {
      this.showUserForm = false;
      this.inviteEmail = '';
      this.lastInviteUrl = '';
      this.copiedLink = false;
      this.clearMsg();
    }
  }

  sendInvite(): void {
    if (!this.inviteEmail.trim()) return;
    this.inviting = true;
    this.adminService.inviteUser(this.inviteEmail.trim()).subscribe({
      next: (res: any) => {
        this.lastInviteUrl = res.url;
        this.inviting = false;
        this.copiedLink = false;
        this.successMsg = '✓ Enlace de invitación generado con éxito';
        this.cdr.detectChanges();
      },
      error: () => { this.inviting = false; this.errorMsg = 'Error al generar invitación'; this.cdr.detectChanges(); }
    });
  }

  copyInviteUrl(): void {
    if (!this.lastInviteUrl) return;
    const fullUrl = window.location.origin + this.lastInviteUrl;
    navigator.clipboard.writeText(fullUrl).then(() => {
      this.copiedLink = true;
      this.successMsg = '✓ Enlace copiado al portapapeles';
      this.cdr.detectChanges();
      setTimeout(() => { this.copiedLink = false; this.cdr.detectChanges(); }, 3000);
    }).catch(() => {
      this.errorMsg = 'No se pudo copiar. Copia manualmente.';
      this.cdr.detectChanges();
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CATEGORÍAS
  // ══════════════════════════════════════════════════════════════
  loadCategories(): void {
    this.loadingCats = true;
    this.adminService.getCategories().subscribe({
      next: (data) => { this.categories = data; this.loadingCats = false; this.cdr.detectChanges(); },
      error: (e) => { this.errorMsg = e.error?.error || 'Error al cargar categorías'; this.loadingCats = false; this.cdr.detectChanges(); }
    });
  }

  openCreateCat(): void {
    this.editingCat = null;
    this.catName = '';
    const companyCats = this.editingCompany ? this.categories.filter(c => (c as any).companyId === this.editingCompany.id) : this.categories;
    this.catOrder = this.nextOrder(companyCats);
    this.catCompanyId = this.editingCompany ? this.editingCompany.id : '';
    this.showCatForm = true;
    this.clearMsg();
  }

  openEditCat(c: Category): void {
    this.editingCat = c;
    this.catName = c.name;
    this.catOrder = c.sortOrder;
    this.catCompanyId = (c as any).companyId ?? '';
    this.showCatForm = true;
    this.clearMsg();
  }

  cancelCatForm(): void { this.showCatForm = false; this.editingCat = null; }

  saveCat(): void {
    this.clearMsg();
    if (!this.catName.trim()) { this.errorMsg = 'El nombre es obligatorio'; return; }
    this.savingCat = true;

    const payload: any = { name: this.catName.trim(), sortOrder: this.catOrder, companyId: this.catCompanyId || null };
    const obs = this.editingCat
      ? this.adminService.updateCategory(this.editingCat.id, payload.name, payload.sortOrder, payload.companyId)
      : this.adminService.createCategory(payload.name, payload.sortOrder, payload.companyId);

    obs.subscribe({
      next: (saved) => {
        if (this.editingCat) {
          const idx = this.categories.findIndex(c => c.id === saved.id);
          if (idx !== -1) this.categories[idx] = saved;
        } else {
          this.categories.push(saved);
          this.categories.sort((a, b) => a.sortOrder - b.sortOrder);
        }
        this.showCatForm = false; this.editingCat = null;
        this.successMsg = `✓ Categoría "${saved.name}" guardada`;
        this.savingCat = false; this.cdr.detectChanges();
      },
      error: (e) => { this.errorMsg = e.error?.error || 'Error al guardar'; this.savingCat = false; this.cdr.detectChanges(); }
    });
  }

  deleteCat(c: Category): void {
    if (!confirm(`¿Eliminar la categoría "${c.name}"?`)) return;
    this.deletingCatId = c.id; this.clearMsg();
    this.adminService.deleteCategory(c.id).subscribe({
      next: () => {
        this.categories = this.categories.filter(x => x.id !== c.id);
        this.successMsg = `Categoría "${c.name}" eliminada`;
        this.deletingCatId = null; this.cdr.detectChanges();
      },
      error: (e) => { this.errorMsg = e.error?.error || 'No se pudo eliminar'; this.deletingCatId = null; this.cdr.detectChanges(); }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // PRIORIDADES
  // ══════════════════════════════════════════════════════════════
  loadPriorities(): void {
    this.loadingPris = true;
    this.adminService.getPriorities().subscribe({
      next: (data) => { this.priorities = data; this.loadingPris = false; this.cdr.detectChanges(); },
      error: (e) => { this.errorMsg = e.error?.error || 'Error al cargar prioridades'; this.loadingPris = false; this.cdr.detectChanges(); }
    });
  }

  openCreatePri(): void {
    this.editingPri = null;
    this.priName = '';
    const companyPris = this.editingCompany ? this.priorities.filter(p => (p as any).companyId === this.editingCompany.id) : this.priorities;
    this.priOrder = this.nextOrder(companyPris);
    this.priSla = null;
    this.priCompanyId = this.editingCompany ? this.editingCompany.id : '';
    this.showPriForm = true;
    this.clearMsg();
  }

  openEditPri(p: Priority): void {
    this.editingPri = p;
    this.priName = p.name;
    this.priOrder = p.sortOrder;
    this.priSla = p.slaHours ?? null;
    this.priCompanyId = (p as any).companyId ?? '';
    this.showPriForm = true;
    this.clearMsg();
  }

  cancelPriForm(): void { this.showPriForm = false; this.editingPri = null; }

  savePri(): void {
    this.clearMsg();
    if (!this.priName.trim()) { this.errorMsg = 'El nombre es obligatorio'; return; }
    this.savingPri = true;

    const payload = { name: this.priName.trim(), sortOrder: this.priOrder, slaHours: this.priSla, companyId: this.priCompanyId || null };
    const obs = this.editingPri
      ? this.adminService.updatePriority(this.editingPri.id, payload)
      : this.adminService.createPriority(payload);

    obs.subscribe({
      next: (saved) => {
        if (this.editingPri) {
          const idx = this.priorities.findIndex(p => p.id === saved.id);
          if (idx !== -1) this.priorities[idx] = saved;
        } else {
          this.priorities.push(saved);
          this.priorities.sort((a, b) => a.sortOrder - b.sortOrder);
        }
        this.showPriForm = false; this.editingPri = null;
        this.successMsg = `✓ Prioridad "${saved.name}" guardada`;
        this.savingPri = false; this.cdr.detectChanges();
      },
      error: (e) => { this.errorMsg = e.error?.error || 'Error al guardar'; this.savingPri = false; this.cdr.detectChanges(); }
    });
  }

  deletePri(p: Priority): void {
    if (!confirm(`¿Eliminar la prioridad "${p.name}"?`)) return;
    this.deletingPriId = p.id; this.clearMsg();
    this.adminService.deletePriority(p.id).subscribe({
      next: () => {
        this.priorities = this.priorities.filter(x => x.id !== p.id);
        this.successMsg = `Prioridad "${p.name}" eliminada`;
        this.deletingPriId = null; this.cdr.detectChanges();
      },
      error: (e: any) => { this.errorMsg = e.error?.error || 'No se pudo eliminar'; this.deletingPriId = null; this.cdr.detectChanges(); }
    });
  }

  // (Old companies code removed due to duplicates)

  // ══════════════════════════════════════════════════════════════
  // ASIGNACIÓN (matrix) — tarjetas expandibles
  // ══════════════════════════════════════════════════════════════

  /** Agentes = todos los usuarios que NO son ROLE_USER */
  get agents(): AdminUser[] {
    return this.users.filter(u => u.role !== 'ROLE_USER');
  }

  toggleAgentCard(userId: string): void {
    if (this.expandedAgentId === userId) {
      this.expandedAgentId = null;
    } else {
      this.expandedAgentId = userId;
      // Preseleccionar la primera empresa del agente si no tiene una seleccionada en el UI
      if (!this.agentSelectedCompany[userId]) {
        const agent = this.users.find(u => u.id === userId);
        if (agent && agent.companies && agent.companies.length > 0) {
          this.agentSelectedCompany[userId] = agent.companies[0].id;
        } else {
          this.agentSelectedCompany[userId] = '';
        }
      }
    }
  }

  assignNewCompany(user: AdminUser, selectElement: HTMLSelectElement): void {
    const val = selectElement.value;
    if (val) {
      this.toggleMatrix(user, 'comp', val);
      this.agentSelectedCompany[user.id] = val;
      selectElement.value = '';
    }
  }

  isAgentExpanded(userId: string): boolean {
    return this.expandedAgentId === userId;
  }

  toggleMatrix(user: AdminUser, type: 'cat' | 'comp', id: any): void {
    const categories = user.categories?.map(c => c.id) || [];
    const companies = user.companies?.map(c => c.id) || [];

    if (type === 'cat') {
      const idx = categories.indexOf(id);
      if (idx === -1) categories.push(id); else categories.splice(idx, 1);
    } else {
      const idx = companies.indexOf(id);
      if (idx === -1) companies.push(id); else companies.splice(idx, 1);
    }

    this.savingMatrixId = user.id;
    this.adminService.updateMatrix(user.id, { categories, companies }).subscribe({
      next: (updated: AdminUser) => {
        const idx = this.users.findIndex(u => u.id === updated.id);
        if (idx !== -1) this.users[idx] = updated;
        this.savingMatrixId = null;
        this.cdr.detectChanges();
      },
      error: () => { this.savingMatrixId = null; this.errorMsg = 'Error al guardar asignación'; this.cdr.detectChanges(); }
    });
  }

  hasCategory(user: AdminUser, catId: number): boolean {
    return !!user.categories?.find(c => c.id === catId);
  }

  getAgentCategories(companyId: string): Category[] {
    if (!companyId) return [];
    return this.categories.filter(c => (c as any).companyId === companyId);
  }

  toggleAllCategories(user: AdminUser, companyId: string, assign: boolean): void {
    const companyCats = this.getAgentCategories(companyId).map(c => c.id);
    let currentCats = user.categories?.map(c => c.id) || [];
    const companies = user.companies?.map(c => c.id) || [];

    if (assign) {
      // Add all company categories that the user doesn't already have
      const toAdd = companyCats.filter(id => !currentCats.includes(id));
      currentCats = [...currentCats, ...toAdd];
    } else {
      // Remove all company categories
      currentCats = currentCats.filter(id => !companyCats.includes(id));
    }

    this.savingMatrixId = user.id;
    this.adminService.updateMatrix(user.id, { categories: currentCats, companies }).subscribe({
      next: (updated: AdminUser) => {
        const idx = this.users.findIndex(u => u.id === updated.id);
        if (idx !== -1) this.users[idx] = updated;
        this.savingMatrixId = null;
        this.cdr.detectChanges();
      },
      error: () => { this.savingMatrixId = null; this.errorMsg = 'Error al guardar categorías'; this.cdr.detectChanges(); }
    });
  }

  hasAllCategories(user: AdminUser, companyId: string): boolean {
    const companyCats = this.getAgentCategories(companyId);
    if (companyCats.length === 0) return false;
    
    // Check if every category of this company is present in user.categories
    return companyCats.every(cat => this.hasCategory(user, cat.id));
  }

  hasCompany(user: AdminUser, compId: string): boolean {
    return !!user.companies?.find(c => c.id === compId);
  }

  agentCompanyNames(user: AdminUser): string {
    return user.companies?.map(c => c.name).join(', ') || 'Sin empresa';
  }

  agentCategoryNames(user: AdminUser): string {
    return user.categories?.map(c => c.name).join(', ') || 'Sin categoría';
  }

  // ══════════════════════════════════════════════════════════════
  // AUDITORÍA
  // ══════════════════════════════════════════════════════════════
  loadAuditLogs(): void {
    this.loadingAudit = true;
    this.adminService.getAuditLogs().subscribe({
      next: (data: any[]) => { this.auditLogs = data; this.loadingAudit = false; this.cdr.detectChanges(); },
      error: () => { this.loadingAudit = false; this.cdr.detectChanges(); }
    });
  }

  // ══════════════════════════════════════════════════════════════
  // AJUSTES DEL SISTEMA
  // ══════════════════════════════════════════════════════════════
  onLogoSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;
    this.logoFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.logoPreview = e.target.result;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  saveSystemSettings(): void {
    document.documentElement.style.setProperty('--color-primary', this.primaryColor);
    document.documentElement.style.setProperty('--color-secondary', this.secondaryColor);
    localStorage.setItem('itsm_primary_color', this.primaryColor);
    localStorage.setItem('itsm_secondary_color', this.secondaryColor);
    localStorage.setItem('itsm_goal_resolution_time', this.goalResolutionTime.toString());
    this.settingsMsg = '✓ Ajustes de apariencia y objetivos guardados';
    setTimeout(() => { this.settingsMsg = ''; this.cdr.detectChanges(); }, 3000);
    this.cdr.detectChanges();
  }

  loadSystemColors(): void {
    const p = localStorage.getItem('itsm_primary_color');
    const s = localStorage.getItem('itsm_secondary_color');
    const g = localStorage.getItem('itsm_goal_resolution_time');
    if (p) { this.primaryColor = p; document.documentElement.style.setProperty('--color-primary', p); }
    if (s) { this.secondaryColor = s; document.documentElement.style.setProperty('--color-secondary', s); }
    if (g) { this.goalResolutionTime = parseFloat(g); }
  }

  // ══════════════════════════════════════════════════════════════
  // EMPRESAS / PROYECTOS (Sub-navegación)
  // ══════════════════════════════════════════════════════════════
  loadCompanies(): void {
    this.loadingCompanies = true;
    this.adminService.getCompanies().subscribe({
      next: (data) => { 
        this.companies = data; 
        this.loadingCompanies = false; 
        this.handleCompanyChange();
        this.cdr.detectChanges(); 
      },
      error: () => { this.errorMsg = 'Error al cargar empresas'; this.loadingCompanies = false; this.cdr.detectChanges(); }
    });
  }

  private handleCompanyChange(): void {
    const tabs = this.visibleTabs;
    if (this.activeTab === 'matrix' && !tabs.includes('matrix')) {
      this.setTab('users');
    }

    if (this.activeTab === 'projects' || this.subView === 'admin_projects' || this.subView === 'admin_config_tech') {
      if (this.selectedCompany === 'global') {
        this.setProjectView('list');
      } else {
        const comp = this.companies.find(c => c.id === this.selectedCompany);
        if (comp) {
          this.setProjectView('edit', comp);
        }
      }
    }
  }

  setProjectView(view: 'add' | 'list' | 'edit', company: any = null): void {
    this.projectView = view;
    if (view === 'edit' && company) {
      this.editingCompany = company;
      this.companySubTab = 'users';
      // Recargar datos si es necesario
      this.loadUsers();
      this.loadCategories();
      this.loadPriorities();
    } else if (view === 'add') {
      this.compName = '';
      this.editingCompany = null;
    } else {
      this.editingCompany = null;
    }
  }

  setCompanySubTab(tab: 'users' | 'cats' | 'pris' | 'agents'): void {
    this.companySubTab = tab;
  }

  saveCompany(): void {
    if (!this.compName.trim()) {
      this.errorMsg = 'El nombre de la empresa es obligatorio'; return;
    }
    this.savingCompany = true;
    
    // Si ya estamos editando (en el futuro si hay botón de actualizar nombre)
    const payload = { name: this.compName.trim() };
    
    this.adminService.createCompany(payload).subscribe({
      next: (c) => {
        this.companies.push(c);
        this.savingCompany = false;
        this.successMsg = `✓ Empresa "${c.name}" creada`;
        // Automáticamente ir a editar la nueva empresa
        this.setProjectView('edit', c);
        this.cdr.detectChanges();
      },
      error: (e) => { this.errorMsg = e.error?.error || 'Error al crear empresa'; this.savingCompany = false; this.cdr.detectChanges(); }
    });
  }

  // Usuarios de la empresa
  get usersForCompany(): AdminUser[] {
    if (!this.editingCompany) return [];
    return this.users.filter(u => u.role === 'ROLE_USER' && this.hasCompany(u, this.editingCompany.id));
  }

  sendCompanyInvite(): void {
    if (!this.companyInviteEmail.trim()) return;
    this.inviting = true;
    this.adminService.inviteUser(this.companyInviteEmail, this.companyInviteName, this.editingCompany.id).subscribe({
      next: (res) => {
        this.lastInviteUrl = res.url;
        this.copiedLink = false;
        this.inviting = false;
        this.companyInviteEmail = '';
        this.companyInviteName = '';
        this.cdr.detectChanges();
      },
      error: (e) => { this.errorMsg = e.error?.error || 'Error'; this.inviting = false; this.cdr.detectChanges(); }
    });
  }

  // ── HELPERS ───────────────────────────────────────────────────
  private nextOrder(items: Array<{ sortOrder: number }>): number {
    return items.length ? Math.max(...items.map(i => i.sortOrder)) + 1 : 1;
  }

  private clearMsg(): void { this.successMsg = ''; this.errorMsg = ''; }

  private closeAllForms(): void {
    this.showUserForm = false; this.showCatForm = false; this.showPriForm = false;
    this.editingUser = null; this.editingCat = null; this.editingPri = null;
    this.showCompanyForm = false; this.showInvitePanel = false;
    this.editingCompany = null;
    this.expandedAgentId = null;
    this.projectView = 'list';
  }
}
