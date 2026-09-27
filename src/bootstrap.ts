import { renderBootstrapFailure, safeBootstrapFailureClass } from './app/bootstrapFailure';
import { selectedRuntimeMode } from './app/runtimeMode';
import {
  loadBffRuntimeSession, loadOptionalRuntimeScripts, loadRequiredBffRuntime,
} from './app/runtimeBootstrap';

let activeBffAttempt: AbortController | undefined;

async function startRequiredBff(): Promise<void> {
  activeBffAttempt?.abort();
  const attempt = new AbortController();
  activeBffAttempt = attempt;
  try {
    const localDev = import.meta.env.DEV &&
      ['localhost', '127.0.0.1', '::1', '[::1]'].includes(window.location.hostname);
    await loadRequiredBffRuntime({ signal: attempt.signal, allowHttp: localDev });
    if (activeBffAttempt !== attempt) return;
    await import('./main');
  } catch (error) {
    if (activeBffAttempt !== attempt) return;
    console.error('vpsAdmin UI bootstrap failed', { failure: safeBootstrapFailureClass(error) });
    renderBootstrapFailure(error, document, () => { void startRequiredBff(); });
  }
}

async function bootstrap(): Promise<void> {
  try {
    if (selectedRuntimeMode() === 'bff') {
      await startRequiredBff();
      return;
    }
    await loadOptionalRuntimeScripts();
    await loadBffRuntimeSession();
    await import('./main');
  } catch (error) {
    console.error('vpsAdmin UI bootstrap failed', { failure: safeBootstrapFailureClass(error) });
    renderBootstrapFailure(error);
  }
}

void bootstrap();
