import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { IncidentService } from '../../core/services/incident';
import { QueueFilters } from '../../core/services/incident';
import { AuthService } from '../../core/services/auth';
import { CategoryService } from '../../core/services/category';
import { PriorityService } from '../../core/services/priority';
import { Incident, User, Category, Priority } from '../../shared/models/user.model';

@Component({
  selector: 'app-agent-queue',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
  ],
  templateUrl: './agent-queue.html',
  styleUrl: './agent-queue.scss',
})
export class AgentQueueComponent implements OnInit {
  user: User | null = null;
  incidents: Incident[] = [];
  categories: Category[] = [];
  priorities: Priority[] = [];

  loading = true;
  assigningId: string | null = null;
  error = '';
  successMsg = '';

  // Filtros
  filterPriority = '';
  filterCategory = '';
  filterAssigned: 'me' | 'unassigned' | 'all' = 'all';

  constructor(
    private incidentService: IncidentService,
    private authService: AuthService,
    private categoryService: CategoryService,
    private priorityService: PriorityService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authService.me().subscribe({
      next: (response: { user: User }) => {
        this.user = response.user;
        this.cdr.detectChanges();
      },
      error: () => this.authService.logout()
    });

    this.categoryService.getAll().subscribe((data: Category[]) => {
      this.categories = data;
    });

    this.priorityService.getAll().subscribe((data: Priority[]) => {
      this.priorities = data;
    });

    this.loadQueue();
  }

  loadQueue(): void {
    this.loading = true;
    this.error = '';
    const filters: QueueFilters = {};
    if (this.filterPriority) filters.priority = this.filterPriority;
    if (this.filterCategory) filters.category = this.filterCategory;
    if (this.filterAssigned !== 'all') filters.assigned = this.filterAssigned;

    this.incidentService.getQueue(filters).subscribe({
      next: (data: Incident[]) => {
        this.incidents = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar la cola de trabajo';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters(): void {
    this.loadQueue();
  }

  clearFilters(): void {
    this.filterPriority = '';
    this.filterCategory = '';
    this.filterAssigned = 'all';
    this.loadQueue();
  }

  assign(incident: Incident): void {
    this.assigningId = incident.id;
    this.successMsg = '';
    this.error = '';

    this.incidentService.assignToMe(incident.id).subscribe({
      next: (res: { id: string; assignedTo: string | null; status: string }) => {
        this.successMsg = `✓ Has asumido el ticket: "${incident.title}"`;
        this.assigningId = null;
        this.loadQueue();
      },
      error: (err: { error?: { error?: string } }) => {
        this.error = err.error?.error || 'No se pudo asumir el ticket';
        this.assigningId = null;
        this.cdr.detectChanges();
      }
    });
  }

  isAssignedToMe(incident: Incident): boolean {
    return incident.assignedTo === this.user?.name;
  }

  get unassignedCount(): number {
    return this.incidents.filter(i => !i.assignedTo).length;
  }

  get myTicketsCount(): number {
    return this.incidents.filter(i => this.isAssignedToMe(i)).length;
  }

  getPriorityClass(priority: string): string {
    const map: Record<string, string> = {
      'Crítica': 'priority-critical',
      'Alta': 'priority-high',
      'Normal': 'priority-medium',
      'Baja': 'priority-low',
    };
    return map[priority] ?? '';
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.authService.logout();
  }
}