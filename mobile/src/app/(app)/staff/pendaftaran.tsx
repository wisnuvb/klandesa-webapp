import { Redirect } from 'expo-router';

/** Tujuan deep link notifikasi "pendaftaran warga menunggu". */
export default function Pendaftaran() {
  return <Redirect href={{ pathname: '/antrean', params: { tab: 'pendaftaran' } }} />;
}
