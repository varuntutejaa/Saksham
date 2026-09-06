import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { UI_STRINGS } from '@/constants/languages';
import { requestSignupOtp } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { BrandMark, Button, Screen, Txt } from '@/ui';

type Tab = 'login' | 'signup';

export default function AuthScreen() {
  const { language } = useStore();
  const { token, user, login, register } = useAuth();
  const { c, radius, elevation } = useTheme();
  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;

  const [tab, setTab] = useState<Tab>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Signing up is two steps: details -> a code texted to the phone. The phone
  // is how a beneficiary is contacted about a training place, so it is
  // verified before the account exists.
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchTab(next: Tab) {
    setTab(next);
    setError(null);
    setOtpSent(false);
    setOtp('');
    setDevOtp(null);
    setConfirmPassword('');
  }

  if (!language) return <Redirect href="/language" />;
  // Let beneficiaries describe their work first; profile questions now happen
  // after skill capture so the experience feels contextual.
  if (token) return <Redirect href="/main/speak" />;

  async function submit() {
    setError(null);
    if (phone.trim().length < 6 || password.length < 4) {
      setError(t.authError);
      return;
    }
    if (tab === 'signup' && !otpSent && password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }
    if (tab === 'signup' && otpSent && otp.trim().length !== 4) {
      setError(t.otpLengthError);
      return;
    }
    setBusy(true);
    try {
      if (tab === 'login') {
        await login(phone.trim(), password);
      } else if (!otpSent) {
        // step 1: ask the server to text a code to this number
        const res = await requestSignupOtp(phone.trim());
        setDevOtp(res.devOtp ?? null);
        setOtpSent(true);
      } else {
        // step 2: the code proves the phone is theirs
        await register({
          phone: phone.trim(),
          password,
          name: name.trim() || undefined,
          language: language!,
          otp: otp.trim(),
        });
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
          <Pressable onPress={() => router.replace('/main/speak')} hitSlop={8}>
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
                onPress={() => switchTab(tb)}
                style={[
                  styles.tabBtn,
                  { borderRadius: radius.md },
                  tab === tb && [{ backgroundColor: c.surface }, elevation('card')],
                ]}>
                <Txt variant="label" tone={tab === tb ? 'primary' : 'dim'}>
                  {tb === 'login' ? t.loginTab : t.signupTab}
                </Txt>
              </Pressable>
            ))}
          </View>

          <View style={styles.form}>
            {tab === 'signup' && !otpSent && (
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t.namePlaceholder}
                placeholderTextColor={c.textFaint}
                style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text, borderRadius: radius.lg }]}
              />
            )}
            {!otpSent && (
              <>
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
              </>
            )}

            {/* confirm the password only when setting one, i.e. signing up */}
            {tab === 'signup' && !otpSent && (
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t.confirmPasswordPlaceholder}
                placeholderTextColor={c.textFaint}
                secureTextEntry
                style={[
                  styles.input,
                  {
                    backgroundColor: c.surface,
                    // flag a mismatch as they type, not only on submit
                    borderColor: confirmPassword.length > 0 && confirmPassword !== password ? c.danger : c.border,
                    color: c.text,
                  },
                ]}
              />
            )}

            {/* step 2: the code we texted to that number */}
            {tab === 'signup' && otpSent && (
              <>
                <Txt variant="body" tone="dim">
                  {t.otpSentTo.replace('{phone}', phone.trim())}
                </Txt>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder={t.otpPlaceholder}
                  placeholderTextColor={c.textFaint}
                  keyboardType="number-pad"
                  maxLength={4}
                  autoFocus
                  style={[
                    styles.input,
                    { backgroundColor: c.surface, borderColor: c.border, color: c.text, letterSpacing: 6, textAlign: 'center' },
                  ]}
                />
                {/* no SMS provider configured — surface the code so the flow is usable */}
                {devOtp && (
                  <Txt variant="caption" tone="faint">
                    {t.devOtpNotice.replace('{otp}', devOtp)}
                  </Txt>
                )}
              </>
            )}

            {error && (
              <Txt variant="caption" tone="danger">
                {error}
              </Txt>
            )}

            <Button
              label={tab === 'login' ? t.loginBtn : otpSent ? t.signupBtn : t.sendOtp}
              onPress={submit}
              loading={busy}
              variant="green"
              style={{ marginTop: 6 }}
            />

            {tab === 'signup' && otpSent && (
              <Pressable onPress={() => switchTab('signup')} hitSlop={8} style={{ alignSelf: 'center' }}>
                <Txt variant="label" tone="primary">
                  {t.changeNumber}
                </Txt>
              </Pressable>
            )}

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
  body: { flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  logo: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', borderRadius: 16, padding: 4, marginTop: 24, alignSelf: 'stretch' },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  form: { alignSelf: 'stretch', marginTop: 22, gap: 12 },
  input: { height: 54, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 16 },
});
