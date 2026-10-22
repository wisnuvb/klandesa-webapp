import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useSession } from '@/state/session';
import type { ColorValue } from 'react-native';

import { colors } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ solid, outline, color, focused }: { solid: IconName; outline: IconName; color: ColorValue; focused: boolean }) {
  return <Ionicons name={focused ? solid : outline} size={26} color={color as string} />;
}

export default function TabsLayout() {
  const isStaff = useSession().profile?.account.type === 'staff';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarStyle: { height: 64, paddingBottom: 8, paddingTop: 6 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Beranda', tabBarIcon: (p) => <TabIcon solid="home" outline="home-outline" {...p} /> }} />
      <Tabs.Screen name="layanan" options={{ href: isStaff ? null : undefined, title: 'Layanan', tabBarIcon: (p) => <TabIcon solid="document-text" outline="document-text-outline" {...p} /> }} />
      <Tabs.Screen name="warga" options={{ href: isStaff ? null : undefined, title: 'Warga', tabBarIcon: (p) => <TabIcon solid="people" outline="people-outline" {...p} /> }} />
      <Tabs.Screen name="antrean" options={{ href: isStaff ? undefined : null, title: 'Antrean', tabBarIcon: (p) => <TabIcon solid="file-tray-full" outline="file-tray-full-outline" {...p} /> }} />
      <Tabs.Screen name="absen" options={{ href: isStaff ? undefined : null, title: 'Absen', tabBarIcon: (p) => <TabIcon solid="finger-print" outline="finger-print-outline" {...p} /> }} />
      <Tabs.Screen name="saya" options={{ title: 'Saya', tabBarIcon: (p) => <TabIcon solid="person" outline="person-outline" {...p} /> }} />
    </Tabs>
  );
}
