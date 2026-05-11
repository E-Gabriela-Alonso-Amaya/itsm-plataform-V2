import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { ApiService } from './api';

export interface Company {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface CompanySummary {
  companyId: string;
  new: number;
  assigned: number;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private activeCompanyIdSubject = new BehaviorSubject<string>('global');
  public activeCompanyId$ = this.activeCompanyIdSubject.asObservable();

  constructor(private api: ApiService) {}

  setActiveCompany(id: string): void {
    this.activeCompanyIdSubject.next(id);
  }

  getActiveCompanyId(): string {
    return this.activeCompanyIdSubject.value;
  }

  getUserCompanies(): Observable<Company[]> {
    return this.api.get<Company[]>('/companies/my');
  }

  getAllCompanies(): Observable<Company[]> {
    return this.api.get<Company[]>('/companies');
  }

  getSummary(): Observable<CompanySummary[]> {
    return this.api.get<CompanySummary[]>('/incidents/summary');
  }
}
