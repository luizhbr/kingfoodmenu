import { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useDriverAuthStore } from '@/store/driver-auth.store';
import { StatusBar } from 'expo-status-bar';

export default function DriverLogin() {
  const router = useRouter();
  const login = useDriverAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Informe e-mail e senha');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
      router.replace('/driver');
    } catch (e: any) {
      setError(e?.message || 'Falha no login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-[#1A1A1A]">
      <StatusBar style="light" />
      <View className="flex-1 justify-center px-6">
        <Text className="text-[#B8C438] text-4xl font-extrabold text-center mb-1">KING FOOD</Text>
        <Text className="text-[#E2DDCF] text-base text-center mb-8">Entregador</Text>

        <View className="bg-white/10 rounded-2xl p-5 space-y-4">
          <TextInput
            placeholder="E-mail"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            className="bg-white rounded-xl px-4 py-3 text-base text-[#1A1A1A]"
          />
          <TextInput
            placeholder="Senha"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            className="bg-white rounded-xl px-4 py-3 text-base text-[#1A1A1A]"
          />

          {error ? <Text className="text-red-400 text-sm text-center">{error}</Text> : null}

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            className="bg-[#B8C438] rounded-xl py-3.5 items-center disabled:opacity-50"
          >
            {loading ? (
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <Text className="text-[#1A1A1A] font-bold text-lg">Entrar</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
