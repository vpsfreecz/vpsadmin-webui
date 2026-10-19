import { AsyncClient } from 'haveapi-client';
import { createRequestClientCall } from '../../src/lib/api/haveapiRequestClient';
import { requireActionStateResult, isAmbiguousMutationError, type CallOpts } from '../../src/lib/api/haveapi';
import { bindSyntheticBffSession } from './syntheticSession';

const client = new AsyncClient(`${location.origin}/api/v7.0`);
const call = createRequestClientCall(client);
let controller: AbortController | undefined;
export const pilot = {
  call,
  receipt: async () => requireActionStateResult(await call({ method: 'POST', path: '/blocking' }), 'blocking'),
  abortable: (opts: CallOpts, alreadyAborted = false) => {
    controller = new AbortController();
    if (alreadyAborted) controller.abort();
    return call({ ...opts, signal: controller.signal });
  },
  abort: () => controller?.abort(),
  bindSyntheticBffSession,
  uncertain: isAmbiguousMutationError,
};
declare global {
  interface Window {
    haveapiPilot: typeof pilot;
  }
}
window.haveapiPilot = pilot;
