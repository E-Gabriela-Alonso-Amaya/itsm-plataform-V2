import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CompanyService } from '../services/company.service';

export const companyInterceptor: HttpInterceptorFn = (req, next) => {
  const companyService = inject(CompanyService);
  const companyId = companyService.getActiveCompanyId();
  
  if (companyId && companyId !== 'global') {
    const cloned = req.clone({
      headers: req.headers.set('X-Company-Id', companyId)
    });
    return next(cloned);
  }
  
  return next(req);
};
