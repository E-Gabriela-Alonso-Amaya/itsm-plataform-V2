//Guard protege las rutas privadas. Sin él cualquier usuario podría acceder al dashboard escribiendo la URL directamente en el navegador aunque no esté autenticado.

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) { //Comprueba si hay token en localStorage con isAuthenticated()
    return true; //Si hay token → permite el acceso a la ruta return true

  }

  router.navigate(['/login']);
  return false; //Si no hay token → redirige al login y bloquea el acceso return false
};
