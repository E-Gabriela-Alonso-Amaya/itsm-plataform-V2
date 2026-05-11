import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api';
import { AuthResponse, LoginRequest, User } from '../../shared/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private tokenKey = 'auth_token'; //guarda la clave del token en localStorage

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  //login() — llama a /auth/login y con tap() guarda el token automáticamente en localStorage cuando llega la respuesta.
  // tap() es un operador de RxJS que ejecuta una acción sin modificar el valor del Observable.
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/login', credentials).pipe(
      tap(response => {
        localStorage.setItem(this.tokenKey, response.token);
      })
    );
  }

  me(): Observable<{user: User}> { //lama a /auth/me para obtener los datos del usuario actual.
    return this.api.get<{user: User}>('/auth/me');
  }

  logout(): void { //borra el token de localStorage y redirige al login.
    localStorage.removeItem(this.tokenKey);
    this.router.navigate(['/login']);
  }

  getToken(): string | null { //devuelve el token guardado o null si no existe.
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean { //devuelve true si hay token guardado. Lo usará el Guard para proteger rutas.
    return this.getToken() !== null;
  }
}
