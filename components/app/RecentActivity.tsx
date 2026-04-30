"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { FileText, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";

interface Activity {
  id: string;
  type: "surat" | "warga" | "keuangan";
  title: string;
  description: string;
  timestamp: string;
  status: "pending" | "approved" | "rejected" | "completed";
  user?: string;
}

const statusConfig = {
  pending: {
    label: "Pending",
    variant: "secondary" as const,
    icon: Clock,
  },
  approved: {
    label: "Disetujui",
    variant: "default" as const,
    icon: CheckCircle,
  },
  rejected: {
    label: "Ditolak",
    variant: "destructive" as const,
    icon: XCircle,
  },
  completed: {
    label: "Selesai",
    variant: "default" as const,
    icon: CheckCircle,
  },
};

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadActivities = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch("/api/activities/recent");
        if (!res.ok) throw new Error("Failed to fetch activities");

        const result = await res.json();
        if (isMounted && result.success) {
          setActivities(result.data);
        }
      } catch (err) {
        console.error("Gagal memuat aktivitas:", err);
        if (isMounted) {
          setError("Gagal memuat aktivitas");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadActivities();

    // Refresh setiap 30 detik
    const interval = setInterval(loadActivities, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktivitas Terbaru</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {error}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Belum ada aktivitas
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const StatusIcon = statusConfig[activity.status].icon;

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
                >
                  <div className="mt-1">
                    {activity.user ? (
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {activity.user}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-sm">{activity.title}</p>
                      <Badge
                        variant={statusConfig[activity.status].variant}
                        className="shrink-0 gap-1"
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig[activity.status].label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.timestamp}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
