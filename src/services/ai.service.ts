import { Injectable } from '@angular/core';
import { ViolationAlert } from '../models';

// The Applet environment provides process.env.API_KEY.
declare const process: any;

const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL_NAME = 'deepseek-chat';

@Injectable({ providedIn: 'root' })
export class AiService {
  private apiKey = '';
  private isInitialized = false;

  constructor() {
    this.initialize();
  }
  
  private initialize() {
    try {
      if (process && process.env && process.env.API_KEY) {
        this.apiKey = process.env.API_KEY;
        this.isInitialized = true;
      } else {
        console.error("API_KEY environment variable not set.");
      }
    } catch (e) {
      console.error("Failed to initialize AiService", e);
    }
  }

  async analyzeViolations(context: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('AI Service is not initialized. Please check your API Key.');
    }

    const systemPrompt = `You are an expert paralegal specializing in South Carolina employment law, Walmart policies, and Sedgwick policies.
Analyze the provided case file for potential violations.
Identify each potential violation and provide a detailed explanation, severity, supporting references, and recommended actions.
You must respond with a valid JSON array of objects. Each object must have the following properties: "title", "explanation", "severity", "references", and "recommendations".
If no violations are found, return an empty array [].`;

    const userPrompt = `
      ---
      CASE CONTEXT (FULL FILE):
      ${context}
      ---
    `;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Deepseek API Error:', errorBody);
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;

    } catch (error) {
      console.error('Error calling Deepseek API for violation analysis:', error);
      throw error;
    }
  }
  
  async *getViolationDetailsStream(context: string, violation: ViolationAlert): AsyncGenerator<{ text: string }> {
    if (!this.isInitialized) {
      throw new Error('AI Service is not initialized. Please check your API Key.');
    }
    
    const systemPrompt = `You are an expert paralegal specializing in South Carolina employment law, Walmart policies, and Sedgwick policies. You will be provided with a full case file and a specific potential violation that you have previously identified. Your task is to provide a more detailed, in-depth analysis of THIS SPECIFIC violation. Do not repeat the initial explanation, but expand upon it with greater detail.`;
    
    const userPrompt = `
      ---
      CASE CONTEXT (FULL FILE):
      ${context}
      ---
      USER REQUEST:
      I am reviewing the following potential violation you previously identified:
      
      Title: "${violation.title}"
      Initial Explanation: "${violation.explanation}"
      
      Please provide a more detailed, in-depth analysis of THIS SPECIFIC violation. Expand upon the initial explanation. Detail the specific statutes (e.g., FMLA Section 2614(c)(1), ADA requirements for interactive process), company policies, or legal precedents that apply here. Explain exactly how the events described in the case file might constitute a breach of these rules. Provide a deeper context for the recommended actions. Use markdown for clear formatting.
    `;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const errorBody = await response.text();
      console.error('Deepseek API Error:', errorBody);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
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
          if (data === '[DONE]') {
            return;
          }
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              yield { text: content };
            }
          } catch (e) {
            console.error('Error parsing stream chunk:', data, e);
          }
        }
      }
    }
  }


  async *sendMessageStream(context: string, prompt: string): AsyncGenerator<{ text: string }> {
    if (!this.isInitialized) {
      throw new Error('AI Service is not initialized. Please check your API Key.');
    }
    
    const systemPrompt = `You are an expert paralegal specializing in South Carolina employment law, with deep knowledge of Walmart policies (like IDC 8980) and Sedgwick insurance policies. You will be provided with a complete case file, including core details, a master timeline, the full text of relevant documents, action trackers, and damage calculations. Your task is to analyze this comprehensive data to identify potential legal and policy violations and to suggest actionable steps. Always cite specific laws, policy sections, or document names when possible. Be professional, objective, and informative. Structure your responses clearly using markdown for readability.`;
    
    const userPrompt = `
      ---
      CASE CONTEXT (FULL FILE):
      ${context || 'No context provided.'}
      ---
      USER QUERY:
      ${prompt}
    `;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const errorBody = await response.text();
      console.error('Deepseek API Error:', errorBody);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
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
          if (data === '[DONE]') {
            return;
          }
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              yield { text: content };
            }
          } catch (e) {
            console.error('Error parsing stream chunk:', data, e);
          }
        }
      }
    }
  }
}
