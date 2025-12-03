import { ChangeDetectionStrategy, Component, inject, signal, OnDestroy, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiService } from '../../services/ai.service';
import { CaseDataService } from '../../services/case-data.service';
import { NotificationService } from '../../services/notification.service';
import { OcrService, OcrProgress } from '../../services/ocr.service';
import { CaseDocument } from '../../models';

type AnalyzerView = 'initial' | 'camera' | 'analysis' | 'mobile-upload';
const BROADCAST_CHANNEL_NAME = 'ai-paralegal-mobile-upload';

@Component({
  selector: 'app-file-analyzer',
  templateUrl: './file-analyzer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class FileAnalyzerComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('qrCodeElement') qrCodeElement?: ElementRef<HTMLCanvasElement>;

  private aiService = inject(AiService);
  private caseDataService = inject(CaseDataService);
  private notificationService = inject(NotificationService);
  private ocrService = inject(OcrService);

  view = signal<AnalyzerView>('initial');
  loading = signal(false);
  loadingMessage = signal('');
  error = signal<string | null>(null);
  
  capturedImage = signal<string | null>(null);
  extractedText = signal('');
  
  private mediaStream = signal<MediaStream | null>(null);
  private channel: BroadcastChannel | null = null;
  mobileUploadUrl = signal('');

  isNamingDocument = signal(false);
  newDocumentName = signal('');

  ngOnInit() {
    this.ocrService.progress$.subscribe((progress: OcrProgress) => {
      this.loadingMessage.set(`${progress.status} (${(progress.progress * 100).toFixed(0)}%)`);
    });
    this.setupBroadcastChannel();
  }

  ngOnDestroy() {
    this.stopCamera();
    this.ocrService.terminate();
    this.channel?.close();
  }

  async startCamera() {
    this.view.set('camera');
    this.loading.set(true);
    this.loadingMessage.set('Starting camera...');
    this.error.set(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      this.mediaStream.set(stream);
      if (this.videoElement) this.videoElement.nativeElement.srcObject = stream;
    } catch (err) {
      this.error.set('Could not access camera. Please ensure it is connected and permission is granted.');
      this.view.set('initial');
    } finally {
      this.loading.set(false);
    }
  }

  stopCamera() {
    this.mediaStream()?.getTracks().forEach(track => track.stop());
    this.mediaStream.set(null);
  }

  captureImage() {
    if (!this.videoElement) return;
    const video = this.videoElement.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');
    
    this.capturedImage.set(dataUrl);
    this.stopCamera();
    this.view.set('analysis');
    this.runOcr(dataUrl);
  }

  handleImageUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        this.notificationService.addToast('Invalid File', 'Please upload a valid image file.', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.capturedImage.set(dataUrl);
      this.view.set('analysis');
      this.runOcr(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async runOcr(image: string) {
    this.loading.set(true);
    this.error.set(null);
    this.extractedText.set('');
    try {
      const text = await this.ocrService.recognize(image);
      this.extractedText.set(text);
      this.notificationService.addToast('OCR Complete', 'Text extracted successfully.', 'success');
    } catch (err) {
      this.error.set('Failed to extract text from image via OCR.');
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

  confirmAddDocument() {
    const name = this.newDocumentName().trim();
    if (!name) return;
    const newDoc: CaseDocument = {
      id: `doc_analyzed_${Date.now()}`, name, content: this.extractedText(), uploaded: new Date().toLocaleDateString(),
    };
    this.caseDataService.documents.update(docs => [...docs, newDoc]);
    this.notificationService.addToast('Success', `Document "${name}" added to case files.`, 'success');
    this.reset();
  }
  
  // --- Mobile Upload ---
  setupBroadcastChannel() {
    try {
      this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        if (event.data?.type === 'image-upload') {
          const { name, dataUrl } = event.data.payload;
          this.notificationService.addToast('Image Received', `Received ${name} from mobile device.`, 'info');
          this.capturedImage.set(dataUrl);
          this.view.set('analysis');
          this.runOcr(dataUrl);
        }
      };
    } catch (e) {
      console.error('BroadcastChannel not supported.');
    }
  }

  showMobileUpload() {
    const url = new URL(window.location.href);
    url.search = '?mobile-upload=true';
    this.mobileUploadUrl.set(url.href);
    this.view.set('mobile-upload');
    
    setTimeout(() => {
        if (this.qrCodeElement?.nativeElement) {
            new (window as any).QRious({
                element: this.qrCodeElement.nativeElement,
                value: this.mobileUploadUrl(),
                size: 200,
                background: '#f0f0f0',
                foreground: '#111827',
            });
        }
    });
  }
  
  reset() {
    this.stopCamera();
    this.view.set('initial');
    this.capturedImage.set(null);
    this.extractedText.set('');
    this.error.set(null);
    this.loading.set(false);
    this.isNamingDocument.set(false);
    this.newDocumentName.set('');
  }
  
  handleExtractedTextInput(event: Event) { this.extractedText.set((event.target as HTMLTextAreaElement).value); }
  handleNewDocumentNameInput(event: Event) { this.newDocumentName.set((event.target as HTMLInputElement).value); }
}
