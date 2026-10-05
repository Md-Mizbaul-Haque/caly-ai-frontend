import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
export default function UICard({ children, style, className }) {
  return (
    <Card style={[{ shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }, style]} className={cn('rounded-card border-border bg-card py-4', className)}>
      <CardContent className="px-4">{children}</CardContent>
    </Card>
  );
}
