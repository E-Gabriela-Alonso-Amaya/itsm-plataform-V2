// DEFINIR EL MODELO DE DATOS DE USUARIO
/*
 * LE DECIMOS A TypeScript que forma tiene los objetos que va a manejar la aplicación
 */

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
  avatarUrl?: string;
  categories?: Category[];
}

export interface AuthResponse { token: string; }
export interface LoginRequest { email: string; password: string; }

export interface Category { id: number; name: string; sortOrder: number; companyId?: string; companyName?: string; }
export interface Priority { id: number; name: string; slaHours: number | null; sortOrder: number; companyId?: string; companyName?: string; }
export interface Status   { id: number; name: string; isDefault: boolean; isClosed: boolean; sortOrder: number; }

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryId: number;
  priority: string;
  priorityOrder: number;
  status: string;
  statusId: number;
  isClosed: boolean;
  reportedBy: string;
  reportedById: string;
  assignedTo: string | null;
  assignedToId: string | null;
  createdAt: string;
  updatedAt?: string;
  startedAt?: string;
  resolvedAt?: string;
  slaHours?: number | null;
  pausedAt?: string | null;
  totalPausedMs?: number;
  rating?: number;
  
  attachments?: Attachment[];
  comments?: Comment[];
  company?: string;
}


export interface CreateIncidentRequest {
  title: string;
  description: string;
  categoryId: number;
  priorityId: number;
  assignToMe?: boolean;
  assignedToId?: string | null; 
}


export interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  isOwn?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  roles: string[];
  companies?: { id: string; name: string }[];
}

export interface AuditLog {
  id: string;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  description: string | null;
  uploadedBy: string;
  uploadedById: string;
  createdAt: string;
  isImage: boolean;
}
