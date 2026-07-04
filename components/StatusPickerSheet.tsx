import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { STATUS, STATUS_ORDER, T, type AppStatus } from '@/theme/tokens';
import type { Application } from '@/lib/types';

// Manual override for the automatic email-driven status updates — "just in
// case" the classifier misses something or a company doesn't email at all.
export function StatusPickerSheet({
  app,
  onSelect,
  onClose,
}: {
  app: Application | null;
  onSelect: (status: AppStatus) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!app} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        {app && (
          <Text style={styles.title} numberOfLines={1}>
            Move {app.company}
          </Text>
        )}
        {STATUS_ORDER.map((s) => {
          const st = STATUS[s as keyof typeof STATUS];
          const active = app?.status === s;
          return (
            <Pressable
              key={s}
              onPress={() => onSelect(s)}
              style={[styles.row, active && { backgroundColor: T.surface2 }]}
            >
              <View style={[styles.dot, { backgroundColor: st.color }]} />
              <Text style={styles.rowText}>{st.label}</Text>
              {active && <Text style={styles.current}>current</Text>}
            </Pressable>
          );
        })}
        <Pressable onPress={onClose} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: T.border2, alignSelf: 'center', marginBottom: 14 },
  title: { fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: T.ink, marginBottom: 8, paddingHorizontal: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowText: { flex: 1, fontFamily: 'Outfit_500Medium', fontSize: 15, color: T.ink },
  current: { fontFamily: 'DMMono_400Regular', fontSize: 10.5, color: T.ink3, textTransform: 'uppercase' },
  cancel: { marginTop: 8, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: T.ink2 },
});
