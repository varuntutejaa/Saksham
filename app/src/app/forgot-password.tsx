import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { UI_STRINGS } from '@/constants/languages';
import { forgotPassword } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { Button, Card, Screen, Txt } from '@/ui';

type Step = 'phone' | 'reset';

export default function ForgotPasswordScreen() {
  const { language } = useStore();
  const { token, resetPassword } = useAuth();
  const { c } = useTheme();
  const params = useLocalSearchParams<{ phone?: string }>();
  const t = language ? UI_STRINGS[language] : UI_STRINGS.hi;

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState(params.phone ?? '');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!language) return <Redirect href="/language" />;
  if (token) return <Redirect href="/main" />;

  async function sendCode() {
    setError(null);
    if (phone.trim().length < 6) {
      setError(t.authError);
      return;
    }
    setBusy(true);
    try {
      const res = await forgotPassword(phone.trim());
      setDevOtp(res.devOtp ?? null);
      setStep('reset');
    } catch (e) {
      setError(e instanceof Error ? e.message : t.authError);
    } finally {
      setBusy(false);
    }
  }

  async function submitReset() {
    setError(null);
    if (otp.trim().length !== 4) {
      setError(t.invalidOtp);
      return;
    }
    if (newPassword.length < 4) {
      setError(t.authError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }
    setBusy(true);
    try {
      await resetPassword(phone.trim(), otp.trim(), newPassword);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.authError);
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Redirect href="/main" />;

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.top}>
          <Pressable
            onPress={() => (step === 'reset' ? setStep('phone') : router.back())}
            hitSlop={12}
            style={[styles.iconBtn, { backgroundColor: c.surfaceAlt }]}>
            <Ionicons name="arrow-back" size={20} color={c.text} />
          </Pressable>
        </View>

        <Animated.View entering={FadeInDown.duration(350)} style={styles.body}>
          <View style={[styles.iconBadge, { backgroundColor: c.primarySoft }]}>
            <Ionicons name="key-outline" size={28} color={c.primary} />
          </View>
          <Txt variant="title" center style={{ marginTop: 16 }}>
            {t.forgotPasswordTitle}
          </Txt>
          <Txt variant="body" tone="dim" center style={{ marginTop: 8 }}>
            {step === 'phone' ? t.forgotPasswordBody : t.otpSentNotice}
          </Txt>

          <View style={styles.form}>
            {step === 'phone' ? (
              <>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={t.phonePlaceholder}
                  placeholderTextColor={c.textFaint}
                  keyboardType="phone-pad"
                  autoFocus
                  style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
                />
                {error && (
                  <Txt variant="caption" tone="danger">
                    {error}
                  </Txt>
                )}
                <Button label={t.sendOtp} onPress={sendCode} loading={busy} variant="green" style={{ marginTop: 6 }} />
              </>
            ) : (
              <>
                {devOtp && (
                  <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="information-circle" size={20} color={c.warn} />
                    <Txt variant="body" style={{ flex: 1 }}>
                      {t.devOtpNotice.replace('{otp}', devOtp)}
                    </Txt>
                  </Card>
                )}
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder={t.otpPlaceholder}
                  placeholderTextColor={c.textFaint}
                  keyboardType="number-pad"
                  maxLength={4}
                  autoFocus
                  style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
                />
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t.newPasswordPlaceholder}
                  placeholderTextColor={c.textFaint}
                  secureTextEntry
                  style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
                />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t.confirmPasswordPlaceholder}
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
                  label={t.resetPasswordBtn}
                  onPress={submitReset}
                  loading={busy}
                  variant="green"
                  style={{ marginTop: 6 }}
                />
                <Button label={t.sendOtp} onPress={sendCode} loading={busy} variant="ghost" size="md" />
              </>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingTop: 4 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 12, alignItems: 'center' },
  iconBadge: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  form: { alignSelf: 'stretch', marginTop: 24, gap: 12 },
  input: { height: 54, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 16 },
});
