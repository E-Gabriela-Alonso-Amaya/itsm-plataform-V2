import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SecureImagePipe } from '../../../../core/pipes/secure-image-pipe';
import { Attachment } from '../../../../shared/models/attachment.model';

@Component({
  selector: 'app-lightbox',
  standalone: true,
  imports: [CommonModule, MatIconModule, SecureImagePipe],
  templateUrl: 'lightbox.html',
  styleUrl: 'lightbox.scss',
  encapsulation: ViewEncapsulation.None,
})
export class LightboxComponent {
  @Input() previewAttachment: Attachment | null = null;
  @Input() getAttachmentUrl!: (id: string) => string;
  @Output() close = new EventEmitter<void>();
}