import { Injectable, inject } from '@angular/core';
import { SanitizationService } from './sanitization.service';

@Injectable({ providedIn: 'root' })
export class HighlightService {

  private sanitizer = inject(SanitizationService);

  /**
   * Highlights occurrences of a query within a block of content.
   * It handles basic text content and ensures the output is safe.
   * @param content The original text content.
   * @param query The search query to highlight.
   * @returns An HTML string with matches wrapped in <mark> tags.
   */
  highlight(content: string | null | undefined, query: string | null | undefined): string {
    const text = content || '';
    const searchQuery = (query || '').trim();

    // First, convert newlines to <br> for proper display in HTML.
    // We must escape HTML entities in the original text to prevent it from being interpreted as HTML.
    const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');

    if (!searchQuery) {
        return escapedText;
    }
    
    try {
      // Escape special regex characters in the search query.
      const escapedQuery = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      
      // The replacement string itself doesn't come from user input, so this is safe.
      const highlighted = escapedText.replace(regex, `<mark class="bg-yellow-400 text-black px-1 rounded">$1</mark>`);
      return highlighted; // Sanitization is not strictly needed here as we escaped input, but it's defense-in-depth.

    } catch (e) {
      console.error("Error creating regex for highlighting:", e);
      return escapedText; // Return original (but escaped) content on error.
    }
  }
}
