import { Injectable, signal, WritableSignal, effect } from '@angular/core';

export interface AppSettings {
  userEmail: string;
  notifyOnDeadlines: boolean;
  notifyOnViolations: boolean;
  deepseekApiKey: string;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly SETTINGS_KEY = 'caseAppSettings';

  // --- SETTINGS STATE SIGNALS ---
  userEmail: WritableSignal<string> = signal('');
  notifyOnDeadlines: WritableSignal<boolean> = signal(true);
  notifyOnViolations: WritableSignal<boolean> = signal(true);
  deepseekApiKey: WritableSignal<string> = signal('');

  constructor() {
    this.loadSettings();

    // Automatically save any changes to localStorage
    effect(() => {
      this.saveSettings();
    });
  }

  private loadSettings() {
    try {
      const savedSettingsJSON = localStorage.getItem(this.SETTINGS_KEY);
      if (savedSettingsJSON) {
        const settings: AppSettings = JSON.parse(savedSettingsJSON);
        this.userEmail.set(settings.userEmail || '');
        this.notifyOnDeadlines.set(settings.notifyOnDeadlines !== false); // Default true
        this.notifyOnViolations.set(settings.notifyOnViolations !== false); // Default true
        this.deepseekApiKey.set(settings.deepseekApiKey || '');
      }
    } catch (e) {
      console.error("Failed to load settings from local storage", e);
    }
  }

  private saveSettings() {
    try {
      const settings: AppSettings = {
        userEmail: this.userEmail(),
        notifyOnDeadlines: this.notifyOnDeadlines(),
        notifyOnViolations: this.notifyOnViolations(),
        deepseekApiKey: this.deepseekApiKey(),
      };
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings to local storage", e);
      // Could add a toast notification here for quota errors
    }
  }
}
