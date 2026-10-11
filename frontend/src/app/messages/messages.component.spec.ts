import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { MessagesComponent } from './messages.component';
import { Conversation, MessagingApiService } from './messaging-api.service';
import { IdentityService } from '../accounts/identity.service';
import { signal } from '@angular/core';

describe('Message draft privacy and deliberate sending', () => {
  let component: MessagesComponent;
  let api: jasmine.SpyObj<MessagingApiService>;
  let ai: jasmine.SpyObj<ApiService>;
  beforeEach(() => {
    api = jasmine.createSpyObj('MessagingApiService', ['send', 'edit', 'remove', 'read', 'inbox']);
    ai = jasmine.createSpyObj('ApiService', ['assist']);
    TestBed.configureTestingModule({
      providers: [
        { provide: MessagingApiService, useValue: api },
        { provide: ApiService, useValue: ai },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Router, useValue: {} },
        {
          provide: IdentityService,
          useValue: { account: () => null, mode: signal<'guest' | 'host'>('guest') },
        },
      ],
    });
    component = TestBed.runInInjectionContext(() => new MessagesComponent());
    component.thread = {
      id: 'thread',
      propertyTitle: 'Quiet courtyard',
      messages: [],
      otherName: 'Private Name',
      viewerId: 'guest',
    } as unknown as Conversation;
  });
  it('sends only selected intent and public title to AI, never the private chat or composer', async () => {
    component.body = 'My private phone number is 123456';
    component.intent = 'arrival';
    ai.assist.and.resolveTo({
      mode: 'mock',
      skill: 'message-draft',
      text: 'Could you confirm arrival instructions?',
    });
    await component.draft();
    expect(ai.assist).toHaveBeenCalledOnceWith('message-draft', 'arrival|Quiet courtyard');
    expect(component.body).toBe('My private phone number is 123456');
    expect(api.send).not.toHaveBeenCalled();
    component.applyDraft();
    expect(component.body).toBe('Could you confirm arrival instructions?');
    expect(api.send).not.toHaveBeenCalled();
  });
  it('retains the message and exposes failure when the server rejects sending', async () => {
    component.body = 'Hello';
    api.send.and.rejectWith(new Error('Network'));
    await component.send();
    expect(component.body).toBe('Hello');
    expect(component.actionError).toBeTruthy();
    expect(component.busy).toBeFalse();
  });
  it('blocks duplicate send clicks and invalid empty messages', async () => {
    component.body = ' ';
    await component.send();
    expect(api.send).not.toHaveBeenCalled();
    component.body = 'Hello';
    component.busy = true;
    await component.send();
    expect(api.send).not.toHaveBeenCalled();
  });
  it('keeps host conversation links within host routes', () => {
    TestBed.inject(IdentityService).mode.set('host');
    expect(component.messagePrefix).toBe('/host/messages');
  });
});
