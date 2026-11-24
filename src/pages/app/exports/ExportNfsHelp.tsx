import { useI18n } from '../../../app/i18n';

export function ExportNfsHelp(props: { testId: string }) {
  const { t } = useI18n();
  return (
    <div className="space-y-1 text-xs text-muted" data-testid={props.testId}>
      <p>{t('exports.nfs.help.body')}</p>
      <a
        className="inline-block text-link hover:underline"
        href="https://www.man7.org/linux/man-pages/man5/exports.5.html"
        target="_blank"
        rel="noopener noreferrer"
        data-testid={`${props.testId}.manual`}
      >
        {t('exports.nfs.help.link')}
        <span className="sr-only">{t('exports.nfs.help.new_tab')}</span>
      </a>
    </div>
  );
}
