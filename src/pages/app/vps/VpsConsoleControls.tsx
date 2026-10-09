import { useState } from 'react';
import { KeyRound, LifeBuoy, Play, RotateCw, Square } from 'lucide-react';
import { useI18n } from '../../../app/i18n';
import { ActionButton } from '../../../components/ui/ActionButton';
import type { GateDecision } from '../../../lib/gates/types';
import { gateVpsMutation } from '../../../lib/gates/vps';
import { useVps } from './VpsContext';
import { VpsConsoleRescueDialog } from './VpsConsoleRescueDialog';

export function VpsConsoleControls(props: {
  startGate: GateDecision;
  stopGate: GateDecision;
  restartGate: GateDecision;
  passwordGate: GateDecision;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onPassword: () => void;
}) {
  const { t } = useI18n();
  const { vps, canMutateVps, busyLocalLock, busyTransaction } = useVps();
  const [rescueOpen, setRescueOpen] = useState(false);
  const rescueGate = gateVpsMutation({ vps, busyLocal: busyLocalLock, busyTransaction });
  const supportsRescue = vps.node?.hypervisor_type === 'vpsadminos';
  const actions = [
    { id: 'start', label: 'action.vps.start.label', Icon: Play, gate: props.startGate, run: props.onStart },
    { id: 'stop', label: 'action.vps.stop.label', Icon: Square, gate: props.stopGate, run: props.onStop },
    { id: 'restart', label: 'action.vps.restart.label', Icon: RotateCw, gate: props.restartGate, run: props.onRestart },
    {
      id: 'password',
      label: 'action.vps.root_password.label',
      Icon: KeyRound,
      gate: props.passwordGate,
      run: props.onPassword,
    },
  ] as const;

  if (!canMutateVps) return null;
  return (
    <div
      className="grid items-start gap-2 border-t border-border pt-3 sm:grid-cols-[11rem_minmax(0,1fr)]"
      data-testid="vps.console.controls"
      role="group"
      aria-label={t('vps.console.controls')}
    >
      <span className="flex items-center text-xs font-medium text-muted sm:min-h-8">{t('vps.console.controls')}</span>
      <div className="grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-5 [&>button]:h-auto [&>button]:min-h-11 [&>button]:py-1 [&_svg]:shrink-0">
        {actions.map(({ id, label, Icon, gate, run }) => (
          <ActionButton
            key={id}
            size="sm"
            variant="secondary"
            testId={`vps.console.control.${id}`}
            disabled={!gate.allowed}
            disabledReason={!gate.allowed ? gate.reason : undefined}
            onClick={run}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {t(label)}
          </ActionButton>
        ))}
        <ActionButton
          size="sm"
          variant="secondary"
          testId="vps.console.control.rescue"
          disabled={!supportsRescue || !rescueGate.allowed}
          disabledReason={
            !supportsRescue
              ? { titleKey: 'vps.console.rescue.unsupported' }
              : !rescueGate.allowed
                ? rescueGate.reason
                : undefined
          }
          onClick={() => setRescueOpen(true)}
        >
          <LifeBuoy className="h-4 w-4" aria-hidden="true" />
          {t('vps.console.rescue.title')}
        </ActionButton>
      </div>
      {rescueOpen ? <VpsConsoleRescueDialog onClose={() => setRescueOpen(false)} /> : null}
    </div>
  );
}
