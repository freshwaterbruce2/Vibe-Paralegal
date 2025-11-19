import { ChangeDetectionStrategy, Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseDataService } from '../../services/case-data.service';
import { CaseDocument } from '../../models';

@Component({
  selector: 'app-document-viewer',
  templateUrl: './document-viewer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class DocumentViewerComponent {
  caseDataService = inject(CaseDataService);
  documents = this.caseDataService.documents;

  // Local UI State
  selectedDocument: WritableSignal<CaseDocument | null> = signal(null);
  documentSearchQuery: WritableSignal<string> = signal('');

  filteredDocuments: Signal<CaseDocument[]> = computed(() => {
    const query = this.documentSearchQuery().toLowerCase().trim();
    if (!query) return this.documents();
    return this.documents().filter(doc => 
      doc.name.toLowerCase().includes(query) || 
      doc.content.toLowerCase().includes(query)
    );
  });

  async handleDocumentUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const newDocument: CaseDocument = {
        id: `doc_${Date.now()}`,
        name: file.name,
        content: content,
        uploaded: new Date().toLocaleDateString()
      };
      this.documents.update(docs => [...docs, newDocument]);
    } catch (e) {
      console.error("Error reading file:", e);
    }
     // Reset file input
    (event.target as HTMLInputElement).value = '';
  }

  selectDocument(doc: CaseDocument | null) {
    this.selectedDocument.set(doc);
  }

  handleSearchInput(event: Event) {
    this.documentSearchQuery.set((event.target as HTMLInputElement).value);
  }

  getHighlightedContent(content: string): string {
    const query = this.documentSearchQuery().trim();
    if (!query) return content.replace(/\n/g, '<br>');

    const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    return content.replace(regex, `<mark class="bg-yellow-400 text-black px-1 rounded">$1</mark>`).replace(/\n/g, '<br>');
  }
}
