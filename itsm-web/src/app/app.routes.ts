import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard', //cuando el usuario entra en `/` lo redirige al dashboard automáticamente.
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => //carga los componentes de forma lazy (solo cuando se necesitan), mejora el rendimiento.
      import('./features/auth/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard').then(m => m.DashboardComponent),
    canActivate: [authGuard] //protege el dashboard. Si no hay token redirige al login.
  },
  {
    path: 'incidents', //ruta para listar los incidentes.
    loadComponent: () =>
      import('./features/incidents/incident-list/incident-list').then(m => m.IncidentListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'incidents/create', //ruta para el formulario de creación de incidentes.
    loadComponent: () =>
      import('./features/incidents/create-incident/create-incident').then(m => m.CreateIncidentComponent),
    canActivate: [authGuard]
  },
  {
    path: 'agent-queue',
    loadComponent: () =>
      import('./features/agent-queue/agent-queue').then(m => m.AgentQueueComponent),
    canActivate: [authGuard]
  },
  {
    path: '**', //cualquier ruta desconocida redirige al dashboard.
    redirectTo: 'dashboard'
  }
];
