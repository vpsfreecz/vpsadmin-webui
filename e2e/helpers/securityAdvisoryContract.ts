import { defaultHaveApiDescription } from '../fixtures/haveapi';

/** Synthetic metadata mirrors the authenticated HaveAPI action graph. */
export function advisoryContractDescription() {
  const guarded = {
    input: {
      parameters: {
        expected_content_revision: { type: 'Integer' },
        expected_state: {
          type: 'String',
          validators: {
            include: {
              values: {
                draft: 'Draft',
                published: 'Published',
                retracted: 'Retracted',
              },
            },
          },
        },
      },
    },
  };
  return {
    ...defaultHaveApiDescription(),
    resources: {
      security_advisory: {
        actions: {
          create: { input: { parameters: {} } },
          update: guarded,
          publish: guarded,
          retract: guarded,
          delete: guarded,
        },
        resources: { node_status: { actions: { create: guarded, update: guarded, delete: guarded } } },
      },
      security_advisory_cve: { actions: { create: guarded, update: guarded, delete: guarded } },
    },
  };
}
