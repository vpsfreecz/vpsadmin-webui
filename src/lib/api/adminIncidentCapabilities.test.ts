import { expect, it } from 'vitest';
import type { ActionDescription, ApiDescription } from 'vpsadmin-typescript-client';
import { adminIncidentCapabilities, evaluationFields, exposureFields } from './adminIncidentCapabilities';

function action(history: boolean): ActionDescription {
  const parameters = (keys: readonly string[]) => Object.fromEntries(keys.map((k) => [k, {}]));
  return {
    method: 'GET',
    output: { layout: 'object_list', parameters: parameters(history ? evaluationFields : exposureFields) },
    input: {
      parameters: parameters(
        history
          ? [
              'offset',
              'limit',
              'as_of',
              'policy_key',
              'vps_id',
              'user_id',
              'scope',
              'from',
              'to',

              'direction',
              'decision',
              'action_kind',
              'action_state',
              'mail_state',
            ]
          : [
              'offset',
              'limit',
              'as_of',
              'policy_key',
              'vps',
              'user',
              'node',
              'status',
              'effective_mode',
              'stop_enforced',
              'sort',
              'direction',
            ]
      ),
    },
    meta: {
      global: {
        output: {
          parameters: parameters([
            'total_count',
            'offset',
            'limit',
            'next_offset',
            'as_of',
            'read_at',
            ...(history ? ['from', 'to'] : []),
          ]),
        },
      },
    },
  };
}
function description(): ApiDescription {
  return {
    resources: {
      incident_policy_exposure: { actions: { index: action(false) } },
      incident_policy_evaluation: { actions: { index: action(true) } },
    },
  };
}
it('permission-filtered absent actions do not advertise either view', () => {
  expect(adminIncidentCapabilities({ resources: {} })).toEqual({ overview: false, history: false });
  expect(adminIncidentCapabilities(description())).toEqual({ overview: true, history: true });
});
it.each(['warning_remaining', 'stop_enforced', 'vps'])('requires authorized exposure field %s', (field) => {
  const d = description();
  delete d.resources!['incident_policy_exposure']!.actions!['index']!.output!.parameters![field];
  expect(adminIncidentCapabilities(d)).toEqual({ overview: false, history: true });
});
it.each(['next_offset', 'as_of', 'read_at'])('requires metadata %s before calling a new endpoint', (field) => {
  const d = description();
  delete d.resources!['incident_policy_evaluation']!.actions!['index']!.meta!.global!.output!.parameters![field];
  expect(adminIncidentCapabilities(d)).toEqual({ overview: true, history: false });
});

it('history requires direction without a sort capability', () => {
  const d = description();
  expect(adminIncidentCapabilities(d).history).toBe(true);
  delete d.resources!['incident_policy_evaluation']!.actions!['index']!.input!.parameters!['direction'];
  expect(adminIncidentCapabilities(d).history).toBe(false);
});
