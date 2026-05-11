import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api';
import { Comment } from '../../shared/models/user.model';

@Injectable({
  providedIn: 'root',
})
export class CommentService {
  constructor(private api: ApiService) {}

  getByIncident(incidentId: string): Observable<Comment[]> {
    return this.api.get<Comment[]>(`/incidents/${incidentId}/comments`);
  }

  create(incidentId: string, content: string): Observable<Comment> {
    return this.api.post<Comment>(`/incidents/${incidentId}/comments`, { content });
  }
}