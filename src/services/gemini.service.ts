import { Injectable } from '@angular/core';
import { GoogleGenAI, Chat } from '@google/genai';

// The Applet environment provides process.env.API_KEY.
declare const process: any;

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private genAI: GoogleGenAI | null = null;
  private chat: Chat | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }
  
  private initialize() {
    try {
      if (process && process.env && process.env.API_KEY) {
        this.genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
        this.startChat();
        this.isInitialized = true;
      } else {
        console.error("API_KEY environment variable not set.");
      }
    } catch (e) {
      console.error("Failed to initialize Gemini Service", e);
    }
  }

  private startChat() {
    if(!this.genAI) return;
    this.chat = this.genAI.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are an expert paralegal specializing in South Carolina employment law, with deep knowledge of Walmart policies, specifically IDC 8980, and Sedgwick insurance policies. Analyze the provided documents and user queries to identify potential violations and suggest actionable steps. Always cite the specific law or policy section when possible. Be professional, objective, and informative. Structure your responses clearly using markdown for readability.`
      }
    });
  }

  async sendMessageStream(context: string, prompt: string) {
    if (!this.isInitialized || !this.chat) {
      throw new Error('Gemini Service is not initialized. Please check your API Key.');
    }
    
    const fullPrompt = `
      ---
      CASE CONTEXT:
      ${context || 'No context provided.'}
      ---
      USER QUERY:
      ${prompt}
    `;

    return this.chat.sendMessageStream({ message: fullPrompt });
  }
}
