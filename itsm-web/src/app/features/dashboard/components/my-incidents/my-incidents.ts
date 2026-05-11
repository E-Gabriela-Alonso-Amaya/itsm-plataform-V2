import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Incident } from '../../../../shared/models/user.model';

@Component({
  selector: 'app-my-incidents',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './my-incidents.html',
  styleUrl: './my-incidents.scss'
})
export class MyIncidentsComponent {
  @Input() incidentsOpen: Incident[] = [];
  @Input() incidentsResolved: Incident[] = [];
  @Input() loading: boolean = false;
  @Input() hasUnreadComments!: (ticketId: string) => boolean;
  @Input() hasComments!: (ticketId: string) => boolean;
  @Input() getPriorityClass!: (priority: string) => string;

  @Output() openTicket = new EventEmitter<Incident>();
  @Output() createNew = new EventEmitter<void>();
}
