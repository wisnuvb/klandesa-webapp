import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/components/ui/utils";
import { motion } from "motion/react";

export type MetricAccent =
  | "primary"
  | "success"
  | "warning"
  | "info"
  | "blue"
  | "green"
  | "amber"
  | "purple"
  | "orange";

const accentClasses: Record<MetricAccent, { icon: string; border?: string }> = {
  primary: { icon: "bg-primary/10 text-primary" },
  success: { icon: "bg-emerald-500/10 text-emerald-600", border: "border-l-green-500" },
  warning: { icon: "bg-amber-500/10 text-amber-600", border: "border-l-amber-500" },
  info: { icon: "bg-blue-500/10 text-blue-600", border: "border-l-blue-500" },
  blue: { icon: "bg-blue-500/10 text-blue-600" },
  green: { icon: "bg-green-500/10 text-green-600", border: "border-l-green-500" },
  amber: { icon: "bg-amber-500/10 text-amber-600", border: "border-l-amber-500" },
  purple: { icon: "bg-purple-500/10 text-purple-600", border: "border-l-purple-500" },
  orange: { icon: "bg-orange-500/10 text-orange-600", border: "border-l-orange-500" },
};

export type MetricItem = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  accent?: MetricAccent;
  trend?: { value: string; isPositive: boolean };
  loading?: boolean;
};

type MetricCardProps = MetricItem & {
  animate?: boolean;
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "primary",
  trend,
  loading,
  animate = true,
}: MetricCardProps) {
  const classes = accentClasses[accent];
  const displayValue = loading ? "..." : value;

  const content = (
    <Card className={cn("hover:shadow-md transition-shadow duration-200", classes.border && `border-l-4 ${classes.border}`)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <h3 className="text-2xl md:text-3xl font-semibold mt-1 mb-1 truncate">
              {displayValue}
            </h3>
            {subtitle ? (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
            {trend && !loading ? (
              <p
                className={cn(
                  "text-sm mt-1",
                  trend.isPositive ? "text-emerald-600" : "text-red-600",
                )}
              >
                {trend.isPositive ? "↑" : "↓"} {trend.value}
              </p>
            ) : null}
          </div>
          <div className={cn("p-3 rounded-lg shrink-0", classes.icon)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!animate) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
    >
      {content}
    </motion.div>
  );
}

type MetricGridProps = {
  items: MetricItem[];
  columns?: 2 | 3 | 4;
  animate?: boolean;
};

export function MetricGrid({ items, columns = 4, animate = true }: MetricGridProps) {
  const colClass =
    columns === 2
      ? "md:grid-cols-2"
      : columns === 3
        ? "md:grid-cols-2 lg:grid-cols-3"
        : "md:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={cn("grid grid-cols-1 gap-4", colClass)}>
      {items.map((item) => (
        <MetricCard key={item.title} {...item} animate={animate} />
      ))}
    </div>
  );
}
