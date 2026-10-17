import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiMarkdownComponent } from './ai-markdown.component';

describe('AI Markdown responses', () => {
  let fixture: ComponentFixture<AiMarkdownComponent>;
  let element: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AiMarkdownComponent] });
    fixture = TestBed.createComponent(AiMarkdownComponent);
    element = fixture.nativeElement;
  });

  function render(text: string) {
    fixture.componentRef.setInput('text', text);
    fixture.detectChanges();
  }

  it('renders emphasis, nested lists, section headings, quotes, links and code', () => {
    render(
      '# Your stay\n\n**Bold** and *italic*, ~~old~~, `code`.\n\n' +
        '- First\n  - Nested\n- Second\n\n1. Arrive\n2. Explore\n\n' +
        '> Verify opening hours.\n\n[Visitor guide](https://example.com/guide)\n\n' +
        '```text\n<sample>\n```',
    );
    expect(element.querySelector('h3')?.textContent).toBe('Your stay');
    expect(element.querySelector('h1')).toBeNull();
    expect(element.querySelector('strong')?.textContent).toBe('Bold');
    expect(element.querySelector('em')?.textContent).toBe('italic');
    expect(element.querySelector('del')?.textContent).toBe('old');
    expect(element.querySelector('ul ul li')?.textContent).toBe('Nested');
    expect(element.querySelectorAll('ol li').length).toBe(2);
    expect(element.querySelector('blockquote')?.textContent).toContain('Verify opening hours.');
    expect(element.querySelector('a')?.getAttribute('href')).toBe('https://example.com/guide');
    expect(element.querySelector('pre code')?.textContent).toContain('<sample>');
  });

  it('keeps paragraphs, line breaks, plain text and updated answers readable', () => {
    render('First line\nSecond line\n\nNew paragraph.');
    expect(element.querySelectorAll('p').length).toBe(2);
    expect(element.querySelector('br')).not.toBeNull();
    render('A replacement with **new advice**.');
    expect(element.textContent).not.toContain('First line');
    expect(element.querySelector('strong')?.textContent).toBe('new advice');
    render('');
    expect(element.textContent).toBe('');
  });

  it('renders tables and escaped Markdown', () => {
    render('| Day | Plan |\n| --- | --- |\n| 1 | Beach |\n\n\\*\\*literal\\*\\*');
    expect(element.querySelectorAll('th').length).toBe(2);
    expect(element.querySelectorAll('td').length).toBe(2);
    expect(element.textContent).toContain('**literal**');
    expect(element.querySelector('strong')).toBeNull();
  });

  it('treats HTML as text, prevents image loading and sanitizes unsafe links', () => {
    render(
      '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n' +
        '![Remote image](https://example.com/tracker.png)\n\n' +
        '[Unsafe](javascript:alert%281%29)',
    );
    expect(element.querySelector('script, img, iframe')).toBeNull();
    expect(element.textContent).toContain('<script>alert(1)</script>');
    expect(element.textContent).toContain('Remote image');
    expect(element.querySelector('a')?.getAttribute('href')).not.toMatch(/^javascript:/i);
  });
});
