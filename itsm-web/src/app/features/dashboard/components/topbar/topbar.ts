import { Component, Input, Output, EventEmitter, ViewEncapsulation, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { User } from '../../../../shared/models/user.model';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: 'topbar.html',
  styleUrl: 'topbar.scss',
  encapsulation: ViewEncapsulation.None,
})
export class TopbarComponent {
  @Input() user: User | null = null;
  @Input() userInitials: string = '';
  @Input() activeView: string = 'dashboard';
  @Input() isAdmin: boolean = false;
  @Input() isAgent: boolean = false;
  @Output() toggleSidebar = new EventEmitter<void>(); // Used for mobile company drawer
  @Output() logout = new EventEmitter<void>();
  @Output() setView = new EventEmitter<string>();

  adminDropdownOpen = false;
  mobileMenuOpen = false;

  toggleAdminDropdown(event: Event) {
    event.stopPropagation();
    this.adminDropdownOpen = !this.adminDropdownOpen;
  }

  closeAdminDropdown() {
    this.adminDropdownOpen = false;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  onSetView(view: string) {
    this.setView.emit(view);
    this.mobileMenuOpen = false;
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.closeAdminDropdown();
  }
}