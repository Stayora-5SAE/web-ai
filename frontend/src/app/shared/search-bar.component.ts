import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SelectionService } from '../core/selection.service';
import { IconComponent } from './icon.component';
@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: ` <form class="search-bar" (ngSubmit)="search()">
    <label class="destination"
      ><span>WHERE · SEARCH DESTINATIONS</span
      ><input
        name="destination"
        [(ngModel)]="selection.destination"
        placeholder="Anywhere in Tunisia"
        maxlength="120"
    /></label>
    <div class="date-fields">
      <label
        ><span>CHECK-IN</span
        ><input
          aria-label="Check-in"
          type="date"
          name="checkIn"
          [(ngModel)]="selection.checkIn"
          [min]="selection.today"
          required /></label
      ><label
        ><span>CHECK-OUT</span
        ><input
          aria-label="Check-out"
          type="date"
          name="checkOut"
          [(ngModel)]="selection.checkOut"
          [min]="selection.checkIn"
          required
      /></label>
    </div>
    <label class="guest-field"
      ><span>GUESTS</span
      ><select name="guests" [(ngModel)]="selection.guests">
        @for (n of [1, 2, 3, 4, 5, 6]; track n) {
          <option [ngValue]="n">{{ n }} {{ n === 1 ? 'guest' : 'guests' }}</option>
        }
      </select></label
    >
    <button class="search-submit" aria-label="Search stays" type="submit">
      <app-icon name="search" />
    </button>
  </form>`,
})
export class SearchBarComponent {
  readonly selection = inject(SelectionService);
  private readonly router = inject(Router);
  search() {
    void this.router.navigate(['/search'], { queryParams: this.selection.params() });
  }
}
