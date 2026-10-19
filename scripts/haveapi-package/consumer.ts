import { AsyncClient } from 'haveapi-client';
import { createRequestClientCall, type HaveApiRequestClient } from '../../src/lib/api/haveapiRequestClient';

const actual: HaveApiRequestClient = new AsyncClient('https://api.example.test/v7.0');
const call = createRequestClientCall(actual);
const result: Promise<{ data: { id: number } }> = call<{ id: number }>({ path: '/things/7' });
void result;
// @ts-expect-error The structural seam must reject unsupported callback-style calls.
actual.request({ method: 'GET', path: '/things' }, () => {});
