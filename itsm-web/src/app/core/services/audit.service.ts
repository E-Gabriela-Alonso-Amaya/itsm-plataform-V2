import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api';
import { AuditLog } from '../../shared/models/user.model';

@Injectable({ providedIn: 'root' })
export class AuditService {
  constructor(private api: ApiService) {}

  getHistory(incidentId: string): Observable<AuditLog[]> {
    return this.api.get<AuditLog[]>(`/incidents/${incidentId}/history`);
  }
}