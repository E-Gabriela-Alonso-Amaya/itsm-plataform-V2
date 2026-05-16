import { Component, Input, Output, EventEmitter, ViewEncapsulation, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CompanyService, Company } from '../../../../core/services/company.service';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: 'sidebar.html',
  styleUrl: 'sidebar.scss',
  encapsulation: ViewEncapsulation.None,
})
export class SidebarComponent implements OnInit {
  @Input() activeCompanyId: string = 'global';
  @Input() sidebarOpen: boolean = false;
  @Output() setCompany = new EventEmitter<string>();
  @Output() closeSidebar = new EventEmitter<void>();

  companies: Company[] = [];
  summaryMap: Record<string, { new: number, assigned: number }> = {};
  isAdmin: boolean = false;

  constructor(
    private companyService: CompanyService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // 1. Verificar rol
    this.authService.me().subscribe(({user}) => {
      this.isAdmin = user.roles.includes('ROLE_ADMIN');
      this.loadCompanies();
      this.loadSummary();
    });

    // 2. Escuchar cambios de empresa activa
    this.companyService.activeCompanyId$.subscribe(id => {
      this.activeCompanyId = id;
      this.cdr.detectChanges();
    });

    // Polling de notificaciones cada 30s
    setInterval(() => this.loadSummary(), 30000);
  }

  loadSummary() {
    this.companyService.getSummary().subscribe(summaries => {
      this.summaryMap = {};
      summaries.forEach(s => {
        this.summaryMap[s.companyId] = { new: s.new, assigned: s.assigned };
      });
      this.cdr.detectChanges();
    });
  }

  getNewCount(companyId: string): number {
    return this.summaryMap[companyId]?.new || 0;
  }

  getAssignedCount(companyId: string): number {
    return this.summaryMap[companyId]?.assigned || 0;
  }

  getUnreadCount(companyId: string): number {
    // Podemos usar un valor por defecto o sumar si tuviéramos ese dato
    // Por ahora para que compile, devolvemos 0 o lo mapeamos si existe
    return (this.summaryMap[companyId] as any)?.unread || 0;
  }

  loadCompanies() {
    if (this.isAdmin) {
      // Admin ve todas
      this.companyService.getAllCompanies().subscribe(list => {
        this.companies = [{ id: 'global', name: 'Global', logoUrl: null }, ...list];
        this.cdr.detectChanges();
      });
    } else {
      // Agente ve solo las asignadas
      this.companyService.getUserCompanies().subscribe(list => {
        this.companies = list;
        // Si no hay ninguna empresa asignada global activa, auto-seleccionar la primera
        if (this.companies.length > 0 && (this.activeCompanyId === 'global' || !this.activeCompanyId)) {
           this.selectCompany(this.companies[0].id);
        }
        this.cdr.detectChanges();
      });
    }
  }

  selectCompany(id: string) {
    this.companyService.setActiveCompany(id);
    this.setCompany.emit(id);
    this.closeSidebar.emit();
  }
}