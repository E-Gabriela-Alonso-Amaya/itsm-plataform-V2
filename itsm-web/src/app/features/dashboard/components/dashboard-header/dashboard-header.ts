import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="view-header">
      <div>
        <h1 class="view-title">Bienvenido, {{ name }}</h1>
        <p class="view-sub">{{ date }}</p>
      </div>
    </div>
  `,
  styles: [`
    .view-header {
      margin-bottom: 24px;
    }
    .view-title {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .view-sub {
      font-size: 14px;
      color: #64748b;
      margin: 4px 0 0;
    }
  `]
})
export class DashboardHeaderComponent {
  @Input() name: string = '';
  @Input() date: string = '';
}
