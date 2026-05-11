import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SecureImagePipe } from '../../../../core/pipes/secure-image-pipe';
import { Incident, Comment, User } from '../../../../shared/models/user.model';
import { Attachment } from '../../../../shared/models/attachment.model';

@Component({
  selector: 'app-drawer-employee',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule, SecureImagePipe],
  templateUrl: 'drawer-employee.html',
  styleUrl: 'drawer-employee.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DrawerEmployeeComponent {
  // ── Estado ────────────────────────────────────────────────────
  @Input() drawerOpen: boolean = false;
  @Input() selectedTicket: Incident | null = null;
  @Input() user: User | null = null;

  // ── Chat ──────────────────────────────────────────────────────
  @Input() comments: Comment[] = [];
  @Input() loadingComments: boolean = false;
  @Input() newComment: string = '';
  @Input() sendingComment: boolean = false;

  // ── Adjuntos ──────────────────────────────────────────────────
  @Input() attachments: Attachment[] = [];
  @Input() pendingFile: File | null = null;
  @Input() pendingDescription: string = '';
  @Input() uploadingAttachment: boolean = false;

  // ── Helpers pasados desde el padre ───────────────────────────
  @Input() getPriorityClass!: (priority: string) => string;
  @Input() getAttachmentUrl!: (id: string) => string;
  @Input() isEmployee!: () => boolean;

  // ── Eventos hacia el padre ────────────────────────────────────
  @Output() closeDrawer = new EventEmitter<void>();
  @Output() sendComment = new EventEmitter<void>();
  @Output() newCommentChange = new EventEmitter<string>();
  @Output() onFileSelected = new EventEmitter<Event>();
  @Output() uploadAttachment = new EventEmitter<void>();
  @Output() cancelPending = new EventEmitter<void>();
  @Output() pendingDescriptionChange = new EventEmitter<string>();
  @Output() openAttachmentPreview = new EventEmitter<Attachment>();
}