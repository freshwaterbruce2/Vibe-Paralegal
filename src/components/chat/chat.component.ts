import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseDataService } from '../../services/case-data.service';
import { AiService } from '../../services/ai.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class ChatComponent implements AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  caseDataService = inject(CaseDataService);
  aiService = inject(AiService);

  // UI State
  loading = signal(false);
  error = signal<string | null>(null);
  chatPrompt = signal('');

  // Data from Service
  messages = this.caseDataService.messages;

  private shouldScrollToBottom = true;

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom(): void {
    if (this.chatContainer) {
      try {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      } catch(err) { /* Ignore */ }
    }
  }
  
  handlePromptInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.chatPrompt.set(textarea.value);
  }

  handleKeydownEnter(event: KeyboardEvent) {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  async sendMessage() {
    const prompt = this.chatPrompt().trim();
    if (!prompt) return;
    await this._executePrompt(prompt, prompt);
  }

  async generateActionPlan() {
    const userRequest = this.chatPrompt().trim();
    const actionPlanBasePrompt = 'Based on the entire case file provided (including case details, documents, timeline, trackers, and financial data), generate a detailed, step-by-step action plan. For each step, explain the action, its purpose, and any relevant deadlines or legal/policy citations.';
    
    const fullPrompt = userRequest
      ? `${actionPlanBasePrompt} The user has provided the following specific focus for this plan: "${userRequest}"`
      : actionPlanBasePrompt;
    
    const userMessage = `Generate Action Plan${userRequest ? `: ${userRequest}` : ''}`;

    await this._executePrompt(fullPrompt, userMessage);
  }

  formatMessageText(text: string): string {
    // This is a simplified and safe markdown to HTML converter
    let html = text
      // 1. Escape HTML to prevent XSS attacks
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      // 2. Process Markdown-like syntax
      // Bold (**text** or __text__)
      .replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>')
      // Italic (*text* or _text_)
      .replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>')
      // Lists - must be handled carefully. This handles simple lists at the start of a line.
      .replace(/^\s*[\-\*]\s+(.*)/gm, '<li>$1</li>')
      // Wrap list items in <ul> tags
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      // Merge consecutive <ul> tags
      .replace(/<\/ul>\s*<ul>/g, '')
      // 3. Convert newlines to <br> for paragraph breaks
      .replace(/\n/g, '<br>');

    return html;
  }

  private async _executePrompt(prompt: string, userMessage: string) {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.messages.update(m => [...m, { role: 'user', text: userMessage }]);
    this.chatPrompt.set('');
    this.shouldScrollToBottom = true;

    this.messages.update(m => [...m, { role: 'model', text: '' }]);

    try {
      const fullContext = this.caseDataService.getFullContext();
      const stream = this.aiService.sendMessageStream(fullContext, prompt);

      for await (const chunk of stream) {
        const chunkText = chunk.text;
        this.messages.update(currentMessages => {
          const lastMessage = currentMessages[currentMessages.length - 1];
          if (lastMessage && lastMessage.role === 'model') {
            lastMessage.text += chunkText;
          }
          return [...currentMessages];
        });
        this.shouldScrollToBottom = true;
      }
    } catch (e) {
      console.error(e);
      const errorMessage = 'An error occurred. Please check the browser console for details.';
      this.error.set(errorMessage);
      this.messages.update(m => {
        const lastMessage = m[m.length - 1];
        if (lastMessage && lastMessage.role === 'model' && lastMessage.text === '') {
           return m.slice(0, m.length - 1);
        }
        if (lastMessage) {
            lastMessage.text = errorMessage;
        }
        return [...m];
      });
    } finally {
      this.loading.set(false);
      this.shouldScrollToBottom = true;
    }
  }
}
