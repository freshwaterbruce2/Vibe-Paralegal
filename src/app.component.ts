import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';

interface Message {
  role: 'user' | 'model';
  text: string;
}

type ActiveTab = 'chat' | 'timeline' | 'actions' | 'evidence' | 'contacts' | 'deadlines' | 'damages' | 'reference' | 'handoff';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class AppComponent implements AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  geminiService = inject(GeminiService);
  
  activeTab: WritableSignal<ActiveTab> = signal('chat');
  
  messages: WritableSignal<Message[]> = signal<Message[]>([
    { role: 'model', text: 'Hello! This is your AI Paralegal Assistant. I have been briefed with your Master Timeline. Ask me any questions about your case or ask me to generate an action plan based on the timeline.' }
  ]);
  loading: WritableSignal<boolean> = signal(false);
  error: WritableSignal<string | null> = signal(null);
  chatPrompt: WritableSignal<string> = signal('');

  private shouldScrollToBottom = false;

  masterTimeline = signal(`
## MASTER TIMELINE

- **May 2025:** Injury occurred.
- **May 2025 - Present:** All claim numbers, important events recorded.
- **July 14, 2025:** Accommodation denial letter received.
- **August 19, 2025:** Accommodation approval letter received.
- **June 30, 2025:** Insurance terminated during FMLA.
- **September 5, 2025:** STD payment stub shows no insurance deduction.
- **November 14, 2025:** Cleared to return to work.
- **November 15, 2025:** Email to Christina/Tichala. Discovery of potential insurance fraud.
- **November 16, 2025:** Meeting with Christina.
- **November 22, 2025:** Accommodation deadline.
- **May 10, 2026:** EEOC filing deadline (300 days from July 14 denial).
  `);

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
      } catch(err) { }
    }
  }

  setActiveTab(tab: ActiveTab) {
    this.activeTab.set(tab);
    if (tab === 'chat') {
        this.shouldScrollToBottom = true;
    }
  }

  handleTimelineInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.masterTimeline.set(textarea.value);
  }

  handlePromptInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.chatPrompt.set(textarea.value);
  }

  async sendMessage() {
    const prompt = this.chatPrompt().trim();
    if (!prompt) return;
    await this._executePrompt(prompt, prompt);
  }

  async generateActionPlan() {
    const userRequest = this.chatPrompt().trim();
    const actionPlanBasePrompt = 'Based on the provided Master Timeline and our conversation so far, generate a detailed, step-by-step action plan. For each step, explain the action, its purpose, and any relevant deadlines or legal/policy citations.';
    
    const fullPrompt = userRequest
      ? `${actionPlanBasePrompt} The user has provided the following specific focus for this plan: "${userRequest}"`
      : actionPlanBasePrompt;
    
    const userMessage = `Generate Action Plan${userRequest ? `: ${userRequest}` : ''}`;

    await this._executePrompt(fullPrompt, userMessage);
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
      const stream = await this.geminiService.sendMessageStream(this.masterTimeline(), prompt);

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
      const errorMessage = 'An error occurred while communicating with the AI. Please ensure your API key is correctly configured and try again.';
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

  formatMessageText(text: string): string {
    return text.replace(/\n/g, '<br>');
  }
}
