import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category, Priority } from '../../shared/models/user.model';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  role: string;
  isActive: boolean;
  createdAt: string;
  categories?: Category[];
  companies?: any[];
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password?: string;
  role: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  newPassword?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {

  private base = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  // ── CATEGORÍAS ────────────────────────────────────────────────
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.base}/categories`);
  }

  createCategory(name: string, sortOrder: number, companyId?: string): Observable<Category> {
    return this.http.post<Category>(`${this.base}/categories`, { name, sortOrder, companyId });
  }

  updateCategory(id: number, name: string, sortOrder: number, companyId?: string): Observable<Category> {
    return this.http.put<Category>(`${this.base}/categories/${id}`, { name, sortOrder, companyId });
  }

  deleteCategory(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/categories/${id}`);
  }

  // ── PRIORIDADES ───────────────────────────────────────────────
  getPriorities(): Observable<Priority[]> {
    return this.http.get<Priority[]>(`${this.base}/priorities`);
  }

  createPriority(data: { name: string; sortOrder: number; slaHours: number | null }): Observable<Priority> {
    return this.http.post<Priority>(`${this.base}/priorities`, data);
  }

  updatePriority(id: number, data: { name?: string; sortOrder?: number; slaHours?: number | null }): Observable<Priority> {
    return this.http.put<Priority>(`${this.base}/priorities/${id}`, data);
  }

  deletePriority(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/priorities/${id}`);
  }

  // ── USUARIOS ──────────────────────────────────────────────────
  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.base}/users`);
  }

  createUser(data: CreateUserRequest): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.base}/users`, data);
  }

  updateUser(id: string, data: UpdateUserRequest): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.base}/users/${id}`, data);
  }

  toggleUser(id: string): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.base}/users/${id}/toggle`, {});
  }

  // ── INVITACIONES ──────────────────────────────────────────────
  inviteUser(email: string, name?: string, companyId?: string): Observable<any> {
    const payload: any = { email };
    if (name) payload.name = name;
    if (companyId) payload.companyId = companyId;
    return this.http.post(`${this.base}/invite`, payload);
  }

  // ── MATRIZ DE ASIGNACIÓN ──────────────────────────────────────
  updateMatrix(userId: string, data: { categories?: any[], companies?: any[] }): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.base}/users/${userId}/matrix`, data);
  }

  // ── AUDITORÍA ─────────────────────────────────────────────────
  getAuditLogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/audit`);
  }

  // ── EMPRESAS ──────────────────────────────────────────────────
  getCompanies(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/companies`);
  }

  createCompany(data: { name: string }): Observable<any> {
    return this.http.post<any>(`${this.base}/companies`, data);
  }

  updateCompany(id: string, data: { name?: string }): Observable<any> {
    return this.http.put<any>(`${this.base}/companies/${id}`, data);
  }

  deleteCompany(id: string): Observable<any> {
    return this.http.delete<any>(`${this.base}/companies/${id}`);
  }
}
