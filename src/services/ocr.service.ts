import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

// Tesseract is loaded from a CDN in index.html
declare const Tesseract: any;

export interface OcrProgress {
  status: string;
  progress: number;
}

@Injectable({ providedIn: 'root' })
export class OcrService {
  private worker: any = null;
  private progressSubject = new Subject<OcrProgress>();
  public progress$ = this.progressSubject.asObservable();

  constructor() {}

  private async initializeWorker(): Promise<void> {
    if (this.worker) {
      return;
    }
    this.worker = await Tesseract.createWorker('eng', 1, {
      logger: (m: OcrProgress) => this.progressSubject.next(m),
    });
  }

  async recognize(image: string | File): Promise<string> {
    await this.initializeWorker();
    
    try {
      const { data: { text } } = await this.worker.recognize(image);
      return text;
    } catch (error) {
      console.error('OCR recognition failed:', error);
      // Attempt to terminate and re-create the worker on failure
      await this.terminate();
      throw new Error('Failed to recognize text from image.');
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
