import { Component, OnInit, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: 'system-settings.html',
  styleUrl: 'system-settings.scss'
})
export class SystemSettingsComponent implements OnInit {
  @Input() isAdmin: boolean = false;
  primaryColor = '#334155';
  accentColor = '#64748b';
  goalResolutionTime = 2;
  settingsMsg = '';

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    const p = localStorage.getItem('itsm_primary_color');
    const s = localStorage.getItem('itsm_accent_color');
    const g = localStorage.getItem('itsm_goal_resolution_time');
    if (p) this.primaryColor = p;
    if (s) this.accentColor = s;
    if (g) this.goalResolutionTime = parseFloat(g);
  }

  resetColors(): void {
    this.primaryColor = '#334155';
    this.accentColor = '#64748b';
    this.saveSettings();
    this.settingsMsg = '✓ Colores restaurados a los valores por defecto';
    this.cdr.detectChanges();
  }

  saveSettings(): void {
    document.documentElement.style.setProperty('--color-primary', this.primaryColor);
    document.documentElement.style.setProperty('--color-accent', this.accentColor);
    
    // También actualizar variantes si es necesario (opcional pero recomendado)
    // document.documentElement.style.setProperty('--color-primary-light', this.lightenColor(this.primaryColor, 20));

    localStorage.setItem('itsm_primary_color', this.primaryColor);
    localStorage.setItem('itsm_accent_color', this.accentColor);
    localStorage.setItem('itsm_goal_resolution_time', this.goalResolutionTime.toString());
    
    if (!this.settingsMsg) {
      this.settingsMsg = '✓ Ajustes del sistema actualizados correctamente';
    }
    this.cdr.detectChanges();
    setTimeout(() => {
      this.settingsMsg = '';
      this.cdr.detectChanges();
    }, 3000);
  }
}
