import { Stack } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function OnboardingLayout() {
  // Guests (no token) go through voice profiling too — their answers are kept
  // locally for the session (see useStore().guestProfile).
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
