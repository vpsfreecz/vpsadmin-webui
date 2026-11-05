import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import {
  MailTemplateEditorModal,
  mailTemplateEditorPayload,
  mailTemplateEditorUpdatePayload,
  type MailTemplateEditorValues,
} from './MailTemplateEditorModal';

vi.mock('../../../../app/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const values: MailTemplateEditorValues = {
  name: '  registration  ',
  label: '  Registration mail  ',
  templateId: '  registration-v2  ',
  userVisibility: 'visible',
};

describe('mail template editor payloads', () => {
  test('create includes normalized operational identifiers', () => {
    expect(mailTemplateEditorPayload(values)).toEqual({
      name: 'registration',
      label: 'Registration mail',
      template_id: 'registration-v2',
      user_visibility: 'visible',
    });
  });

  test('edit cannot send operational identifiers', () => {
    expect(mailTemplateEditorUpdatePayload(values)).toEqual({
      label: 'Registration mail',
      user_visibility: 'visible',
    });
  });
});

describe('mail template editor local feedback', () => {
  test.each(['create', 'edit'] as const)('announces %s rejection in the dialog without losing the draft', (mode) => {
    const props = {
      open: true,
      mode,
      template: { id: 1, name: 'registration', label: 'Registration', template_id: 'registration-v2' },
      error: null as string | null,
      onClose: vi.fn(),
      onSubmit: vi.fn(),
    };
    const view = render(React.createElement(MailTemplateEditorModal, props));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByTestId('admin.mailer.template.editor.label'), {
      target: { value: 'Unsaved label' },
    });

    view.rerender(React.createElement(MailTemplateEditorModal, { ...props, error: 'Template update denied' }));

    const error = within(dialog).getByRole('alert');
    expect(error).toHaveTextContent('mailer.templates.editor.error_title');
    expect(error).toHaveTextContent('Template update denied');
    expect(within(error).getByTestId('admin.mailer.template.editor.error')).toBeVisible();
    expect(within(dialog).getByTestId('admin.mailer.template.editor.label')).toHaveValue('Unsaved label');
    expect(within(dialog).getByTestId('admin.mailer.template.editor.cancel')).toBeEnabled();
    expect(within(dialog).getByTestId('admin.mailer.template.editor.submit')).toBeEnabled();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });
});
