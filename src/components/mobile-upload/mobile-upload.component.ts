import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

const BROADCAST_CHANNEL_NAME = 'ai-paralegal-mobile-upload';

@Component({
  selector: 'app-mobile-upload',
  templateUrl: './mobile-upload.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class MobileUploadComponent {
  private notificationService = inject(NotificationService);
  private channel: BroadcastChannel | null = null;

  uploading = signal(false);
  uploadSuccess = signal(false);

  constructor() {
    try {
      this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    } catch (e) {
      console.error('BroadcastChannel is not supported in this browser.', e);
    }
  }

  handleImageUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!this.channel) {
      this.notificationService.addToast('Error', 'Cross-device communication is not supported.', 'error');
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.notificationService.addToast('Invalid File', 'Please upload a valid image file (e.g., JPEG, PNG).', 'error');
      return;
    }

    this.uploading.set(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.channel?.postMessage({
        type: 'image-upload',
        payload: {
          name: file.name,
          dataUrl: dataUrl
        }
      });
      this.uploading.set(false);
      this.uploadSuccess.set(true);
    };
    reader.onerror = () => {
      this.uploading.set(false);
      this.notificationService.addToast('Error', 'Failed to read the selected file.', 'error');
    };
    reader.readAsDataURL(file);
  }
}
