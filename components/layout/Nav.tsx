import Link from "next/link";
import { cn } from "@/lib/utils";

interface NavProps {
  className?: string;
}

export function Nav({ className }: NavProps) {
  const navItems = [
    { href: "/", label: "Operator Console" },
    { href: "/demo", label: "Hero Demo" },
    { href: "/focus", label: "Today's Focus" },
    { href: "/worklist", label: "Worklist" },
    { href: "/systems", label: "Account Portfolio" },
    { href: "/insights", label: "Global Insights" },
    { href: "/strategy/global", label: "Global Strategy Dashboard" },
  ];

  return (
    <nav className={cn("border-b border-border/40 pb-4 mb-8", className)}>
      <ul className="flex flex-wrap gap-4 text-sm">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

