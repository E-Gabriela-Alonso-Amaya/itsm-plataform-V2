import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiService } from './api';
import { Observable } from 'rxjs';
import { CreateIncidentRequest, Incident } from '../../shared/models/user.model';

export interface QueueFilters {
  priority?: string;
  category?: string;
  assigned?: 'me' | 'unassigned' | 'all';
}

@Injectable({ providedIn: 'root' })
export class IncidentService {
  constructor(private api: ApiService) {}

  getAll(): Observable<Incident[]> {
    return this.api.get<Incident[]>('/incidents');
  }

  getMine(): Observable<Incident[]> {
  return this.api.get<Incident[]>('/incidents?mine=true');
  }

  getById(id: string): Observable<Incident> {
    return this.api.get<Incident>(`/incidents/${id}`);
  }

  create(request: CreateIncidentRequest): Observable<Incident> {
    return this.api.post<Incident>('/incidents', request);
  }

  getQueue(filters?: QueueFilters): Observable<Incident[]> {
    const params = new URLSearchParams();
    if (filters?.priority) params.set('priority', filters.priority);
    if (filters?.category) params.set('category', filters.category);
    if (filters?.assigned)  params.set('assigned', filters.assigned);
    const qs = params.toString();
    return this.api.get<Incident[]>(`/incidents/queue${qs ? '?' + qs : ''}`);
  }

  assignToMe(id: string): Observable<Incident> {
    return this.api.post<Incident>(`/incidents/${id}/assign`, {});
  }

  assignToAgent(incidentId: string, agentId: string): Observable<Incident> {
    return this.api.post<Incident>(`/incidents/${incidentId}/assign-to`, { agentId });
  }


  changeStatus(id: string, status: string): Observable<Incident> {
    return this.api.patch<Incident>(`/incidents/${id}/status`, { status });
  }

  rate(id: string, rating: number): Observable<any> {
    return this.api.post(`/incidents/${id}/rate`, { rating });
  }
}