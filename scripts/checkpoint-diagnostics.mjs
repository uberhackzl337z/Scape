// Diagnostics are best-effort; never replace the error that failed the checkpoint.
export async function reportCheckpointFailure(label, originalError, sources, log = console.error) {
  const diagnostics = {};
  await Promise.all(Object.entries(sources).map(async ([name, read]) => {
    try {
      diagnostics[name] = { ok: true, value: await read() };
    } catch (error) {
      diagnostics[name] = { ok: false, error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
    }
  }));
  try { log(label, diagnostics); } catch { /* Reporting must not mask the original failure. */ }
  throw originalError;
}
