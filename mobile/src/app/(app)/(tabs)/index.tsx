import { CitizenHome } from '@/screens/CitizenHome';
import { StaffHome } from '@/screens/StaffHome';
import { useSession } from '@/state/session';

export default function Beranda() {
  const { profile } = useSession();
  return profile?.account.type === 'staff' ? <StaffHome /> : <CitizenHome />;
}
