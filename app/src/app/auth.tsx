import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { UI_STRINGS } from '@/constants/languages';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { BrandMark, Button, Screen, Txt } from '@/ui';

type Tab = 'login' | 'signup';

export default function AuthScreen() {
  const { language } = useStore();
  const { token, user, login, register } = useAuth();
  const { c, radius } = useTheme();
  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;

  const [tab, setTab] = useState<Tab>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!language) return <Redirect href="/language" />;
  // once signed in, send new/incomplete profiles through onboarding once —
  // handled here (not with an imperative router call in submit()) so it can
  // never race the login/register state update.
  if (token) return <Redirect href={user?.onboarded ? '/main' : '/onboarding/voice-profile'} />;

  async function submit() {
    setError(null);
    if (phone.trim().length < 6 || password.length < 4) {
      setError(t.authError);
      return;
    }
    setBusy(true);
    try {
      if (tab === 'login') {
        await login(phone.trim(), password);
      } else {
        await register({ phone: phone.trim(), password, name: name.trim() || undefined, language: language! });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t.authError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.top}>
          <Pressable
            onPress={() => router.replace('/language')}
            hitSlop={12}
            style={[styles.iconBtn, { backgroundColor: c.surfaceAlt }]}>
            <Txt variant="h2">‹</Txt>
          </Pressable>
          <Pressable onPress={() => router.replace('/onboarding/voice-profile')} hitSlop={8}>
            <Txt variant="label" tone="primary">
              {t.continueGuest}
            </Txt>
          </Pressable>
        </View>

        <Animated.View entering={FadeInDown.duration(400)} style={styles.body}>
          <BrandMark size={64} />
          <Txt variant="title" center style={{ marginTop: 14 }}>
            {t.welcomeTitle}
          </Txt>

          {/* tabs */}
          <View style={[styles.tabs, { backgroundColor: c.surfaceAlt }]}>
            {(['login', 'signup'] as Tab[]).map((tb) => (
              <Pressable
                key={tb}
                onPress={() => {
                  setTab(tb);
                  setError(null);
                }}
                style={[
                  styles.tabBtn,
                  { borderRadius: radius.md },
                  tab === tb && { backgroundColor: c.surface },
                ]}>
                <Txt variant="label" tone={tab === tb ? 'primary' : 'dim'}>
                  {tb === 'login' ? t.loginTab : t.signupTab}
                </Txt>
              </Pressable>
            ))}
          </View>

          <View style={styles.form}>
            {tab === 'signup' && (
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t.namePlaceholder}
                placeholderTextColor={c.textFaint}
                style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
              />
            )}
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder={t.phonePlaceholder}
              placeholderTextColor={c.textFaint}
              keyboardType="phone-pad"
              style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t.passwordPlaceholder}
              placeholderTextColor={c.textFaint}
              secureTextEntry
              style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
            />

            {error && (
              <Txt variant="caption" tone="danger">
                {error}
              </Txt>
            )}

            <Button
              label={tab === 'login' ? t.loginBtn : t.signupBtn}
              onPress={submit}
              loading={busy}
              variant="green"
              style={{ marginTop: 6 }}
            />

            {tab === 'login' && (
              <Pressable
                onPress={() => router.push({ pathname: '/forgot-password', params: { phone } })}
                hitSlop={8}
                style={{ alignSelf: 'center', marginTop: 4 }}>
                <Txt variant="label" tone="primary">
                  {t.forgotPassword}
                </Txt>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 20, alignItems: 'center' },
  logo: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', borderRadius: 16, padding: 4, marginTop: 24, alignSelf: 'stretch' },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  form: { alignSelf: 'stretch', marginTop: 22, gap: 12 },
  input: { height: 54, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 16 },
});
