import { Injectable } from '@angular/core';
import {Observable} from 'rxjs';
import {ApiService} from './api';
import {Priority} from '../../shared/models/user.model';

@Injectable({
  providedIn: 'root',
})
export class PriorityService {

  constructor(private api:ApiService) {}

  getAll(): Observable<Priority[]> {
    return this.api.get<Priority[]>('/priorities');
  }
}
