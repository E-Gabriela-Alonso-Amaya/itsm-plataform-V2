import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { IncidentService } from '../../../core/services/incident';
import { CategoryService } from '../../../core/services/category';
import { PriorityService } from '../../../core/services/priority';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth';
import { AttachmentService } from '../../../core/services/attachment.service';
import { Category, Priority, Agent, Incident } from '../../../shared/models/user.model';

@Component({
  selector: 'app-create-incident',
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatCheckboxModule
  ],
  templateUrl: './create-incident.html',
  styleUrl: './create-incident.scss',
})
export class CreateIncidentComponent implements OnInit {

  // DATOS DEL FORMULARIO
  title = '';
  description = '';
  categoryId: number | null = null;
  priorityId: number | null = null;
  assignToMe = false;
  assignmentOption = 'none'; // 'none', 'me', 'agent'
  selectedAgentId: string | null = null;

  // ADJUNTOS
  pendingFile: File | null = null;
  pendingFileName = '';
  uploadingAttachment = false;

  // DATOS DE LOS DESPLEGABLES
  categories: Category[] = [];
  priorities: Priority[] = [];
  agents: Agent[] = [];

  // ESTADOS
  loading = false;
  error = '';

  // ROL DEL USUARIO
  isAdmin = false;
  isAgent = false;

  constructor(
    private incidentService: IncidentService,
    private categoryService: CategoryService,
    private priorityService: PriorityService,
    private userService: UserService,
    private authService: AuthService,
    private attachmentService: AttachmentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // CARGAR CATEGORÍAS Y PRIORIDADES PARA LOS DESPLEGABLES
    this.categoryService.getAll().subscribe(data => this.categories = data);
    this.priorityService.getAll().subscribe(data => this.priorities = data);

    // COMPROBAR ROL DEL USUARIO
    const token = this.authService.getToken();
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.isAdmin = payload.roles?.includes('ROLE_ADMIN');
      this.isAgent = payload.roles?.includes('ROLE_AGENT');
      
      // Si es admin, cargar agentes disponibles
      if (this.isAdmin) {
        this.userService.getAgents().subscribe(data => this.agents = data);
      }
    }
  }

  submit(): void {
    const isEmployee = !this.isAdmin && !this.isAgent;
    
    if (!this.title || !this.description || !this.categoryId || (!isEmployee && !this.priorityId)) {
      this.error = 'Todos los campos son obligatorios';
      return;
    }

    this.loading = true;
    this.error = '';

    const body: any = {
      title:       this.title,
      description: this.description,
      categoryId:  this.categoryId,
    };

    if (!isEmployee) {
      body.priorityId = this.priorityId;
    }

  if (this.assignmentOption === 'me') {
    body.assignToMe = true;
  } else if (this.assignmentOption === 'agent' && this.selectedAgentId) {
    body.assignedToId = this.selectedAgentId;
  }

  this.incidentService.create(body).subscribe({
    next: (incident: Incident) => {
      if (this.pendingFile) {
        this.uploadingAttachment = true;
        this.attachmentService.upload(incident.id, this.pendingFile, '').subscribe({
          next: () => this.router.navigate(['/dashboard']),
          error: (err) => {
            console.error('Error al subir adjunto:', err);
            this.error = 'Incidencia creada, pero: ' + (err.error?.message || err.error?.error || 'hubo un problema al subir el archivo.');
            this.loading = false;
            this.uploadingAttachment = false;
          }
        });
      } else {
        this.router.navigate(['/dashboard']);
      }
    },
    error: (err) => {
      this.error = err.error?.errors?.join(', ') || 'Error al crear la incidencia';
      this.loading = false;
    }
  });
}

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;

    // Si no es imagen, validamos tamaño directo y aceptamos
    if (!file.type.startsWith('image/')) {
      if (file.size > 2 * 1024 * 1024) {
        this.error = 'El archivo supera el límite de 2 MB.';
        return;
      }
      this.pendingFile = file;
      this.pendingFileName = file.name;
      this.error = '';
      return;
    }

    // SI ES IMAGEN: Redimensionar en el cliente
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const max_size = 1280; // Tamaño máximo (ancho o alto)

        if (width > height) {
          if (width > max_size) {
            height *= max_size / width;
            width = max_size;
          }
        } else {
          if (height > max_size) {
            width *= max_size / height;
            height = max_size;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            // Creamos un nuevo File a partir del Blob redimensionado
            this.pendingFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            this.pendingFileName = file.name;
            this.error = '';
          }
        }, 'image/jpeg', 0.8); // 80% de calidad JPEG
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

removeFile(): void {
  this.pendingFile = null;
  this.pendingFileName = '';
}



  cancel(): void {
    this.router.navigate(['/dashboard']);
  }
}
