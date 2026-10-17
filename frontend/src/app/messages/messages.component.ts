import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService, errorMessage } from '../core/api.service';
import { FeedbackComponent } from '../shared/feedback.component';
import { ChatMessage, Conversation, MessagingApiService } from './messaging-api.service';
import { AiResponse } from '../core/models';
import { IdentityService } from '../accounts/identity.service';
import { AiMarkdownComponent } from '../shared/ai-markdown.component';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, FeedbackComponent, AiMarkdownComponent],
  template: `<main id="main" class="container page">
    <div class="heading">
      <div>
        <span class="eyebrow">Stay connected</span>
        <h1>Messages</h1>
        <p class="muted">Questions, arrival plans, and little details for a better stay.</p>
      </div>
      <button class="btn secondary" (click)="load()" [disabled]="loading || busy">Refresh</button>
    </div>
    <app-feedback [loading]="loading" [error]="error" (retry)="load()" />
    @if (!loading && !error) {
      <div class="messaging-grid">
        <aside class="panel inbox" aria-label="Your conversations">
          <h2>Inbox</h2>
          <p class="muted small">
            {{ inbox.length }} conversations · Refresh to check for new messages.
          </p>
          @if (!inbox.length) {
            <p class="mt-6 muted">
              No conversations yet. Open a property and choose Contact host, or message from your
              trip.
            </p>
            <a class="btn secondary mt-4" routerLink="/explore">Find a stay</a>
          }
          @for (item of inbox; track item.id) {
            <a
              class="thread-link"
              [class.selected]="thread?.id === item.id"
              [routerLink]="[messagePrefix + '/threads', item.id]"
              ><strong>{{ item.otherName }}</strong
              ><span>{{ item.propertyTitle }}</span
              ><span class="small muted"
                >{{ item.lastActivity | date: 'MMM d, HH:mm' }}
                @if (item.unreadCount) {
                  <b class="unread">{{ item.unreadCount }} unread</b>
                }
              </span></a
            >
          }
        </aside>
        <section class="panel chat" aria-label="Conversation">
          @if (thread; as current) {
            <div class="chat-heading">
              <h2>{{ current.otherName }}</h2>
              <a [routerLink]="['/properties', current.propertyId]">{{ current.propertyTitle }}</a>
              <p class="muted small">{{ current.subject }}</p>
            </div>
            <div class="chat-history" aria-live="polite">
              @if (!current.messages.length) {
                <p class="muted">Start with a question or introduce yourself.</p>
              }
              @for (message of current.messages; track message.id) {
                <article class="message" [class.own]="message.senderId === current.viewerId">
                  <strong class="small">{{
                    message.senderId === current.viewerId ? 'You' : current.otherName
                  }}</strong>
                  <p class="message-body">
                    {{ message.deleted ? 'Message removed' : message.body }}
                  </p>
                  <p class="small muted">
                    {{ message.createdAt | date: 'MMM d, HH:mm'
                    }}{{ message.editedAt && !message.deleted ? ' · Edited' : ''
                    }}{{
                      message.senderId === current.viewerId && message.recipientReadAt
                        ? ' · Read'
                        : ''
                    }}
                  </p>
                  @if (message.senderId === current.viewerId && !message.deleted) {
                    <div class="message-actions">
                      <button class="text-button" [disabled]="busy" (click)="startEdit(message)">
                        Edit</button
                      ><button
                        class="text-button"
                        [disabled]="busy"
                        (click)="deleteId = message.id"
                      >
                        Remove
                      </button>
                    </div>
                    @if (deleteId === message.id) {
                      <p class="small">Remove this message for both participants?</p>
                      <button class="text-button" [disabled]="busy" (click)="remove(message.id)">
                        Yes, remove</button
                      ><button class="text-button" (click)="deleteId = ''">Keep message</button>
                    }
                  }
                </article>
              }
            </div>
            @if (actionError) {
              <p class="feedback error" role="alert">{{ actionError }}</p>
            }
            <form class="composer" (ngSubmit)="send()">
              <label for="message-body">{{
                editingId ? 'Edit your message' : 'Write a message'
              }}</label
              ><textarea
                id="message-body"
                name="body"
                [(ngModel)]="body"
                maxlength="2000"
                rows="4"
                required
                [disabled]="busy"
              ></textarea>
              <div class="composer-actions">
                <span class="small muted">{{ body.length }}/2,000 · Plain text only</span>
                <div>
                  @if (editingId) {
                    <button class="btn secondary" type="button" (click)="cancelEdit()">
                      Cancel edit
                    </button>
                  }
                  <button class="btn" [disabled]="busy || !body.trim() || body.length > 2000">
                    {{ busy ? 'Saving…' : editingId ? 'Save edit' : 'Send message' }}
                  </button>
                </div>
              </div>
            </form>
            <div class="draft-assistant">
              <h3>Need a little inspiration?</h3>
              <p class="muted small">
                Choose a purpose. The assistant receives only the purpose and public property title.
                Review the draft before using it.
              </p>
              <label for="draft-intent">Message purpose</label
              ><select id="draft-intent" [(ngModel)]="intent">
                <option value="question">Ask about the property</option>
                <option value="arrival">Arrange arrival</option>
                <option value="checkout">Ask about checkout</option></select
              ><button class="btn secondary" [disabled]="aiBusy || busy" (click)="draft()">
                {{ aiBusy ? 'Preparing draft…' : 'Suggest a draft' }}
              </button>
              @if (aiError) {
                <p role="alert" class="error">{{ aiError }}</p>
              }
              @if (suggestion; as response) {
                <div class="suggestion">
                  <span class="status">{{
                    response.mode === 'mock' ? 'Mock AI' : 'AI draft'
                  }}</span>
                  <app-ai-markdown class="mt-3" [text]="response.text" />
                  @if (response.notice) {
                    <p class="small muted">{{ response.notice }}</p>
                  }
                  <button class="btn secondary mt-3" [disabled]="busy" (click)="applyDraft()">
                    Use this draft in the message box
                  </button>
                  <p class="small muted">Your message is sent only when you select Send message.</p>
                </div>
              }
            </div>
          } @else {
            <h2>Your conversations, in one place</h2>
            <p class="muted mt-4">Choose a conversation to read and reply.</p>
          }
        </section>
      </div>
    }
  </main>`,
  styles: [
    `
      .heading,
      .composer-actions {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: center;
      }
      .messaging-grid {
        display: grid;
        grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
        gap: 24px;
        margin-top: 24px;
      }
      .inbox,
      .chat {
        min-width: 0;
      }
      .small {
        font-size: 12px;
      }
      .thread-link {
        display: flex;
        flex-direction: column;
        padding: 16px 0;
        border-bottom: 1px solid var(--border, #e5e9e7);
        gap: 6px;
        overflow-wrap: anywhere;
      }
      .thread-link.selected {
        color: var(--primary, #087b66);
        font-weight: 600;
      }
      .unread {
        display: inline-block;
        border-radius: 30px;
        background: #def5eb;
        padding: 2px 8px;
        margin-left: 8px;
      }
      .chat-heading {
        padding-bottom: 16px;
        border-bottom: 1px solid #e5e9e7;
      }
      .chat-history {
        max-height: 520px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 24px 0;
      }
      .message {
        max-width: 85%;
        background: #f5f6f4;
        border-radius: 14px;
        padding: 16px;
        align-self: flex-start;
      }
      .message.own {
        background: #e1f3eb;
        align-self: flex-end;
      }
      .message-body {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        margin: 8px 0;
      }
      .message-actions {
        display: flex;
        gap: 16px;
        margin-top: 8px;
      }
      .text-button {
        font-size: 12px;
        text-decoration: underline;
        padding: 4px 0;
      }
      .composer label,
      .draft-assistant label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
      }
      .composer textarea {
        width: 100%;
        border: 1px solid #ccd8d2;
        border-radius: 12px;
        padding: 12px;
        resize: vertical;
      }
      .composer-actions {
        margin: 12px 0;
      }
      .composer-actions > div {
        display: flex;
        gap: 8px;
      }
      .draft-assistant {
        margin-top: 24px;
        border-top: 1px solid #e5e9e7;
        padding-top: 24px;
      }
      .draft-assistant select {
        padding: 10px;
        border: 1px solid #ccd8d2;
        border-radius: 10px;
        margin-right: 12px;
        max-width: 100%;
      }
      .suggestion {
        background: #faf8f2;
        padding: 16px;
        border-radius: 12px;
        margin-top: 16px;
      }
      @media (max-width: 768px) {
        .messaging-grid {
          grid-template-columns: 1fr;
        }
        .inbox {
          max-height: 290px;
          overflow-y: auto;
        }
        .heading {
          align-items: flex-start;
        }
        .composer-actions {
          flex-wrap: wrap;
        }
        .message {
          max-width: 95%;
        }
        .draft-assistant select {
          margin-bottom: 12px;
        }
        .chat-history {
          max-height: 430px;
        }
      }
    `,
  ],
})
export class MessagesComponent implements OnInit {
  private readonly api = inject(MessagingApiService);
  private readonly ai = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly identity = inject(IdentityService);
  get messagePrefix() {
    return this.identity.account()?.role === 'HOST' ||
      (!this.identity.account() && this.identity.mode() === 'host')
      ? '/host/messages'
      : '/messages';
  }
  inbox: Conversation[] = [];
  thread: Conversation | null = null;
  loading = true;
  error = '';
  actionError = '';
  busy = false;
  body = '';
  editingId = '';
  deleteId = '';
  intent = 'question';
  aiBusy = false;
  aiError = '';
  suggestion: AiResponse | null = null;
  private requestVersion = 0;

