import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LANGUAGES, UI_STRINGS } from '@/constants/languages';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { BrandMark, Button, Card, Screen, Txt } from '@/ui';

export default function ProfileScreen() {
  const { language } = useStore();
  const { user, token, logout } = useAuth();
  const { c } = useTheme();

  if (!language) return null;
  const t = UI_STRINGS[language];
  const langNative = LANGUAGES.find((l) => l.code === language)?.native ?? '';

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Txt variant="title">{t.profileTitle}</Txt>
      </View>

      <View style={styles.body}>
        <View style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: c.primarySoft }]}>
            <BrandMark size={34} />
          </View>
          <Txt variant="h2" style={{ marginTop: 10 }}>
            {user?.name?.trim() || t.guestLabel}
          </Txt>
          {user?.phone && (
            <Txt variant="body" tone="dim">
              {user.phone}
            </Txt>
          )}
        </View>

        {!token && (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="information-circle" size={20} color={c.warn} />
            <Txt variant="body" tone="dim" style={{ flex: 1 }}>
              {t.guestNotice}
            </Txt>
          </Card>
        )}

        <Card style={{ gap: 2 }} padded={false}>
          <Row icon="language" label={t.languageLabel} value={langNative} onPress={() => router.push('/language')} />
          {user?.phone && <Row icon="call" label={t.phoneLabel} value={user.phone} />}
        </Card>

        {token ? (
          <Button label={t.logout} variant="secondary" icon="log-out-outline" onPress={logout} />
        ) : (
          <Button label={t.createAccount} icon="person-add" onPress={() => router.push('/auth')} />
        )}
      </View>
    </Screen>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.row, { borderColor: c.border }]}>
      <Ionicons name={icon} size={18} color={c.textDim} />
      <Txt variant="body" tone="dim" style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt variant="body">{value}</Txt>
      {onPress && (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={c.textFaint}
          onPress={onPress}
          suppressHighlighting
          style={{ marginLeft: 4 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  body: { padding: 20, paddingTop: 4, gap: 16 },
  identity: { alignItems: 'center', paddingVertical: 8 },
  avatar: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
});
