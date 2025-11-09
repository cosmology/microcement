import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Example Test Suite', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('should perform basic arithmetic', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const promise = Promise.resolve(42);
    const result = await promise;
    expect(result).toBe(42);
  });

  it('should mock functions correctly', () => {
    const mockFn = vi.fn((x: number) => x * 2);
    expect(mockFn(5)).toBe(10);
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith(5);
  });
});
