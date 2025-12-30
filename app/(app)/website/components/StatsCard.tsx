import { TrendingUp, Users, FileText, Eye } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: "visitors" | "posts" | "views" | "engagement";
  trend?: {
    value: number;
    isUp: boolean;
  };
}

const iconMap = {
  visitors: Users,
  posts: FileText,
  views: Eye,
  engagement: TrendingUp,
};

export function StatsCard({ title, value, icon, trend }: StatsCardProps) {
  const Icon = iconMap[icon];

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-teal-50 rounded-lg">
          <Icon className="w-6 h-6 text-teal-600" />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              trend.isUp ? "text-green-600" : "text-red-600"
            }`}
          >
            <TrendingUp className={`w-4 h-4 ${!trend.isUp && "rotate-180"}`} />
            {trend.value}%
          </div>
        )}
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
