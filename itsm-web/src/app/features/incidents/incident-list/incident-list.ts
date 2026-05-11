import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { IncidentService } from '../../../core/services/incident';
import { AuthService } from '../../../core/services/auth';
import { Incident } from '../../../shared/models/user.model';

const PRIORITY_ORDER: Record<string, number> = {
  'Crítica': 1,
  'Alta': 2,
  'Normal': 3,
  'Baja': 4,
};

@Component({
  selector: 'app-incident-list',
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule
  ],
  templateUrl: './incident-list.html',
  styleUrl: './incident-list.scss',
})
export class IncidentListComponent implements OnInit {

  incidents: Incident[] = [];
  loading = true;
  error = '';

  // COLUMNAS
  displayedColumns = ['title', 'category', 'priority', 'status', 'reportedBy', 'createdAt', 'assignedTo'];

  constructor(
    private incidentService: IncidentService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.incidentService.getAll().subscribe({
      next: (data) => {
        console.log('Prioridades recibidas:', data.map(i => i.priority));
        this.incidents = data.sort((a, b) => {
          const pa = PRIORITY_ORDER[a.priority] ?? 99;
          const pb = PRIORITY_ORDER[b.priority] ?? 99;
          if (pa !== pb) return pa - pb;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al cargar las Incidencias';
        this.loading = false;
      }
    });
  }

  createIncident(): void {
    this.router.navigate(['/incidents/create']);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.authService.logout();
  }
}
