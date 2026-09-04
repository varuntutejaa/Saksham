import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function OnboardingLayout() {
  const { ready, token } = useAuth();
  if (!ready) return null;
  if (!token) return <Redirect href="/auth" />;

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
