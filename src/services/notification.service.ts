import { Injectable, signal, WritableSignal } from '@angular/core';

export interface Toast {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  toasts: WritableSignal<Toast[]> = signal([]);
  private nextId = 0;

  /**
   * Simulates sending an email and shows a toast notification.
   * @param subject The subject of the email.
   * @param body The body content of the email.
   * @param userEmail The recipient's email address.
   */
  notify(subject: string, body: string, userEmail: string) {
    if (!userEmail) {
      console.warn("Cannot send notification: User email is not set.");
      return;
    }

    console.log("--- SIMULATING EMAIL NOTIFICATION ---");
    console.log(`To: ${userEmail}`);
    console.log(`Subject: ${subject}`);
    console.log("Body:", body);
    console.log("------------------------------------");

    this.addToast(subject, `Email alert sent to ${userEmail}`, 'info');
  }

  /**
   * Adds a toast message to the UI.
   * @param title The title of the toast.
   * @param message The main message of the toast.
   * @param type The type of toast.
   */
  addToast(title: string, message: string, type: 'info' | 'success' | 'error') {
    const id = this.nextId++;
    const newToast: Toast = { id, title, message, type };
    
    this.toasts.update(currentToasts => [...currentToasts, newToast]);

    setTimeout(() => {
      this.removeToast(id);
    }, 6000); // Toast disappears after 6 seconds
  }

  /**
   * Removes a toast from the UI by its ID.
   * @param id The ID of the toast to remove.
   */
  removeToast(id: number) {
    this.toasts.update(currentToasts => currentToasts.filter(toast => toast.id !== id));
  }
}