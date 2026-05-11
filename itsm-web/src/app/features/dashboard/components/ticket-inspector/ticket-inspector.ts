import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Incident, Comment, User, Agent } from '../../../../shared/models/user.model';
import { Attachment } from '../../../../shared/models/attachment.model';
import { SecureImagePipe } from '../../../../core/pipes/secure-image-pipe';

@Component({
  selector: 'app-ticket-inspector',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './ticket-inspector.html',
  styleUrl: './ticket-inspector.scss'
})
export class TicketInspectorComponent implements OnInit {
  @Input() selectedTicket: Incident | null = null;
  @Input() user: User | null = null;
  @Input() agents: Agent[] = [];
  @Input() attachments: Attachment[] = [];
  @Input() comments: Comment[] = [];
  @Input() auditLogs: any[] = [];
  
  @Input() loadingComments: boolean = false;
  @Input() loadingAttachments: boolean = false;
  @Input() sendingComment: boolean = false;
  @Input() uploadingAttachment: boolean = false;
  @Input() assigningAgent: boolean = false;
  @Input() deletingAttachmentId: string | null = null;
  
  @Input() isMobile: boolean = false;
  @Input() isSmallScreen: boolean = false;
  
  @Input() pendingFile: File | null = null;
  @Input() pendingDescription: string = '';
  
  @Output() close = new EventEmitter<void>();
  @Output() changeStatus = new EventEmitter<{ticket: Incident, status: string}>();
  @Output() assignAgent = new EventEmitter<string>();
  @Output() sendComment = new EventEmitter<string>();
  @Output() fileSelected = new EventEmitter<any>();
  @Output() uploadFile = new EventEmitter<void>();
  @Output() cancelPending = new EventEmitter<void>();
  @Output() deleteAttachment = new EventEmitter<Attachment>();
  @Output() previewAttachment = new EventEmitter<Attachment>();
  @Output() pendingDescriptionChange = new EventEmitter<string>();

  @ViewChild('chatContainer') chatContainer!: ElementRef;
  
  mobileInspectorTab: 'info' | 'attachments' | 'chat' = 'info';
  selectedAgentId: string = '';
  newComment: string = '';

  ngOnInit(): void {
    if (this.selectedTicket?.assignedToId) {
      this.selectedAgentId = this.selectedTicket.assignedToId;
    }
  }

  onSendComment() {
    if (!this.newComment.trim()) return;
    this.sendComment.emit(this.newComment.trim());
    this.newComment = '';
  }

  onPendingDescChange(val: string) {
    this.pendingDescription = val;
    this.pendingDescriptionChange.emit(val);
  }

  isAdmin(): boolean {
    return !!this.user?.roles.includes('ROLE_ADMIN');
  }

  isAdminOrAgent(): boolean {
    return !!(this.user?.roles.includes('ROLE_ADMIN') || this.user?.roles.includes('ROLE_AGENT'));
  }

  getPriorityClass(priority: string): string {
    const map: Record<string, string> = {
      Crítica: 'priority-critical',
      Critica: 'priority-critical',
      Alta: 'priority-high',
      Normal: 'priority-medium',
      Baja: 'priority-low',
    };
    return map[priority] ?? '';
  }

  getAuditDotClass(field: string, newValue: string | null): string {
    if (field === 'assignedTo') return 'dot-assigned';
    const map: Record<string, string> = {
      Nuevo: 'dot-new',
      Procesando: 'dot-progress',
      'Espera info': 'dot-waiting',
      Resuelto: 'dot-done',
      Cerrado: 'dot-done',
    };
    return map[newValue ?? ''] ?? 'dot-new';
  }

  getAuditBadgeClass(newValue: string | null): string {
    const map: Record<string, string> = {
      Nuevo: 'audit-status-new',
      Procesando: 'audit-status-progress',
      'Espera info': 'audit-status-waiting',
      Resuelto: 'audit-status-done',
      Cerrado: 'audit-status-done',
    };
    return map[newValue ?? ''] ?? '';
  }

  nextStatuses(ticket: Incident): string[] {
    const flow: Record<string, string[]> = {
      Nuevo: ['Procesando'],
      Abierta: ['Procesando'],
      Procesando: ['Resuelto'],
      'Espera info': ['Procesando', 'Resuelto'],
      Pendiente: ['Resuelto'],
      Espera: ['Resuelto'],
    };
    return flow[ticket.status] ?? [];
  }
}
