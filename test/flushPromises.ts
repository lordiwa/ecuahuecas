// Minimal flushPromises: lets pending microtasks (and a macrotask tick) settle
// so Vue's reactive watchers and awaited callable mocks resolve before we assert.
// Kept tiny and dependency-free; @vue/test-utils is intentionally not installed.
export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
