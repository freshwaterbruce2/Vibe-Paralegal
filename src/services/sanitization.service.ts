import { Injectable } from '@angular/core';

// DOMPurify is loaded from a CDN in index.html
declare const DOMPurify: any;

@Injectable({ providedIn: 'root' })
export class SanitizationService {

  /**
   * Sanitizes a string of HTML content to prevent XSS attacks.
   * Uses DOMPurify, which is more robust than Angular's built-in sanitizer
   * for handling complex markdown-like structures from an AI.
   * @param dirtyHtml The potentially unsafe HTML string.
   * @returns A sanitized HTML string that is safe to bind to [innerHTML].
   */
  sanitize(dirtyHtml: string): string {
    // Configure DOMPurify to allow common formatting tags but sanitize scripts, etc.
    // This configuration allows for styles and target="_blank" on links for external statutes.
    return DOMPurify.sanitize(dirtyHtml, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['target'],
    });
  }
}
