import { Injectable } from '@angular/core'; //Importa el decorador Injectable que le dice a Angular que esta clase puede ser inyectada en otros componentes y servicios.
import { HttpClient } from '@angular/common/http'; //Importa el cliente HTTP de Angular. Es la clase que hace las peticiones reales a la API (GET, POST, PATCH, DELETE).
import { Observable } from 'rxjs'; //Importa Observable de RxJS. En Angular las peticiones HTTP no devuelven el dato directamente sino un Observable — es como una "promesa" que emite el valor cuando llega la respuesta del servidor.
import { environment } from '../../../environments/environment';//Importa el archivo de configuración donde está la apiUrl base.

@Injectable({ //Le dice a Angular que cree una sola instancia
  providedIn: 'root'
})
export class ApiService {

  private apiUrl = environment.apiUrl;
  //Guarda la URL base http://127.0.0.1:8000/api en una propiedad privada. Solo accesible dentro de la clase.
  constructor(private http: HttpClient) {}
  //Angular inyecta automáticamente el HttpClient. No hace falta hacer new HttpClient(), Angular lo gestiona.

  //Metodo genérico para peticiones GET. El <T> significa que puede devolver cualquier tipo — lo decide quien lo llama:
  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}${endpoint}`);
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}${endpoint}`, body);
  }

  //Para actualizar parcialmente un recurso. Por ejemplo para cambiar el estado de un ticket o asignar un agente, etc.
  patch<T>(endpoint: string, body: any): Observable<T> {
    return this.http.patch<T>(`${this.apiUrl}${endpoint}`, body);
  }

  //Para eliminar recursos. sE usará en el panel de administración.
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}${endpoint}`);
  }

}

