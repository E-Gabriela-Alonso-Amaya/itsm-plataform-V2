import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api';
import { Status } from '../../shared/models/user.model';

@Injectable({ providedIn: 'root' })
export class StatusService {
  constructor(private api: ApiService) {}

  getAll(): Observable<Status[]> {
    return this.api.get<Status[]>('/statuses');
  }
}