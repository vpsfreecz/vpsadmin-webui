import { describe, expect, it, vi } from 'vitest';
import { apiWire } from '../../test/haveapiXhr';
import { createHelpBox, fetchContextualHelpBoxes, updateHelpBox } from './helpBoxes';
import { isAmbiguousMutationError } from './apiErrors';

function reply(data: unknown) {
  apiWire.respond = vi.fn(async () => ({ status: 200, json: async () => ({ status: true, response: data }) }));
}

describe('generated HelpBox boundary', () => {
  it('omits unlocalized create language and preserves zero order', async () => {
    reply({ help_box: { id: 9, language: null } });
    await createHelpBox({ page: 'log', action: '*', content: 'Help', order: 0 });
    expect(JSON.parse(apiWire.requests.at(-1)!.body!)).toEqual({
      help_box: { page: 'log', action: '*', content: 'Help', order: 0 },
    });
  });

  it('omits unchanged language on update and sends a real language change', async () => {
    reply({ help_box: { id: 9, language: { id: 2 } } });
    await updateHelpBox(9, { content: 'Updated' });
    expect(JSON.parse(apiWire.requests.at(-1)!.body!)).toEqual({ help_box: { content: 'Updated' } });
    await updateHelpBox(9, { language: 2 });
    expect(JSON.parse(apiWire.requests.at(-1)!.body!)).toEqual({ help_box: { language: 2 } });
  });

  it('uses public policy without auth or language and keeps the full receipt', async () => {
    const response = { help_boxes: [{ id: 9, language: null }], _meta: { total_count: 1 } };
    reply(response);
    const result = await fetchContextualHelpBoxes('log', '*', 'public');
    expect(result).toMatchObject({
      data: [{ id: 9 }],
      meta: { total_count: 1 },
      httpStatus: 200,
      envelope: { status: true, response },
    });
    const headers = apiWire.requests.at(-1)!.headers;
    expect(headers).not.toHaveProperty('Accept-Language');
    expect(headers).not.toHaveProperty('Authorization');
    expect(new URL(apiWire.requests.at(-1)!.url).searchParams.get('help_box[view]')).toBe('true');
  });

  it('keeps malformed accepted creates ambiguous with their receipt', async () => {
    const response = { help_box: { id: null }, _meta: { action_state_id: 42 } };
    reply(response);
    const error: unknown = await createHelpBox({ content: 'Help' }).catch((cause: unknown) => cause);
    expect(isAmbiguousMutationError(error)).toBe(true);
    expect(error).toMatchObject({
      name: 'ApiOutputError',
      phase: 'post-dispatch',
      result: { httpStatus: 200, envelope: { response } },
    });
  });
});