  ngOnInit() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => {
        this.cancelEdit();
        this.suggestion = null;
        void this.load();
      });
  }
  async load() {
    const version = ++this.requestVersion;
    this.loading = true;
    this.error = '';
    try {
      const params = this.route.snapshot.paramMap;
      const threadId = params.get('threadId');
      const reservationId = params.get('reservationId') ?? params.get('id');
      const propertyId = this.route.snapshot.queryParamMap.get('propertyId');
      if (!threadId && (reservationId || propertyId)) {
        const current = reservationId
          ? await this.api.reservation(reservationId)
          : await this.api.inquiry(propertyId!);
        if (version !== this.requestVersion) return;
        await this.router.navigate([this.messagePrefix + '/threads', current.id], {
          replaceUrl: true,
        });
        return;
      }
      const current = threadId ? await this.api.read(threadId) : null;
      const inbox = await this.api.inbox();
      if (version !== this.requestVersion) return;
      this.thread = current;
      this.inbox = inbox;
    } catch (error) {
      if (version === this.requestVersion) this.error = errorMessage(error);
    } finally {
      if (version === this.requestVersion) this.loading = false;
    }
  }
  startEdit(message: ChatMessage) {
    this.editingId = message.id;
    this.body = message.body;
    this.suggestion = null;
    this.actionError = '';
    this.deleteId = '';
  }
  cancelEdit() {
    this.editingId = '';
    this.body = '';
    this.deleteId = '';
    this.actionError = '';
  }
  async send() {
    if (!this.thread || this.busy || !this.body.trim() || this.body.length > 2000) return;
    this.busy = true;
    this.actionError = '';
    try {
      if (this.editingId) await this.api.edit(this.thread.id, this.editingId, this.body.trim());
      else await this.api.send(this.thread.id, this.body.trim());
      this.cancelEdit();
      await this.reloadThread();
    } catch (error) {
      this.actionError = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }
  async remove(id: string) {
    if (!this.thread || this.busy) return;
    this.busy = true;
    this.actionError = '';
    try {
      await this.api.remove(this.thread.id, id);
      if (this.editingId === id) this.cancelEdit();
      this.deleteId = '';
      await this.reloadThread();
    } catch (error) {
      this.actionError = errorMessage(error);
    } finally {
      this.busy = false;
    }
  }
  private async reloadThread() {
    if (!this.thread) return;
    this.thread = await this.api.read(this.thread.id);
    this.inbox = await this.api.inbox();
  }
  async draft() {
    if (!this.thread || this.aiBusy) return;
    this.aiBusy = true;
    this.aiError = '';
    this.suggestion = null;
    try {
      this.suggestion = await this.ai.assist(
        'message-draft',
        `${this.intent}|${this.thread.propertyTitle.substring(0, 150)}`,
      );
    } catch (error) {
      this.aiError = errorMessage(error);
    } finally {
      this.aiBusy = false;
    }
  }
  applyDraft() {
    if (this.suggestion) this.body = this.suggestion.text.substring(0, 2000);
  }
}
