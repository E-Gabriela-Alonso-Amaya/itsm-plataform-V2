import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Attachment } from '../../shared/models/attachment.model';

@Injectable({ providedIn: 'root' })
export class AttachmentService {

  private base = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getAll(incidentId: string): Observable<Attachment[]> {
    return this.http.get<Attachment[]>(`${this.base}/incidents/${incidentId}/attachments`);
  }

  upload(incidentId: string, file: File, description?: string): Observable<Attachment> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    if (description) fd.append('description', description);
    return this.http.post<Attachment>(`${this.base}/incidents/${incidentId}/attachments`, fd);
  }

  getDownloadUrl(incidentId: string, attachmentId: string): string { //descargas directas de documentos (Word/PDF)
    return `${this.base}/incidents/${incidentId}/attachments/${attachmentId}/download`;
  }

  downloadBlob(incidentId: string, attachmentId: string): Observable<Blob> { //previsualizar imágenes con seguridad JWT
    return this.http.get(`${this.base}/incidents/${incidentId}/attachments/${attachmentId}/download`, {
      responseType: 'blob'
    });
  }

  delete(incidentId: string, attachmentId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.base}/incidents/${incidentId}/attachments/${attachmentId}`
    );
  }
}