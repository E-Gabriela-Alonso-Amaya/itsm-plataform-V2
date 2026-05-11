import { Injectable } from '@angular/core';
import {ApiService} from './api';
import {Observable} from 'rxjs';
import {Category} from '../../shared/models/user.model';


@Injectable({ //REGISTRA EL SERVICIO EN EL INYECTOR DE DEPENDENCIAS DE ANGULAR PARA QUE PUEDA SER USADO EN CUALQUIER PARTE DE LA APLICACIÓN
  providedIn: 'root',
})
export class CategoryService {

  constructor(private api:ApiService) {} //ApiService  SE REUTILIZA EL SERVICIO GENÉRICO HTTP QUE YA TENEMOS SIN REPETIR EL CÓDIGO

  getAll(): Observable<Category[]> { //getAll() DEVUELVE UN OBSERVABLE DE UN ARRAY DE CATEGORÍAS, QUE SE OBTIENE HACIENDO UNA PETICIÓN GET A LA RUTA /categories DE LA API
    //Observable ES UNA CLASE DE RxJS QUE PERMITE MANEJAR FLUJOS DE DATOS ASÍNCRONOS, EN ESTE CASO LA RESPUESTA DE LA API CUANDO SE OBTIENEN LAS CATEGORÍAS
    //Observable — es el sistema reactivo de Angular. En lugar de esperar la respuesta bloqueando la app, se suscribe y reacciona cuando llegan los datos.
    return this.api.get<Category[]>('/categories');
  }
}
