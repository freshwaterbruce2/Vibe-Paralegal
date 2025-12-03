import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseDataService } from '../../services/case-data.service';
import { AiService } from '../../services/ai.service';
import { PromptService } from '../../services/prompt.service';
import { SanitizationService } from '../../services/sanitization.service';

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
  promptService = inject(PromptService);
  sanitizer = inject(SanitizationService);

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
    await this._executePrompt(this.promptService.forGeneralChat(this.caseDataService.getFullContext(), prompt), prompt);
  }

  async generateActionPlan() {
    const userRequest = this.chatPrompt().trim();
    const actionPlanPrompt = `Generate a detailed, step-by-step action plan based on the entire case file. Focus on these user priorities: ${userRequest || 'all aspects of the case'}.`;
    const userMessage = `Generate Action Plan${userRequest ? `: ${userRequest}` : ''}`;
    await this._executePrompt(this.promptService.forGeneralChat(this.caseDataService.getFullContext(), actionPlanPrompt), userMessage);
  }

  async analyzePolicies() {
    const userMessage = 'Analyze case documents for Sedgwick/Walmart policy violations.';
    const policyAnalysisPrompt = this.promptService.forPolicyAdherence(this.caseDataService.documents().map(d => d.content).join('\n\n'));
    await this._executePrompt(policyAnalysisPrompt, userMessage);
  }

  async analyzeFamilyLawCase() {
    const userMessage = 'Analyze the Family Law aspects of the case.';
    const familyLawPrompt = this.promptService.forFamilyLawAnalysis(this.caseDataService.getFullContext());
    await this._executePrompt(familyLawPrompt, userMessage);
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
      // Note: The prompt passed in already has context, so we pass an empty context to the service
      const stream = this.aiService.sendMessageStream('', prompt);

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
    } catch (e: any) {
      const errorMessage = e.message || 'An error occurred. Please check the console.';
      this.error.set(errorMessage);
       this.messages.update(m => {
        const lastMessage = m[m.length - 1];
        if (lastMessage?.role === 'model') {
           lastMessage.text = `Error: ${errorMessage}`;
        }
        return m;
      });
    } finally {
      this.loading.set(false);
      this.shouldScrollToBottom = true;
    }
  }
}
