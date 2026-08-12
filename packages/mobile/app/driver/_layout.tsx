import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useDriverAuthStore } from '@/store/driver-auth.store';

export default function DriverLayout() {
  const { user, token, isLoading, restoreSession } = useDriverAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (isLoading) return;
    const isLogin = segments[segments.length - 1] === 'login';
    if (!token) {
      if (!isLogin) router.replace('/driver/login');
    } else if (user && user.role !== 'DRIVER') {
      // Block non-driver accounts
      router.replace('/driver/login');
    } else if (token && isLogin) {
      router.replace('/driver');
    }
  }, [token, user, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0F0F0F] items-center justify-center">
        <ActivityIndicator size="large" color="#B8C438" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="index" />
    </Stack>
  );
}
