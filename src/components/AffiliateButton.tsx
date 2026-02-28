// Reusable affiliate button component for hotels and activities
import { ExternalLink } from 'lucide-react';

type Props = {
  type: 'hotel' | 'activity';
  href: string;
  label?: string;
};

export default function AffiliateButton({ type, href, label }: Props) {
  const isHotel = type === 'hotel';
  const defaultLabel = isHotel ? 'Check Rates' : 'Get Tickets';
  const bgColor = isHotel ? 'bg-kite-blue' : 'bg-green-600';
  const hoverColor = isHotel ? 'hover:bg-[#0056b3]' : 'hover:bg-green-700';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${bgColor} ${hoverColor} text-white text-xs font-medium rounded-lg transition-colors shadow-sm hover:shadow-md`}
      title={`${defaultLabel} on partner site`}
    >
      {label || defaultLabel}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}
