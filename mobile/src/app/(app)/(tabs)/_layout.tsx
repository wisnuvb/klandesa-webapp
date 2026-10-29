import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Text as RNText } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InTabsContext } from '@/components/ui';
import { useHome, useRtRole, useRtSummary } from '@/lib/queries';
import { useSession } from '@/state/session';
import type { ColorValue } from 'react-native';

import { colors } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ solid, outline, color, focused }: { solid: IconName; outline: IconName; color: ColorValue; focused: boolean }) {
  return <Ionicons name={focused ? solid : outline} size={26} color={color as string} />;
}

export default function TabsLayout() {
  const isStaff = useSession().profile?.account.type === 'staff';
  // Peran tambahan: warga yang ditugaskan sebagai Ketua RT mendapat tab RT.
  const rtRole = useRtRole();
  const rtSummary = useRtSummary(!!rtRole && !isStaff);
  const pendingRt = rtSummary.data?.pendingRequests ?? 0;
  const home = useHome();
  const unread = home.data?.unreadNotifications ?? 0;
  // Tinggi tetap tanpa inset akan menimpa bar navigasi/gestur Android; tambahkan inset bawah secara eksplisit.
  const insets = useSafeAreaInsets();
  return (
    <InTabsContext.Provider value>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          // Label tab dibatasi pembesarannya (maks. 1,2×): dengan 4-5 tab, huruf lebih besar membuatnya terpotong ("Beran…").
          tabBarLabel: ({ color, children }) => (
            <RNText numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ fontSize: 13, fontWeight: '600', color }}>{children}</RNText>
          ),
          tabBarStyle: { height: 60 + insets.bottom, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 6 },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Beranda', tabBarIcon: (p) => <TabIcon solid="home" outline="home-outline" {...p} /> }} />
        <Tabs.Screen name="layanan" options={{ href: isStaff ? null : undefined, title: 'Layanan', tabBarIcon: (p) => <TabIcon solid="document-text" outline="document-text-outline" {...p} /> }} />
        <Tabs.Screen name="warga" options={{ title: 'Warga', tabBarIcon: (p) => <TabIcon solid="people" outline="people-outline" {...p} /> }} />
        <Tabs.Screen name="rt" options={{ href: rtRole && !isStaff ? undefined : null, title: 'RT', tabBarBadge: pendingRt > 0 ? pendingRt : undefined, tabBarIcon: (p) => <TabIcon solid="ribbon" outline="ribbon-outline" {...p} /> }} />
        <Tabs.Screen name="antrean" options={{ href: isStaff ? undefined : null, title: 'Antrean', tabBarIcon: (p) => <TabIcon solid="file-tray-full" outline="file-tray-full-outline" {...p} /> }} />
        <Tabs.Screen name="absen" options={{ href: isStaff ? undefined : null, title: 'Absen', tabBarIcon: (p) => <TabIcon solid="finger-print" outline="finger-print-outline" {...p} /> }} />
        <Tabs.Screen name="saya" options={{ title: 'Saya', tabBarBadge: unread > 0 ? unread : undefined, tabBarIcon: (p) => <TabIcon solid="person" outline="person-outline" {...p} /> }} />
      </Tabs>
    </InTabsContext.Provider>
  );
}
