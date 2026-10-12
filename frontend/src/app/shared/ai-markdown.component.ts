import { Component, Input, ViewEncapsulation } from '@angular/core';
import { Marked } from 'marked';

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

const markdown = new Marked({
  async: false,
  gfm: true,
  breaks: true,
  renderer: {
    // Model output is text: never interpret its raw HTML or load remote images.
    html: ({ text }) => escapeHtml(text),
    image: ({ text }) => escapeHtml(text),
    heading({ tokens, depth }) {
      const level = Math.min(depth + 2, 6);
      return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>`;
    },
  },
});

@Component({
  selector: 'app-ai-markdown',
  standalone: true,
  template: `<div class="ai-markdown" [innerHTML]="html"></div>`,
  styleUrl: './ai-markdown.component.css',
  // Scope every rule to this component; Angular's HTML sanitizer remains enabled.
  encapsulation: ViewEncapsulation.None,
  host: { 'aria-live': 'polite', 'aria-atomic': 'true' },
})
export class AiMarkdownComponent {
  html = '';

  @Input({ required: true }) set text(value: string) {
    this.html = markdown.parse(value ?? '', { async: false });
  }
}
