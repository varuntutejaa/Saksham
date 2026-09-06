import { Stack } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function OnboardingLayout() {
  // Guests (no token) go through voice profiling too — their answers are kept
  // on-device (see useStore().guestProfile), so a returning guest is greeted
  // by name instead of re-answering every question.
  const { ready } = useAuth();
  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    />
  );
}
