import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Incident, Priority, Category } from '../../../../shared/models/user.model';

@Component({
  selector: 'app-agent-history',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './agent-history.html',
  styleUrl: './agent-history.scss',
})
export class AgentHistoryComponent {
  @Input() createdTickets: Incident[] = [];
  @Input() workedTickets: Incident[] = [];
  @Input() priorities: Priority[] = [];
  @Input() categories: Category[] = [];

  @Output() openDrawer = new EventEmitter<Incident>();
  @Output() goToCreate = new EventEmitter<void>();

  activeTab: 'created' | 'worked' = 'worked';

  // Filters
  searchQuery: string = '';
  filterPriority: string = '';
  filterCategory: string = '';
  filterStatus: string = '';
  dateFrom: string = '';
  dateTo: string = '';

  get filteredTickets(): Incident[] {
    const source = this.activeTab === 'created' ? this.createdTickets : this.workedTickets;
    
    return source.filter(t => {
      const matchesSearch = !this.searchQuery || 
        t.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        t.reportedBy?.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesPriority = !this.filterPriority || t.priority === this.filterPriority;
      const matchesCategory = !this.filterCategory || t.category === this.filterCategory;
      const matchesStatus = !this.filterStatus || t.status === this.filterStatus;
      
      let matchesDate = true;
      if (this.dateFrom) {
        matchesDate = matchesDate && new Date(t.createdAt) >= new Date(this.dateFrom);
      }
      if (this.dateTo) {
        const end = new Date(this.dateTo);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && new Date(t.createdAt) <= end;
      }

      return matchesSearch && matchesPriority && matchesCategory && matchesStatus && matchesDate;
    });
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

  clearFilters() {
    this.searchQuery = '';
    this.filterPriority = '';
    this.filterCategory = '';
    this.filterStatus = '';
    this.dateFrom = '';
    this.dateTo = '';
  }
}
