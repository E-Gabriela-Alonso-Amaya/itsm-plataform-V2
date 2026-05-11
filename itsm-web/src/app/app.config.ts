import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { companyInterceptor } from './core/interceptors/company-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient( //provideHttpClient() — registra el HttpClient en la aplicación. Sin esto Angular no puede hacer peticiones HTTP.
      withInterceptors([authInterceptor, companyInterceptor]) //registra nuestro interceptor para que se ejecute en cada petición automáticamente.
    )
  ]
};
