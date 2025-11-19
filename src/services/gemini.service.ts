import { Injectable } from '@angular/core';
import { GoogleGenAI, Chat, Type } from '@google/genai';

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
        systemInstruction: `You are an expert paralegal specializing in South Carolina employment law, with deep knowledge of Walmart policies (like IDC 8980) and Sedgwick insurance policies. You will be provided with a complete case file, including core details, a master timeline, the full text of relevant documents, action trackers, and damage calculations. Your task is to analyze this comprehensive data to identify potential legal and policy violations and to suggest actionable steps. Always cite specific laws, policy sections, or document names when possible. Be professional, objective, and informative. Structure your responses clearly using markdown for readability.`
      }
    });
  }

  async analyzeViolations(context: string): Promise<string> {
    if (!this.isInitialized || !this.genAI) {
      throw new Error('Gemini Service is not initialized. Please check your API Key.');
    }

    const fullPrompt = `
      You are an expert paralegal specializing in South Carolina employment law, Walmart policies, and Sedgwick policies.
      Based on the complete case file provided below, analyze for any potential violations.
      Identify each potential violation and provide a detailed explanation, severity, supporting references from the case file or law/policy, and recommended next actions.
      Strictly structure your response as a JSON array of objects, adhering to the provided schema. If no violations are found, return an empty array [].

      ---
      CASE CONTEXT (FULL FILE):
      ${context}
      ---
    `;

    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'A short, clear title for the potential violation.' },
          explanation: { type: Type.STRING, description: 'A detailed explanation of the potential violation, citing facts from the case file.' },
          severity: { type: Type.STRING, description: 'The estimated severity of the violation. Can be "High", "Medium", or "Low".' },
          references: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A list of specific laws, policy numbers, or document names that support this finding.' },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A list of concrete, actionable next steps to address this potential violation.' },
        },
        required: ['title', 'explanation', 'severity', 'references', 'recommendations'],
      },
    };

    const response = await this.genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      }
    });

    return response.text;
  }

  async sendMessageStream(context: string, prompt: string) {
    if (!this.isInitialized || !this.chat) {
      throw new Error('Gemini Service is not initialized. Please check your API Key.');
    }
    
    const fullPrompt = `
      ---
      CASE CONTEXT (FULL FILE):
      ${context || 'No context provided.'}
      ---
      USER QUERY:
      ${prompt}
    `;

    return this.chat.sendMessageStream({ message: fullPrompt });
  }
}
