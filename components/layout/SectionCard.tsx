import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SectionCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export function SectionCard({ children, className, title, description }: SectionCardProps) {
  return (
    <section className={cn("rounded-xl border border-border/40 bg-background p-4 md:p-6", className)}>
      {title && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

