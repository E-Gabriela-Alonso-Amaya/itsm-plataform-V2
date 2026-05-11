import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import {
  Incident, User, Category, Priority, Status,
  Agent, Comment, Attachment, AuditLog
} from '../../../../shared/models/user.model';

import { SecureImagePipe } from '../../../../core/pipes/secure-image-pipe';

@Component({
  selector: 'app-all-incidents',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatIconModule,
    MatFormFieldModule, MatSelectModule,
    MatInputModule, MatDatepickerModule,
    MatNativeDateModule, MatProgressSpinnerModule,
    SecureImagePipe
  ],
  templateUrl: './all-incidents.component.html',
  styleUrl: './all-incidents.component.scss'
})
export class AllIncidentsComponent {

  // Datos recibidos desde Dashboard
  @Input() incidents: Incident[] = [];
  @Input() categories: Category[] = [];
  @Input() priorities: Priority[] = [];
  @Input() statuses: Status[] = [];
  @Input() agents: Agent[] = [];
  @Input() users: User[] = [];
  @Input() user!: User;

  // Inspector
  @Input() drawerOpen = false;
  @Input() selectedTicket: Incident | null = null;

  @Output() open = new EventEmitter<Incident>();
  @Output() close = new EventEmitter<void>();

 
  // NUEVAS VARIABLES PARA EL HTML

  hasSearched = false;

  filterFrom: Date | null = null;
  filterTo: Date | null = null;
  filterPriority = '';
  filterCategory = '';
  filterStatus = '';
  filterAgent = '';
  filterEmployee = '';

  allIncidents: Incident[] = [];

  displayedColumns = [
    'title', 'category', 'priority',
    'status', 'reportedBy', 'assignedTo', 'createdAt'
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(): void {
    this.allIncidents = [...this.incidents];
  }

  // ============================
  // FORMATEAR FECHA dd/mm/yyyy
  // ============================
  formatDate(d: Date): string {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // SABER SI HAY FILTROS ACTIVOS
  hasActiveFilters(): boolean {
    return !!(
      this.filterFrom ||
      this.filterTo ||
      this.filterPriority ||
      this.filterCategory ||
      this.filterStatus ||
      this.filterAgent ||
      this.filterEmployee
    );
  }

  // BOTÓN "APLICAR FILTROS"
  search(): void {
    this.hasSearched = true;
    this.applyFilters();
  }

  // APLICAR FILTROS
  applyFilters(): void {
    let filtered = [...this.allIncidents];

    if (this.filterFrom) {
      const from = this.filterFrom;
      filtered = filtered.filter(i => new Date(i.createdAt) >= from);
    }

    if (this.filterTo) {
      const to = this.filterTo;
      filtered = filtered.filter(i => new Date(i.createdAt) <= to);
    }

    if (this.filterPriority) {
      filtered = filtered.filter(i => i.priority === this.filterPriority);
    }

    if (this.filterCategory) {
      filtered = filtered.filter(i => i.category === this.filterCategory);
    }

    if (this.filterStatus) {
      filtered = filtered.filter(i => i.status === this.filterStatus);
    }

    if (this.filterAgent) {
      filtered = filtered.filter(i => i.assignedTo === this.filterAgent);
    }

    if (this.filterEmployee) {
      filtered = filtered.filter(i => i.reportedBy === this.filterEmployee);
    }

    this.incidents = filtered;
    this.cdr.detectChanges();
  }

  // LIMPIAR TODO
  clearAllFilters(): void {
    this.filterFrom = null;
    this.filterTo = null;
    this.filterPriority = '';
    this.filterCategory = '';
    this.filterStatus = '';
    this.filterAgent = '';
    this.filterEmployee = '';

    this.incidents = [...this.allIncidents];
    this.hasSearched = false;
  }

  // INSPECTOR
  openDrawer(ticket: Incident): void {
    this.open.emit(ticket);
  }

  closeDrawer(): void {
    this.close.emit();
  }

  // PRIORIDADES
  getPriorityClass(priority: string): string {
    const map: Record<string, string> = {
      'Crítica': 'priority-critical', 'Critica': 'priority-critical',
      'Alta': 'priority-high', 'Normal': 'priority-medium', 'Baja': 'priority-low',
    };
    return map[priority] ?? '';
  }

  // URL DE ADJUNTOS
  getAttachmentUrl(id: string): string {
    return `/api/attachments/${id}`;
  }
}
