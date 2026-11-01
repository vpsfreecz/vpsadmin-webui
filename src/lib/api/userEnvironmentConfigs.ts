import type {
  Environment__ShowOutput,
  User__EnvironmentConfig__IndexInput,
  User__EnvironmentConfig__IndexOutput,
  User__EnvironmentConfig__UpdateInput,
} from 'vpsadmin-typescript-client';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';

export type UserEnvironmentConfig = Omit<User__EnvironmentConfig__IndexOutput[number], 'id' | 'environment'> & {
  id: number;
  environment?: UserEnvironmentConfigEnvironmentRef | null;
};
export type UserEnvironmentConfigEnvironmentRef = Pick<Environment__ShowOutput, 'id' | 'label'>;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function reference(value: unknown): boolean {
  return (
    record(value) &&
    (value['id'] == null ||
      (typeof value['id'] === 'number' && Number.isSafeInteger(value['id']) && value['id'] > 0)) &&
    ['label', 'login'].every((key) => value[key] == null || typeof value[key] === 'string')
  );
}

function isUserEnvironmentConfig(value: unknown): value is UserEnvironmentConfig {
  return (
    record(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['vps_lifetime', 'max_vps_count'].every(
      (key) => value[key] == null || (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    ['can_create_vps', 'can_destroy_vps', 'default'].every(
      (key) => value[key] == null || typeof value[key] === 'boolean'
    ) &&
    (value['environment'] == null || reference(value['environment']))
  );
}
function readUserEnvironmentConfig(value: unknown): UserEnvironmentConfig {
  if (!isUserEnvironmentConfig(value)) throw new TypeError('Expected UserEnvironmentConfig');
  return value;
}
function readUserEnvironmentConfigList(value: unknown): UserEnvironmentConfig[] {
  if (!Array.isArray(value)) throw new TypeError('Expected UserEnvironmentConfig collection');
  return value.map(readUserEnvironmentConfig);
}

/**
 * User environment configs (env_cfg*)
 *
 * Backend resource:
 * - User::EnvironmentConfig (route: /users/:id/environment_configs)
 */

export async function fetchUserEnvironmentConfigs(
  userId: number,
  opts?: {
    environmentId?: number;
    fromId?: number;
    limit?: number;
  }
) {
  const params: User__EnvironmentConfig__IndexInput = {};
  if (opts?.environmentId !== undefined) params['environment'] = opts.environmentId;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;

  const res = narrowApiResult(
    await (
      await getApi()
    ).user.environment_config.index({
      path: { user_id: userId },
      params: Object.keys(params).length > 0 ? params : undefined,
    }),
    readUserEnvironmentConfigList,
    'fetchUserEnvironmentConfigs'
  );

  return {
    ...res,
    data: res.data,
  };
}

export async function updateUserEnvironmentConfig(
  userId: number,
  configId: number,
  payload: User__EnvironmentConfig__UpdateInput
) {
  return narrowApiResult(
    await (
      await getApi()
    ).user.environment_config.update({ path: { user_id: userId, environment_config_id: configId }, params: payload }),
    readUserEnvironmentConfig,
    'updateUserEnvironmentConfig'
  );
}
