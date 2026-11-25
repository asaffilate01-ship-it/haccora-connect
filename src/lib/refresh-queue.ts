/** Single-flight reads with one trailing refresh for requests arriving during a read. */
export function createRefreshQueue(refresh: () => Promise<void>) {
  let running: Promise<void> | null = null;
  let pending = false;
  let disposed = false;

  function request(): Promise<void> {
    if (disposed) return Promise.resolve();
    pending = true;
    if (!running) {
      running = Promise.resolve().then(async () => {
        try {
          while (pending && !disposed) {
            pending = false;
            await refresh();
          }
        } finally {
          running = null;
        }
      });
    }
    return running;
  }

  return {
    request,
    dispose() {
      disposed = true;
      pending = false;
    },
  };
}
