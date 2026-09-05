import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'expo-image';

import { LANGUAGES, UI_STRINGS } from '@/constants/languages';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { BrandMark, Button, Card, Screen, Txt } from '@/ui';

async function toAvatarDataUri(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri).resize({ width: 320, height: 320 });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ compress: 0.6, format: SaveFormat.JPEG, base64: true });
  return `data:image/jpeg;base64,${result.base64}`;
}

export default function ProfileScreen() {
  const { language, guestProfile } = useStore();
  const { user, token, logout, updateProfile } = useAuth();
  const { c } = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!language) return null;
  const t = UI_STRINGS[language];
  const prof = user ?? guestProfile;
  const langNative = LANGUAGES.find((l) => l.code === language)?.native ?? '';

  async function pickFrom(source: 'camera' | 'library') {
    setSheetOpen(false);
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t.photoPermissionDenied);
      return;
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets[0]) return;
    setBusy(true);
    try {
      const dataUri = await toAvatarDataUri(result.assets[0].uri);
      await updateProfile({ avatarUrl: dataUri });
    } catch (e) {
      Alert.alert(t.authError, e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    setSheetOpen(false);
    setBusy(true);
    try {
      await updateProfile({ avatarUrl: null });
    } catch (e) {
      Alert.alert(t.authError, e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const genderLabel: Record<string, string> = {
    male: t.genderMale,
    female: t.genderFemale,
    other: t.genderOther,
  };
  const eduLabel: Record<string, string> = {
    below_10th: t.eduBelow10th,
    '10th': t.edu10th,
    '12th': t.edu12th,
    iti_diploma: t.eduIti,
    undergrad: t.eduUndergrad,
    postgrad: t.eduPostgrad,
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Txt variant="title">{t.profileTitle}</Txt>
      </View>

      <View style={styles.body}>
        <View style={styles.identity}>
          <Pressable
            onPress={() => token && setSheetOpen(true)}
            disabled={!token || busy}
            style={[styles.avatar, { backgroundColor: c.primarySoft }]}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <BrandMark size={34} />
            )}
            {busy ? (
              <View style={[styles.avatarOverlay, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              token && (
                <View style={[styles.editBadge, { backgroundColor: c.primary, borderColor: c.surface }]}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              )
            )}
          </Pressable>
          <Txt variant="h2" style={{ marginTop: 10 }}>
            {user?.name?.trim() || guestProfile?.name?.trim() || t.guestLabel}
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

        {token && !user?.onboarded && (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="sparkles" size={20} color={c.primary} />
            <Txt variant="body" tone="dim" style={{ flex: 1 }}>
              {t.onboardIntroBody}
            </Txt>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={c.primary}
              onPress={() => router.push('/onboarding')}
              suppressHighlighting
            />
          </Card>
        )}

        <Card style={{ gap: 2 }} padded={false}>
          <Row icon="language" label={t.languageLabel} value={langNative} onPress={() => router.push('/language')} />
          {user?.phone && <Row icon="call" label={t.phoneLabel} value={user.phone} />}
          {prof?.gender && <Row icon="male-female" label={t.genderQuestion} value={genderLabel[prof.gender] ?? prof.gender} />}
          {prof?.age != null && <Row icon="calendar" label={t.ageQuestion} value={`${prof.age} ${t.yearsSuffix}`} />}
          {prof?.education && (
            <Row icon="school" label={t.eduQuestion} value={eduLabel[prof.education] ?? prof.education} />
          )}
        </Card>

        {token ? (
          <Button label={t.logout} variant="danger" icon="log-out-outline" onPress={logout} />
        ) : (
          <Button label={t.createAccount} icon="person-add" onPress={() => router.push('/auth')} />
        )}
      </View>

      <Modal visible={sheetOpen} transparent animationType="fade" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheetOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={() => {}}>
            <Txt variant="label" tone="dim" center style={{ marginBottom: 10 }}>
              {t.photoSheetTitle}
            </Txt>
            <SheetRow icon="camera" label={t.takePhoto} onPress={() => pickFrom('camera')} />
            <SheetRow icon="images" label={t.chooseFromLibrary} onPress={() => pickFrom('library')} />
            {user?.avatarUrl && (
              <SheetRow icon="trash" label={t.removePhoto} tone="danger" onPress={removePhoto} />
            )}
            <SheetRow icon="close" label={t.cancel} onPress={() => setSheetOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function SheetRow({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: 'danger';
  onPress: () => void;
}) {
  const { c } = useTheme();
  const color = tone === 'danger' ? c.danger : c.text;
  return (
    <Pressable onPress={onPress} style={[styles.sheetRow, { borderColor: c.border }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Txt variant="bodyLg" style={{ color, flex: 1 }}>
        {label}
      </Txt>
    </Pressable>
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
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 14, paddingBottom: 28, paddingHorizontal: 8 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
});
