import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('itsm-web');

  ngOnInit(): void {
    this.loadSystemColors();
  }

  private loadSystemColors(): void {
    const p = localStorage.getItem('itsm_primary_color');
    const s = localStorage.getItem('itsm_accent_color');
    if (p) document.documentElement.style.setProperty('--color-primary', p);
    if (s) document.documentElement.style.setProperty('--color-accent', s);
  }
}
