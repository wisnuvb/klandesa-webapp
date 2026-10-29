import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Stage, Step } from '@/lib/queries';
import { colors, shadow, spacing, TOUCH_MIN } from '@/theme';

export const STAGE_COLOR: Record<Stage, string> = {
  sent: '#B26A00',
  approved: colors.primary,
  ready: colors.primary,
  rejected: colors.danger,
  working: '#1565C0',
  done: colors.primary,
};

/** Titik progres 3 langkah: ● selesai · ◐ sedang · ○ belum · ✕ gagal. Status juga ditulis, tidak mengandalkan warna. */
export function StepDots({ states }: { states: Step['state'][] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {states.map((st, i) => (
        <View
          key={i}
          style={[
            d.dot,
            st === 'done' && { backgroundColor: colors.primary, borderColor: colors.primary },
            st === 'current' && { borderColor: '#B26A00', backgroundColor: '#F5D9A8' },
            st === 'failed' && { borderColor: colors.danger, backgroundColor: colors.danger },
          ]}
        />
      ))}
    </View>
  );
}

export function Card({ onPress, children, label }: { onPress?: () => void; children: React.ReactNode; label?: string }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [d.card, pressed && onPress ? { opacity: 0.85 } : null]}
    >
      {children}
    </Pressable>
  );
}

