import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ListingManagementService } from './listing-management.service';
import { ListingEditorComponent } from './listing-editor.component';

describe('ListingEditorComponent AI review', () => {
  it('sends only sanitized facts and applies a suggestion after explicit action', async () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['assist']);
    api.assist.and.resolveTo({
      mode: 'mock',
      skill: 'listing-description',
      text: 'Reviewed draft.',
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: api },
        { provide: ListingManagementService, useValue: {} },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        { provide: Router, useValue: {} },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new ListingEditorComponent());
    component.model.description = 'Original description';
    component.model.destination = 'La Marsa<script>';
    component.amenities = 'Kitchen, Wi-Fi';
    await component.draftDescription();
    expect(component.model.description).toBe('Original description');
    expect(component.aiDraft).toBe('Reviewed draft.');
    const [skill, context] = api.assist.calls.mostRecent().args;
    expect(skill).toBe('listing-description');
    expect(context).not.toContain('<script>');
    expect(context).not.toContain('Original description');
    component.applyDraft();
    expect(component.model.description).toBe('Reviewed draft.');
    expect(component.aiDraft).toBe('');
  });
});
