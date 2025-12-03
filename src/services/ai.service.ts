import { Injectable, inject } from '@angular/core';
import { ViolationAlert } from '../models';
import { SettingsService } from './settings.service';
import { NotificationService } from './notification.service';
import { PromptService } from './prompt.service';

const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL_NAME = 'deepseek-chat';

@Injectable({ providedIn: 'root' })
export class AiService {
  private settings = inject(SettingsService);
  private notificationService = inject(NotificationService);
  private promptService = inject(PromptService);

  private get apiKey() {
    return this.settings.deepseekApiKey();
  }
  
  private isReady(isStream = false): boolean {
    if (!this.apiKey) {
      const errorMessage = 'Deepseek API Key is not set. Please add it in the Settings panel.';
      if (isStream) {
        // For streams, we yield an error message directly.
        return false;
      }
      this.notificationService.addToast('Authentication Error', errorMessage, 'error');
      throw new Error(errorMessage);
    }
    return true;
  }

  private async handleErrorResponse(response: Response): Promise<string> {
    const errorBody = await response.json().catch(() => ({ error: { message: response.statusText } }));
    const errorMessage = errorBody.error?.message || `API request failed with status ${response.status}`;
    this.notificationService.addToast('API Error', errorMessage, 'error');
    console.error('Deepseek API Error:', errorMessage, errorBody);
    return errorMessage;
  }
  
  async analyzeViolations(context: string): Promise<string> {
    this.isReady();
    const { system, user } = this.promptService.forViolationAnalysis(context);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        const errorMessage = await this.handleErrorResponse(response);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('Invalid JSON response format from API.');
      
      // The API often wraps the JSON in a "violations" key, so we need to extract it.
      try {
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed.violations || parsed);
      } catch {
        return content; // Return as-is if parsing fails
      }

    } catch (error) {
      console.error('Error in analyzeViolations:', error);
      throw error;
    }
  }

  async *getViolationDetailsStream(context: string, violation: ViolationAlert): AsyncGenerator<{ text: string }> {
    if (!this.isReady(true)) {
      yield { text: `ERROR: ${this.handleErrorResponse({} as Response)}` };
      return;
    }
    const userPrompt = this.promptService.forViolationDetail(context, violation);
    const systemPrompt = this.promptService.getBaseSystemPrompt();
    yield* this.streamRequest(systemPrompt, userPrompt);
  }

  async *generateCaseSummaryStream(context: string): AsyncGenerator<{ text: string }> {
    if (!this.isReady(true)) {
      yield { text: `ERROR: ${this.handleErrorResponse({} as Response)}` };
      return;
    }
    const userPrompt = this.promptService.forExecutiveSummary(context);
    const systemPrompt = this.promptService.getBaseSystemPrompt(); // Note: forSummary has its own detailed system prompt.
    yield* this.streamRequest(systemPrompt, userPrompt);
  }

  async *sendMessageStream(context: string, prompt: string): AsyncGenerator<{ text: string }> {
    if (!this.isReady(true)) {
      yield { text: `ERROR: ${this.handleErrorResponse({} as Response)}` };
      return;
    }
    const userPrompt = this.promptService.forGeneralChat(context, prompt);
    const systemPrompt = this.promptService.getBaseSystemPrompt();
    yield* this.streamRequest(systemPrompt, userPrompt);
  }

  async *analyzeOcrTextStream(ocrText: string): AsyncGenerator<{ text: string }> {
      if (!this.isReady(true)) {
          yield { text: `ERROR: ${this.handleErrorResponse({} as Response)}` };
          return;
      }
      const userPrompt = this.promptService.forOcrAnalysis(ocrText);
      const systemPrompt = this.promptService.getBaseSystemPrompt();
      yield* this.streamRequest(systemPrompt, userPrompt);
  }

  private async *streamRequest(systemPrompt: string, userPrompt: string): AsyncGenerator<{ text: string }> {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const errorMsg = await this.handleErrorResponse(response);
      yield { text: `API Error: ${errorMsg}` };
      return;
    }
    yield* this.processStream(response);
  }
  
  private async *processStream(response: Response): AsyncGenerator<{ text: string }> {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6).trim();
            if (data === '[DONE]') return;
            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) yield { text: content };
            } catch (e) {
              console.error('Error parsing stream chunk:', data, e);
            }
          }
        }
      }
  }
}
