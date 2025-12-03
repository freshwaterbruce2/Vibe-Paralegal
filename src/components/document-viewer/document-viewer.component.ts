import { ChangeDetectionStrategy, Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CaseDataService } from '../../services/case-data.service';
import { NotificationService } from '../../services/notification.service';
import { HighlightService } from '../../services/highlight.service';
import { CaseDocument } from '../../models';

@Component({
  selector: 'app-document-viewer',
  templateUrl: './document-viewer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class DocumentViewerComponent {
  caseDataService = inject(CaseDataService);
  notificationService = inject(NotificationService);
  highlightService = inject(HighlightService);
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

  highlightedContent: Signal<string> = computed(() => {
    const doc = this.selectedDocument();
    if (!doc) return '';
    return this.highlightService.highlight(doc.content, this.documentSearchQuery());
  });

  async handleDocumentUpload(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;

    const newDocuments: CaseDocument[] = [];
    let failedCount = 0;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('text/') && !file.name.endsWith('.md')) {
        console.warn(`Skipping unsupported file type: ${file.name} (${file.type})`);
        failedCount++;
        continue;
      }
      
      try {
        const content = await file.text();
        newDocuments.push({
          id: `doc_${Date.now()}_${file.name}`,
          name: file.name,
          content: content,
          uploaded: new Date().toLocaleDateString()
        });
      } catch (e) {
        console.error(`Error reading file: ${file.name}`, e);
        failedCount++;
      }
    }
    
    if (newDocuments.length > 0) {
        this.documents.update(docs => [...docs, ...newDocuments]);
    }

    if (newDocuments.length > 0 && failedCount === 0) {
      this.notificationService.addToast('Import Successful', `Successfully imported ${newDocuments.length} document(s).`, 'success');
    } else if (newDocuments.length > 0 && failedCount > 0) {
      this.notificationService.addToast('Partial Import', `Imported ${newDocuments.length} document(s), but failed to import ${failedCount}.`, 'info');
    } else if (failedCount > 0) {
       this.notificationService.addToast('Import Failed', `Could not import ${failedCount} document(s). See console for details.`, 'error');
    }

    (event.target as HTMLInputElement).value = '';
  }

  selectDocument(doc: CaseDocument | null) {
    this.selectedDocument.set(doc);
  }

  handleSearchInput(event: Event) {
    this.documentSearchQuery.set((event.target as HTMLInputElement).value);
  }
}
