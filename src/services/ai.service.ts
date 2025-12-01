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

  async *extractTextFromImageStream(base64Image: string): AsyncGenerator<{ text: string }> {
    if (!this.isInitialized) {
      throw new Error('AI Service is not initialized. Please check your API Key.');
    }

    const systemPrompt = `You are an expert OCR (Optical Character Recognition) engine. Your task is to accurately extract all text from the provided image. Preserve the original formatting, including line breaks and paragraphs, as closely as possible. Do not add any commentary, interpretation, or extra text. Only return the extracted text from the image.`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract the text from this document image.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: base64Image
                }
              }
            ]
          }
        ],
        stream: true,
      }),
    });
    
    if (!response.ok || !response.body) {
      const errorBody = await response.text();
      console.error('Deepseek API Error:', errorBody);
      throw new Error(`API request failed with status ${response.status}`);
    }

    yield* this.processStream(response);
  }

  async analyzeViolations(context: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('AI Service is not initialized. Please check your API Key.');
    }

    const systemPrompt = `You are an expert paralegal specializing in South Carolina employment law, with a deep focus on Walmart's corporate policies (especially regarding leave of absence and insurance benefits) and Sedgwick's claims administration policies.
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
    
    const systemPrompt = `You are an expert paralegal specializing in South Carolina employment law, with a deep focus on Walmart's corporate policies (especially regarding leave of absence and insurance benefits) and Sedgwick's claims administration policies. You will be provided with a full case file and a specific potential violation that you have previously identified. Your task is to provide a more detailed, in-depth analysis of THIS SPECIFIC violation. Do not repeat the initial explanation, but expand upon it with greater detail.`;
    
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

    yield* this.processStream(response);
  }

  async *generateCaseSummaryStream(context: string): AsyncGenerator<{ text: string }> {
    if (!this.isInitialized) {
      throw new Error('AI Service is not initialized. Please check your API Key.');
    }

    const systemPrompt = `You are an expert paralegal specializing in South Carolina employment law. Your task is to generate a concise, professional summary of the provided case file, viewing it through the lens of potential Walmart and Sedgwick policy violations, particularly concerning leave of absence and insurance. The summary should be a single, well-written paragraph. It should highlight the key facts, the primary legal issues (like potential FMLA or ADA violations), and the current status of the case. Do not use markdown or lists; provide a clean paragraph of text.`;

    const userPrompt = `
      ---
      CASE CONTEXT (FULL FILE):
      ${context}
      ---
      Please generate the case summary based on the context above.
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

    yield* this.processStream(response);
  }

  async *sendMessageStream(context: string, prompt: string): AsyncGenerator<{ text: string }> {
    if (!this.isInitialized) {
      throw new Error('AI Service is not initialized. Please check your API Key.');
    }
    
    const systemPrompt = `You are an expert paralegal specializing in South Carolina employment law, with deep knowledge of Walmart's corporate policies (including leave of absence, accommodation, and insurance benefits like policy IDC 8980) and Sedgwick's insurance and claims administration policies. You will be provided with a complete case file, including core details, a master timeline, the full text of relevant documents, action trackers, and damage calculations. Your task is to analyze this comprehensive data to identify potential legal and policy violations and to suggest actionable steps. Always cite specific laws, policy sections, or document names when possible. Be professional, objective, and informative. Structure your responses clearly using markdown for readability.`;
    
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