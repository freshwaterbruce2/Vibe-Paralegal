/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeAll, afterEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};

// Mock BroadcastChannel
class BroadcastChannelMock {
  name: string;
  onmessage: ((_event: any) => void) | null = null;

  constructor(name: string) {
    this.name = name;
  }

  postMessage(_message: unknown) {
    // Mock implementation
  }

  close() {
    // Mock implementation
  }
}

beforeAll(() => {
  (globalThis as any).localStorage = localStorageMock;
  (globalThis as any).BroadcastChannel = BroadcastChannelMock;
});

afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});
