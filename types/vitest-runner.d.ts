type TestFn = () => void | Promise<void>;

declare function describe(name: string, fn: TestFn): void;
declare const it: (name: string, fn: TestFn) => void;
declare const test: (name: string, fn: TestFn) => void;
declare const beforeEach: (fn: TestFn) => void;
declare const afterEach: (fn: TestFn) => void;

declare function expect(actual: unknown): {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toContain(expected: unknown): void;
  toHaveLength(length: number): void;
  not: {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toContain(expected: unknown): void;
    toHaveLength(length: number): void;
  };
};
