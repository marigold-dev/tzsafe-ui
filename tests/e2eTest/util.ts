export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5
): Promise<T> {
  let attempts = 0;
  while (true) {
    try {
      const a = await fn();
      return a;
    } catch (error) {
      if (++attempts === maxRetries) throw error;
      console.log(`retry ... ${attempts}/${maxRetries}\nError: ${error}`);
    }
  }
}
