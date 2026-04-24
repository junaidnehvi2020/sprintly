import { cn } from '@/lib/utils';
import { Blocks } from 'lucide-react';

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-lg font-bold font-headline text-primary',
        className
      )}
    >
      <div className="rounded-lg bg-primary p-1.5 text-primary-foreground">
        <Blocks className="h-5 w-5" />
      </div>
      <span>Sprintly</span>
    </div>
  );
}
