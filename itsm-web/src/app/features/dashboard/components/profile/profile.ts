import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserService } from '../../../../core/services/user.service';
import { User } from '../../../../shared/models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ProfileComponent implements OnInit {
  @Input() user: User | null = null;

  // PERFIL
  editingName = '';
  savingProfile = false;
  profileMsg = '';
  profileError = '';
  profilePhotoPreview: string | null = null;
  profilePhotoFile: File | null = null;

  // PASSWORD
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  savingPassword = false;
  passwordMsg = '';
  passwordError = '';

  constructor(private userService: UserService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (this.user) {
      this.editingName = this.user.name;
    }
  }

  onPhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.profilePhotoFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profilePhotoPreview = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  saveProfile(): void {
    this.profileMsg = '';
    this.profileError = '';
    if (!this.editingName.trim()) {
      this.profileError = 'El nombre no puede estar vacío.';
      return;
    }
    this.savingProfile = true;
    this.userService
      .updateProfile(this.editingName.trim(), this.profilePhotoFile ?? undefined)
      .subscribe({
        next: (updated: User) => {
          this.user = updated;
          this.profileMsg = '✓ Perfil actualizado correctamente';
          this.profilePhotoFile = null;
          this.savingProfile = false;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.profileError = err.error?.error || 'Error al guardar el perfil';
          this.savingProfile = false;
          this.cdr.detectChanges();
        },
      });
  }

  savePassword(): void {
    this.passwordMsg = '';
    this.passwordError = '';
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.passwordError = 'Todos los campos son obligatorios';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Las contraseñas no coinciden';
      return;
    }
    if (this.newPassword.length < 8) {
      this.passwordError = 'La nueva contraseña debe tener al menos 8 caracteres';
      return;
    }
    this.savingPassword = true;
    this.userService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.passwordMsg = '✓ Contraseña actualizada correctamente';
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.savingPassword = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.passwordError = err.error?.error || 'Error al cambiar la contraseña';
        this.savingPassword = false;
        this.cdr.detectChanges();
      },
    });
  }
}
