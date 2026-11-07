import { Badge } from '../../components/ui/Badge';

export function SecurityCveBadge({ label, sourceUrl }: { label: string; sourceUrl?: string }) {
  if (!/^CVE-\d{4}-\d{4,}$/.test(label)) return <Badge variant="info">{label}</Badge>;

  const href = typeof sourceUrl === 'string' && /^https:\/\//i.test(sourceUrl.trim())
    ? sourceUrl.trim()
    : `https://nvd.nist.gov/vuln/detail/${label}`;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/35">
      <Badge variant="info">{label} ↗</Badge>
    </a>
  );
}
