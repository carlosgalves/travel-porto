// make async requests to the server

export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<Array<T | undefined>> {
  const results: Array<T | undefined> = new Array(tasks.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const i = nextIndex++;
      try {
        results[i] = await tasks[i]();
      } catch {
        results[i] = undefined;
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}


export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  delayMs = 400
): Promise<T> {
  let lastError: unknown;
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      attempt++;
      if (attempt > maxRetries) throw lastError;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}