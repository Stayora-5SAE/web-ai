import { Component, Input } from '@angular/core';
const paths: Record<string, string> = {
  search: 'm21 21-5-5 M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  heart:
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  arrow: 'M4 12h16 m-6-6 6 6-6 6',
  back: 'M20 12H4 m6-6-6 6 6 6',
  home: 'm3 10 9-7 9 7 v11h-6v-7H9v7H3Z',
  star: 'm12 3 3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 10l6-1Z',
  calendar: 'M4 5h16v16H4Z M4 9h16 M8 3v4 M16 3v4',
  check: 'm5 12 4 4L19 6',
  key: 'M14 8a5 5 0 1 1-3-4.6 M14 8h7v4h-3v3h-4Z',
  message: 'M3 4h18v13H8l-5 4Z',
  plus: 'M12 4v16 M4 12h16',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-3a8 8 0 0 1 16 0v3',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z',
  close: 'm5 5 14 14 M19 5 5 19',
  wifi: 'M2 8a16 16 0 0 1 20 0 M5 12a11 11 0 0 1 14 0 M8 16a6 6 0 0 1 8 0 M12 20h.01',
};
@Component({
  selector: 'app-icon',
  standalone: true,
  template:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="path"/></svg>',
  styles: [
    ':host{display:inline-flex;width:1.25em;height:1.25em;flex-shrink:0}svg{width:100%;height:100%}',
  ],
})
export class IconComponent {
  @Input() name = 'home';
  get path() {
    return paths[this.name] ?? paths['home'];
  }
}
