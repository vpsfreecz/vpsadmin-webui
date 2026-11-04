import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useI18n } from '../../../../app/i18n';
import { Button } from '../../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../../components/ui/Card';
import { CopyButton } from '../../../../components/ui/CopyButton';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { LoadingState } from '../../../../components/ui/LoadingState';
import { fetchPaymentInstructions } from '../../../../lib/api/payments';
import { normalizePaymentInstructions, paymentInstructionsPlainText } from '../../payments/PaymentsModel';
import { PaymentInstructionsHtml } from '../../payments/PaymentInstructionsHtml';

export function AdminUserPaymentInstructions({ userId }: { userId: number }) {
  const { lang, t } = useI18n();
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const instructionsQ = useQuery({
    queryKey: ['users', 'payment_instructions', userId],
    queryFn: async () => (await fetchPaymentInstructions(userId)).data,
    enabled: instructionsOpen,
    staleTime: 10 * 60_000,
  });

  const instructions = normalizePaymentInstructions(instructionsQ.data);
  const instructionsCopyText = useMemo(
    () => paymentInstructionsPlainText(instructions, lang),
    [instructions, lang],
  );

  return (
    <Card testId="admin.user.payments.instructions.card">
      <CardHeader
        className={instructionsOpen ? undefined : 'border-b-0'}
        title={t('payments.my.instructions.title')}
        subtitle={t('admin.user.payments.instructions.description')}
        actions={(
          <>
            {instructionsOpen && instructions ? (
              <CopyButton
                text={instructionsCopyText}
                testId="admin.user.payments.instructions.copy"
              />
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setInstructionsOpen((open) => !open)}
              aria-expanded={instructionsOpen}
              aria-controls="admin-user-payment-instructions-content"
              testId="admin.user.payments.instructions.toggle"
            >
              {t(instructionsOpen ? 'common.collapse' : 'common.expand')}
            </Button>
          </>
        )}
      />
      {instructionsOpen ? (
        <CardBody>
          <div id="admin-user-payment-instructions-content">
            {instructionsQ.isLoading ? <LoadingState /> : null}
            {instructionsQ.isError ? (
              <ErrorState
                title={t('payments.my.instructions.load_error.title')}
                error={instructionsQ.error}
                onRetry={() => void instructionsQ.refetch()}
                showBack={false}
              />
            ) : null}
            {!instructionsQ.isLoading && !instructionsQ.isError ? (
              instructions ? (
                <PaymentInstructionsHtml
                  html={instructions}
                  testId="admin.user.payments.instructions.text"
                />
              ) : (
                <div className="text-sm text-muted" data-testid="admin.user.payments.instructions.empty">
                  {t('common.na')}
                </div>
              )
            ) : null}
          </div>
        </CardBody>
      ) : null}
    </Card>
  );
}
