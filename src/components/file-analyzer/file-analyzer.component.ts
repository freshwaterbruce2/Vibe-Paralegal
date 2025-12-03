import { ChangeDetectionStrategy, Component, inject, signal, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiService } from '../../services/ai.service';
import { CaseDataService } from '../../services/case-data.service';
import { NotificationService } from '../../services/notification.service';
import { CaseDocument } from '../../models';

type AnalyzerView = 'initial' | 'camera' | 'analysis';

@Component({
  selector: 'app-file-analyzer',
  templateUrl: './file-analyzer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class FileAnalyzerComponent implements OnDestroy {
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;

  private aiService = inject(AiService);
  private caseDataService = inject(CaseDataService);
  private notificationService = inject(NotificationService);

  view = signal<AnalyzerView>('initial');
  loading = signal(false);
  error = signal<string | null>(null);
  
  capturedImage = signal<string | null>(null);
  extractedText = signal('');
  
  private mediaStream = signal<MediaStream | null>(null);

  // State for document naming modal
  isNamingDocument = signal(false);
  newDocumentName = signal('');

  ngOnDestroy() {
    this.stopCamera();
  }

  async startCamera() {
    if (this.mediaStream()) return;
    this.view.set('camera');
    this.loading.set(true);
    this.error.set(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      this.mediaStream.set(stream);
      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied or not available:", err);
      this.error.set('Could not access the camera. Please ensure you have a webcam connected and have granted permission in your browser.');
      this.view.set('initial');
    } finally {
      this.loading.set(false);
    }
  }

  stopCamera() {
    this.mediaStream()?.getTracks().forEach(track => track.stop());
    this.mediaStream.set(null);
    this.view.set('initial');
    this.error.set(null);
  }

  captureImage() {
    if (!this.videoElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');
    
    this.capturedImage.set(dataUrl);
    this.stopCamera();
    this.view.set('analysis');
    this.analyzeImage(dataUrl);
  }

  handleImageUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        this.notificationService.addToast('Invalid File', 'Please upload a valid image file (e.g., JPEG, PNG).', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.capturedImage.set(dataUrl);
      this.view.set('analysis');
      this.analyzeImage(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async analyzeImage(base64Image: string) {
    this.loading.set(true);
    this.extractedText.set('');
    this.error.set(null);
    try {
      const stream = this.aiService.extractTextFromImageStream(base64Image);
      for await (const chunk of stream) {
        this.extractedText.update(text => text + chunk.text);
      }
    } catch (err) {
      console.error("Error analyzing image:", err);
      this.error.set('AI analysis failed. Please check the console for details.');
      this.extractedText.set('Error: Could not extract text from the image.');
    } finally {
      this.loading.set(false);
    }
  }

  promptForDocumentName() {
    if (!this.extractedText().trim()) {
      this.notificationService.addToast('Empty Content', 'Cannot add an empty document.', 'error');
      return;
    }
    const suggestedName = `Scanned Document - ${new Date().toLocaleDateString()}.txt`;
    this.newDocumentName.set(suggestedName);
    this.isNamingDocument.set(true);
  }

  cancelNaming() {
    this.isNamingDocument.set(false);
    this.newDocumentName.set('');
  }

  confirmAddDocument() {
    const name = this.newDocumentName().trim();
    if (!name) {
      this.notificationService.addToast('Invalid Name', 'Document name cannot be empty.', 'error');
      return;
    }

    const newDoc: CaseDocument = {
      id: `doc_analyzed_${Date.now()}`,
      name: name,
      content: this.extractedText(),
      uploaded: new Date().toLocaleDateString(),
    };
    this.caseDataService.documents.update(docs => [...docs, newDoc]);
    this.notificationService.addToast('Success', `Document "${name}" has been added to your case files.`, 'success');
    
    this.cancelNaming();
    this.reset();
  }

  reset() {
    this.stopCamera();
    this.view.set('initial');
    this.capturedImage.set(null);
    this.extractedText.set('');
    this.error.set(null);
    this.loading.set(false);
  }
  
  handleExtractedTextInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.extractedText.set(textarea.value);
  }

  handleNewDocumentNameInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.newDocumentName.set(input.value);
  }
}