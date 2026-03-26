import { Badge } from '@/components/ui/badge';
import { SOURCE_LABELS, SOURCE_COLORS, type FieldSource } from '@/lib/ai-setup-types';

export function FieldSourceBadge({ source }: { source: FieldSource }) {
  return (
    <Badge
      variant="outline"
      className={`text-[10px] px-1.5 py-0 font-medium border ${SOURCE_COLORS[source]}`}
    >
      {SOURCE_LABELS[source]}
    </Badge>
  );
}
