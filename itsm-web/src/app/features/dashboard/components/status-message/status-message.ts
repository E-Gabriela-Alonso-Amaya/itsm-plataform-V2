import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-message',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (success) {
      <div class="msg-success">{{ success }}</div>
    }
    @if (error) {
      <div class="msg-error">{{ error }}</div>
    }
  `,
  styles: [`
    .msg-success {
      background: #f0fdf4;
      color: #15803d;
      padding: 12px 16px;
      border-radius: 10px;
      border: 1px solid #bbf7d0;
      margin-bottom: 20px;
      font-size: 14px;
      font-weight: 500;
    }
    .msg-error {
      background: #fef2f2;
      color: #b91c1c;
      padding: 12px 16px;
      border-radius: 10px;
      border: 1px solid #fecaca;
      margin-bottom: 20px;
      font-size: 14px;
      font-weight: 500;
    }
  `]
})
export class StatusMessageComponent {
  @Input() success: string = '';
  @Input() error: string = '';
}
