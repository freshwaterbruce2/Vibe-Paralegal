import { Injectable } from '@angular/core';
import { ViolationAlert } from '../models';

const BASE_SYSTEM_PROMPT = `You are an expert AI Paralegal assistant.
Your expertise is in South Carolina law, covering both Employment Law (including unemployment regulations) and Family Law.
You have deep, specific knowledge of Walmart's corporate policies (especially regarding leave of absence, accommodation, and insurance benefits like policy IDC 8980) and Sedgwick's insurance and claims administration policies.
Your analysis must be concise, objective, and directly reference evidence from the provided case file (e.g., "See document: Denial_Letter.txt").
You must avoid legal advice disclaimers. Assume you are a trusted internal tool.
When citing South Carolina statutes, use the format "S.C. Code Ann. § XX-XX-XXX" and provide a public URL to the statute text if available.`;

@Injectable({ providedIn: 'root' })
export class PromptService {

  public getBaseSystemPrompt(): string {
    return BASE_SYSTEM_PROMPT;
  }
  
  public forGeneralChat(context: string, userQuery: string): string {
    return `---
CASE CONTEXT (FULL FILE):
${context || 'No context provided.'}
---
USER QUERY:
${userQuery}`;
  }
  
  public forViolationAnalysis(context: string): { system: string, user: string } {
    const system = `${BASE_SYSTEM_PROMPT}
You must respond with a valid JSON array of objects. Each object must have the following properties: "title", "explanation", "severity" (High, Medium, or Low), "references" (an array of strings), and "recommendations" (an array of strings).
If no violations are found, you must return an empty array []. Do not add any other text outside the JSON structure.`;
    
    const user = `Analyze the provided case file for potential legal and policy violations and return the results in the specified JSON format.
---
CASE CONTEXT (FULL FILE):
${context}`;
    
    return { system, user };
  }
  
  public forViolationDetail(context: string, violation: ViolationAlert): string {
    return `---
CASE CONTEXT (FULL FILE):
${context}
---
USER REQUEST:
I am reviewing the following potential violation you previously identified:

Title: "${violation.title}"
Initial Explanation: "${violation.explanation}"

Please provide a more detailed, in-depth analysis of THIS SPECIFIC violation. Expand upon the initial explanation. Detail the specific statutes (e.g., FMLA Section 2614(c)(1), ADA requirements for interactive process), company policies, or legal precedents that apply here. Explain exactly how the events described in the case file might constitute a breach of these rules.
IMPORTANT: When you cite a South Carolina statute, you MUST format it as a markdown link, like this: "[S.C. Code Ann. § 23-9-195](https://www.scstatehouse.gov/code/t23c009.php)".`;
  }
  
  public forPolicyAdherence(context: string): string {
    return `Analyze ONLY the content of the provided case documents. Disregard other parts of the case file for this specific request. Identify potential violations or deviations from Sedgwick and Walmart corporate policies, focusing on procedures for leave of absence and insurance benefits, within the context of South Carolina employment law. For each potential violation, cite the specific document(s) that serve as evidence and explain your reasoning.
---
CASE CONTEXT (DOCUMENTS ONLY):
${context}`;
  }
  
  public forFamilyLawAnalysis(context: string): string {
     return `Perform a specialized analysis focusing ONLY on the Family Law aspects of this case. Review the Family Law Center details, case documents, and timeline. Identify key legal issues, potential strengths and weaknesses, and suggest next steps based on South Carolina Family Law statutes and precedents.
---
CASE CONTEXT (FULL FILE):
${context}`;
  }

  public forExecutiveSummary(context: string): string {
    const system = `${BASE_SYSTEM_PROMPT}
Your task is to generate a concise, professional summary of the provided case file. The summary should be a single, well-written paragraph. It should highlight the key facts, the primary legal issues (across both employment and family law), and the current status of the case. Do not use markdown or lists; provide a clean paragraph of text.`;

    const user = `Please generate the case summary based on the context below.
---
CASE CONTEXT (FULL FILE):
${context}`;
    return user; // System prompt is passed separately for this one
  }

  public forOcrAnalysis(ocrText: string): string {
    return `The following text was extracted from a document image using OCR. Please review it, correct any obvious OCR errors, and provide a brief, one-sentence summary of the document's content.
---
EXTRACTED TEXT:
${ocrText}`;
  }
}
