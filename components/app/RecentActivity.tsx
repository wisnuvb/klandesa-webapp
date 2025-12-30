import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { FileText, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Activity {
  id: string;
  type: 'surat' | 'warga' | 'keuangan';
  title: string;
  description: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  user?: string;
}

const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'surat',
    title: 'Permohonan Surat Keterangan',
    description: 'Wahyudi Ismail - NIK: 92838484',
    timestamp: '2 jam yang lalu',
    status: 'pending',
    user: 'WI'
  },
  {
    id: '2',
    type: 'surat',
    title: 'Surat Keterangan Usaha',
    description: 'Ahmad Lutfi Akbar - NIK: 73120328',
    timestamp: '3 jam yang lalu',
    status: 'approved',
    user: 'AL'
  },
  {
    id: '3',
    type: 'warga',
    title: 'Data Warga Diperbarui',
    description: '5 data warga telah diupdate',
    timestamp: '5 jam yang lalu',
    status: 'completed'
  },
  {
    id: '4',
    type: 'surat',
    title: 'Surat Keterangan Domisili',
    description: 'Keisha Nur Afiqa - NIK: 73120741',
    timestamp: '1 hari yang lalu',
    status: 'approved',
    user: 'KA'
  },
  {
    id: '5',
    type: 'keuangan',
    title: 'Laporan Keuangan November',
    description: 'Laporan telah tersedia untuk direview',
    timestamp: '1 hari yang lalu',
    status: 'completed'
  }
];

const statusConfig = {
  pending: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
  approved: { label: 'Disetujui', variant: 'default' as const, icon: CheckCircle },
  rejected: { label: 'Ditolak', variant: 'destructive' as const, icon: XCircle },
  completed: { label: 'Selesai', variant: 'default' as const, icon: CheckCircle }
};

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktivitas Terbaru</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActivities.map((activity) => {
            const StatusIcon = statusConfig[activity.status].icon;
            
            return (
              <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
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
      </CardContent>
    </Card>
  );
}
