import { Directive, Injectable, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { Subject } from 'rxjs';

export interface PageContext {
  label: string;
  skill: string;
  facts: string;
  prompts: string[];
}
@Injectable({ providedIn: 'root' })
export class PageContextService {
  current: PageContext | null = null;
  readonly changes = new Subject<void>();
  set(page: PageContext | null) {
    this.current = page;
    this.changes.next();
  }
}
@Directive({ selector: '[appPageContext]', standalone: true })
export class PageContextDirective implements OnChanges, OnDestroy {
  private readonly context = inject(PageContextService);
  @Input({ required: true }) appPageContext!: PageContext;
  private signature = '';
  private version = 0;
  private published: PageContext | null = null;
  ngOnChanges() {
    const signature = JSON.stringify(this.appPageContext);
    if (signature === this.signature) return;
    this.signature = signature;
    const version = ++this.version;
    const page = this.appPageContext;
    queueMicrotask(() => {
      if (version === this.version) {
        this.published = page;
        this.context.set(page);
      }
    });
  }
  ngOnDestroy() {
    this.version++;
    if (this.context.current === this.published) this.context.set(null);
  }
}
