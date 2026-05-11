import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api';
import { Agent } from '../../shared/models/user.model';
import { User } from '../../shared/models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private api: ApiService) {}

  getAgents(): Observable<Agent[]> {
    return this.api.get<Agent[]>('/users/agents');
  }
  
  getUsers(): Observable<User[]> {
    return this.api.get<User[]>('/users');
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.api.patch<{ message: string }>('/users/me/password', {
      currentPassword,
      newPassword,
    });
  }

  updateProfile(name: string, photo?: File): Observable<User> {
    const formData = new FormData();
    formData.append('name', name);
    if (photo) {
      formData.append('photo', photo);
    }

    return this.api.patch<User>('/users/me/profile', formData);
  }
}