/** Baris menu bergaya daftar pengaturan: ikon bulat, judul, keterangan kanan opsional, dan panah. */
export function MenuRow({ icon, title, trailing, danger, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; title: string; trailing?: string; danger?: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [d.row, pressed && { backgroundColor: colors.surface }]}
    >
      <View style={[d.rowIcon, danger && { backgroundColor: '#FDECEA' }]}>
        <Ionicons name={icon} size={22} color={danger ? colors.danger : colors.primary} />
      </View>
      <Text style={[d.rowTitle, danger && { color: colors.danger }]}>{title}</Text>
      {trailing ? <Text style={d.rowTrailing}>{trailing}</Text> : null}
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

/** Ubin aksi cepat berikon, untuk dua-tiga tindakan utama di beranda. */
export function ActionTile({ icon, label, primary, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; primary?: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [d.tile, primary ? { backgroundColor: colors.primary } : { backgroundColor: colors.primarySoft }, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
    >
      <Ionicons name={icon} size={28} color={primary ? '#fff' : colors.primary} />
      <Text style={[d.tileText, { color: primary ? '#fff' : colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

/** Ubin layanan utama di beranda warga: ikon, nama tindakan, dan satu baris penjelasan agar langsung dimengerti. */
export function ServiceTile({ icon, label, caption, primary, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; caption: string; primary?: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${caption}`}
      onPress={onPress}
      style={({ pressed }) => [d.service, primary ? { backgroundColor: colors.primary } : { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
    >
      <View style={[d.serviceIcon, primary ? { backgroundColor: 'rgba(255,255,255,0.18)' } : { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={28} color={primary ? '#fff' : colors.primary} />
      </View>
      <View>
        <Text style={[d.serviceLabel, { color: primary ? '#fff' : colors.text }]}>{label}</Text>
        <Text style={[d.serviceCaption, { color: primary ? 'rgba(255,255,255,0.88)' : colors.textMuted }]}>{caption}</Text>
      </View>
    </Pressable>
  );
}

/** Pintasan bulat berlabel untuk menu sekunder (Info Desa, Bantuan, dst.). */
export function ShortcutTile({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [d.shortcut, pressed && { opacity: 0.8 }]}>
      <View style={d.shortcutIcon}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={d.shortcutLabel} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

/** Daftar menu dalam satu kartu: ikon bulat, judul, keterangan singkat, dan panah. Baris dipisah garis tipis. */
export function MenuGroup({ items }: { items: { icon: keyof typeof Ionicons.glyphMap; title: string; caption?: string; trailing?: string; danger?: boolean; external?: boolean; onPress: () => void }[] }) {
  return (
    <View style={d.group}>
      {items.map((it, i) => (
        <Pressable
          key={it.title}
          accessibilityRole="button"
          accessibilityLabel={it.caption ? `${it.title}. ${it.caption}` : it.title}
          onPress={it.onPress}
          style={({ pressed }) => [d.groupRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.surface }, pressed && { backgroundColor: colors.surface }]}
        >
          <View style={[d.rowIcon, it.danger && { backgroundColor: '#FDECEA' }]}>
            <Ionicons name={it.icon} size={22} color={it.danger ? colors.danger : colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[d.rowTitle, it.danger && { color: colors.danger }]}>{it.title}</Text>
            {it.caption ? <Text style={d.groupCaption}>{it.caption}</Text> : null}
          </View>
          {it.trailing ? <Text style={d.rowTrailing}>{it.trailing}</Text> : null}
          <Ionicons name={it.external ? 'open-outline' : 'chevron-forward'} size={20} color={colors.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

/** Judul seksi dalam huruf biasa (bukan kapital kecil) supaya mudah dibaca. */
export function SectionHeader({ children }: { children: string }) {
  return <Text style={d.sectionHeader} accessibilityRole="header">{children}</Text>;
}

/** Keadaan kosong yang ramah: ikon, kalimat singkat, dan satu tindakan lanjutan bila ada. */
export function EmptyState({ icon, title, hint, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <View style={d.empty}>
      <View style={d.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={d.emptyTitle}>{title}</Text>
      {hint ? <Text style={d.emptyHint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

const STAGE_LOOK: Record<Stage, { bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  sent: { bg: colors.goldSoft, icon: 'time' },
  approved: { bg: colors.primarySoft, icon: 'checkmark-circle' },
  ready: { bg: colors.primarySoft, icon: 'document-text' },
  done: { bg: colors.primarySoft, icon: 'checkmark-done-circle' },
  working: { bg: '#E8F0FB', icon: 'construct' },
  rejected: { bg: '#FDECEA', icon: 'close-circle' },
};

/** Panel status besar: ikon, judul berwarna, dan "langkah berikutnya" dalam kalimat biasa. */
export function StatusHero({ stage, title, next, note }: { stage: Stage; title: string; next: string; note?: string | null }) {
  const look = STAGE_LOOK[stage];
  return (
    <View style={[d.statusHero, { backgroundColor: look.bg }]} accessible accessibilityLabel={`Status: ${title}. ${next}`}>
      <Ionicons name={look.icon} size={36} color={STAGE_COLOR[stage]} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: STAGE_COLOR[stage] }}>{title}</Text>
        <Text style={{ fontSize: 16, lineHeight: 23, color: colors.text, marginTop: 4 }}>{next}</Text>
        {note ? <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 6 }}>{note}</Text> : null}
      </View>
    </View>
  );
}

/** Linimasa vertikal bergaris: lingkaran bercentang untuk langkah selesai, cincin emas untuk yang berjalan. */
export function Timeline({ steps }: { steps: { key: string; label: string; state: Step['state']; at?: string | null }[] }) {
  const word = { done: 'selesai', current: 'sedang berjalan', todo: 'belum', failed: 'perlu perbaikan' } as const;
  return (
    <View>
      {steps.map((st, i) => {
        const last = i === steps.length - 1;
        const done = st.state === 'done';
        return (
          <View key={st.key} style={{ flexDirection: 'row', gap: spacing.md }} accessible accessibilityLabel={`${st.label}: ${word[st.state]}${st.at ? `, ${st.at}` : ''}`}>
            <View style={{ alignItems: 'center', width: 28 }}>
              <View
                style={[
                  d.tlDot,
                  done && { backgroundColor: colors.primary, borderColor: colors.primary },
                  st.state === 'current' && { backgroundColor: '#F5D9A8', borderColor: '#B26A00' },
                  st.state === 'failed' && { backgroundColor: colors.danger, borderColor: colors.danger },
                ]}
              >
                {done ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                {st.state === 'failed' ? <Ionicons name="close" size={16} color="#fff" /> : null}
                {st.state === 'current' ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#B26A00' }} /> : null}
              </View>
              {!last ? <View style={{ flex: 1, width: 3, marginVertical: 2, borderRadius: 2, backgroundColor: done ? colors.primary : colors.border }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : spacing.md, minHeight: last ? undefined : 44, justifyContent: 'flex-start' }}>
              <Text style={{ fontSize: 17, fontWeight: st.state === 'current' ? '800' : '600', color: st.state === 'todo' ? colors.textMuted : colors.text, paddingTop: 2 }}>{st.label}</Text>
              {st.at ? <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 1 }}>{st.at}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const TONES = {
  muted: { bg: colors.surface, fg: colors.textMuted },
  gold: { bg: colors.goldSoft, fg: colors.goldText },
  green: { bg: colors.primarySoft, fg: colors.primary },
  red: { bg: '#FDECEA', fg: colors.danger },
} as const;
export type Tone = keyof typeof TONES;

/** Lencana kecil berwarna (mis. PENTING, kategori, status). Arti status juga tertulis, tidak hanya warna. */
export function Chip({ label, tone = 'muted', icon }: { label: string; tone?: Tone; icon?: keyof typeof Ionicons.glyphMap }) {
  const t = TONES[tone];
  return (
    <View style={[d.chip, { backgroundColor: t.bg }]}>
      {icon ? <Ionicons name={icon} size={13} color={t.fg} /> : null}
      <Text style={[d.chipText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

/** Kotak catatan berikon: `info` (emas) untuk penjelasan, `ok` (hijau) untuk hasil baik, `warn` (merah muda) untuk peringatan. */
export function InfoBox({ tone = 'info', icon, children }: { tone?: 'info' | 'ok' | 'warn'; icon?: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  const c = tone === 'ok' ? { bg: colors.primarySoft, fg: colors.primary, ic: 'checkmark-circle' as const }
    : tone === 'warn' ? { bg: '#FDECEA', fg: colors.danger, ic: 'warning-outline' as const }
    : { bg: colors.goldSoft, fg: colors.goldText, ic: 'information-circle-outline' as const };
  return (
    <View style={[d.infoBox, { backgroundColor: c.bg }]}>
      <Ionicons name={icon ?? c.ic} size={22} color={c.fg} />
      <Text style={[d.infoText, { color: c.fg }]}>{children}</Text>
    </View>
  );
}

/** Avatar bulat berisi inisial nama (atau foto bila ada). */
export function Avatar({ name, size = 48, tone = 'soft' }: { name: string; size?: number; tone?: 'soft' | 'deep' }) {
  const text = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
  const deep = tone === 'deep';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: deep ? colors.primaryDeep : colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.36, fontWeight: '800', color: deep ? '#fff' : colors.primary }}>{text}</Text>
    </View>
  );
}

/** Pilihan berbentuk pil untuk memilih satu dari beberapa (radio). Terpilih: hijau penuh, dengan centang. */
export function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [d.choice, selected ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.bg, borderColor: colors.border }, pressed && { opacity: 0.85 }]}
    >
      {selected ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
      <Text style={{ fontSize: 16, fontWeight: '700', color: selected ? '#fff' : colors.text }}>{label}</Text>
    </Pressable>
  );
}

/** Judul langkah bernomor untuk formulir satu halaman ("1  Data siapa?"). */
export function StepTitle({ n, children }: { n: number; children: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.sm }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryDeep, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>{n}</Text>
      </View>
      <Text style={{ fontSize: 19, fontWeight: '800', color: colors.text }} accessibilityRole="header">{children}</Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return <Text style={d.section} accessibilityRole="header">{children}</Text>;
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center' }}>{title}</Text>
      {hint ? <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 4 }}>{hint}</Text> : null}
    </View>
  );
}

const d = StyleSheet.create({
  statusHero: { flexDirection: 'row', gap: spacing.md, borderRadius: 20, padding: spacing.md, alignItems: 'flex-start' },
  tlDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2.5, borderColor: colors.border, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  group: { backgroundColor: colors.bg, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card },
  groupRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  groupCaption: { fontSize: 14, lineHeight: 19, color: colors.textMuted, marginTop: 1 },
  service: { flex: 1, minHeight: 152, borderRadius: 22, padding: spacing.md, justifyContent: 'space-between', ...shadow.card },
  serviceIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  serviceLabel: { fontSize: 19, fontWeight: '800' },
  serviceCaption: { fontSize: 14, lineHeight: 19, marginTop: 2 },
  shortcut: { flex: 1, alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  shortcutIcon: { width: 60, height: 60, borderRadius: 22, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  shortcutLabel: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' },
  sectionHeader: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  empty: { alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.md, backgroundColor: colors.bg, borderRadius: 20, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  emptyIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyHint: { fontSize: 15, lineHeight: 21, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  chip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  infoBox: { flexDirection: 'row', gap: spacing.sm, borderRadius: 16, padding: spacing.md, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 15, lineHeight: 21 },
  choice: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  row: { minHeight: TOUCH_MIN, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: 14 },
  rowIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.text },
  rowTrailing: { fontSize: 14, fontWeight: '700', color: colors.danger },
  tile: { flex: 1, minHeight: 92, borderRadius: 18, padding: spacing.md, justifyContent: 'space-between' },
  tileText: { fontSize: 16, fontWeight: '700' },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.bg },
  card: { minHeight: TOUCH_MIN, backgroundColor: colors.bg, borderRadius: 18, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  section: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.sm },
});
