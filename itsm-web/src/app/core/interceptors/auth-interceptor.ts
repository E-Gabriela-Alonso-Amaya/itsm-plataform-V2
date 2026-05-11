//El interceptor se ejecuta automáticamente en cada petición HTTP que hace Angular

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken(); //Obtiene el token del AuthService

  if (token) { //Si existe, clona la petición original añadiendo el header Authorization: Bearer TOKEN
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`) //Deja pasar la petición modificada
    });
    return next(authReq);
  }

  return next(req); //Si no hay token, deja pasar la petición sin modificar
};
