import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, ActivityIndicator, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useDriverAuthStore } from '@/store/driver-auth.store';
import { driverApi, DriverOrder } from '@/api/driver';
import { ApiError } from '@/api/client';

const STATUS_LABEL: Record<string, string> = {
  READY: 'Pronto para retirada',
  PICKED_UP: 'Retirado',
  OUT_FOR_DELIVERY: 'Em entrega',
  DELIVERED: 'Entregue',
  CONFIRMED: 'Confirmado',
  PENDING: 'Pendente',
};

const STATUS_COLOR: Record<string, string> = {
  READY: '#B8C438',
  PICKED_UP: '#7B6DA8',
  OUT_FOR_DELIVERY: '#E8A13A',
  DELIVERED: '#3FB68B',
  CONFIRMED: '#7B6DA8',
  PENDING: '#9CA3AF',
};

interface OrderCardProps {
  order: DriverOrder;
  variant: 'available' | 'assigned' | 'history';
  onAction: (order: DriverOrder, action: 'accept' | 'pickup' | 'out' | 'delivered') => Promise<void>;
  busy: boolean;
}

function customerName(order: DriverOrder): string {
  return order.guestName || order.customer?.name || 'Cliente';
}

function customerPhone(order: DriverOrder): string | null {
  return order.guestPhone || order.customer?.phone || null;
}

function address(order: DriverOrder): string {
  return order.deliveryFormattedAddress || [order.deliveryLine1, order.deliveryCity, order.deliveryState].filter(Boolean).join(', ') || 'Endereço não informado';
}

function phoneLink(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  return `tel:${digits}`;
}

function mapsLink(order: DriverOrder): string {
  const q = encodeURIComponent(address(order));
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function OrderCard({ order, variant, onAction, busy }: OrderCardProps) {
  const phone = customerPhone(order);
  const st = order.status;
  const isAvailable = variant === 'available';
  const isHistory = variant === 'history';
  const itemCount = order.items ? order.items.reduce((a, i) => a + i.quantity, 0) : order._count?.items ?? 0;
  const itemNames = order.items ? order.items.map((i) => `${i.quantity}x ${i.name}`).join(' · ') : '';

  return (
    <View className="bg-[#1A1A1A] border border-[#333] rounded-2xl p-4 mb-3">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-white font-bold text-base">Pedido {order.orderNumber}</Text>
        <View style={{ backgroundColor: STATUS_COLOR[st] || '#9CA3AF' }} className="rounded-full px-3 py-1">
          <Text className="text-[#1A1A1A] text-xs font-bold">{STATUS_LABEL[st] || st}</Text>
        </View>
      </View>

      {!isAvailable && (
        <Text className="text-[#E2DDCF] mb-1">
          <Text className="font-bold text-white">{customerName(order)}</Text>
          {phone ? `  ·  ${phone}` : ''}
        </Text>
      )}
      <Text className="text-[#E2DDCF] text-sm mb-1">📍 {address(order)}</Text>

      {itemNames ? (
        <Text className="text-[#B8C438] text-sm mb-1" numberOfLines={2}>{itemNames}</Text>
      ) : (
        <Text className="text-[#9CA3AF] text-sm mb-1">{itemCount} item(ns)</Text>
      )}

      {order.comment ? <Text className="text-[#E8A13A] text-xs mb-1">📝 {order.comment}</Text> : null}

      <View className="flex-row gap-2 mt-2">
        {isAvailable && (
          <Pressable
            onPress={() => onAction(order, 'accept')}
            disabled={busy}
            className="flex-1 bg-[#B8C438] rounded-xl py-3 items-center disabled:opacity-50"
          >
            <Text className="text-[#1A1A1A] font-bold">Aceitar entrega</Text>
          </Pressable>
        )}

        {!isAvailable && !isHistory && (
          <>
            {st === 'READY' && (
              <Pressable onPress={() => onAction(order, 'pickup')} disabled={busy} className="flex-1 bg-[#7B6DA8] rounded-xl py-3 items-center disabled:opacity-50">
                <Text className="text-white font-bold">Retirar pedido</Text>
              </Pressable>
            )}
            {st === 'PICKED_UP' && (
              <Pressable onPress={() => onAction(order, 'out')} disabled={busy} className="flex-1 bg-[#E8A13A] rounded-xl py-3 items-center disabled:opacity-50">
                <Text className="text-[#1A1A1A] font-bold">Sair para entrega</Text>
              </Pressable>
            )}
            {st === 'OUT_FOR_DELIVERY' && (
              <Pressable onPress={() => onAction(order, 'delivered')} disabled={busy} className="flex-1 bg-[#3FB68B] rounded-xl py-3 items-center disabled:opacity-50">
                <Text className="text-[#1A1A1A] font-bold">Entregue ✓</Text>
              </Pressable>
            )}
          </>
        )}

        {phone && (
          <Pressable onPress={() => Linking.openURL(phoneLink(phone))} className="bg-[#333] rounded-xl px-4 py-3 items-center">
            <Text className="text-white font-bold">📞</Text>
          </Pressable>
        )}
        {!isAvailable && !isHistory && (
          <Pressable onPress={() => Linking.openURL(mapsLink(order))} className="bg-[#333] rounded-xl px-4 py-3 items-center">
            <Text className="text-white font-bold">🧭</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function DriverDashboard() {
  const router = useRouter();
  const user = useDriverAuthStore((s) => s.user);
  const logout = useDriverAuthStore((s) => s.logout);
  const [tab, setTab] = useState<'available' | 'assigned' | 'history'>('available');
  const [available, setAvailable] = useState<DriverOrder[]>([]);
  const [assigned, setAssigned] = useState<DriverOrder[]>([]);
  const [history, setHistory] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const ordersRes = await driverApi.getOrders();
      setAvailable(ordersRes.data!.available);
      setAssigned(ordersRes.data!.assigned);
      if (tab === 'history') {
        const historyRes = await driverApi.getHistory();
        setHistory(historyRes.data || []);
      }
      setError('');
    } catch (e: any) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        await logout();
        router.replace('/driver/login');
      } else {
        setError('Falha ao carregar pedidos');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, logout, router]);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(() => {
      if (!busy) load();
    }, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load, busy]);

  async function handleAction(order: DriverOrder, action: 'accept' | 'pickup' | 'out' | 'delivered') {
    setBusy(true);
    setError('');
    try {
      switch (action) {
        case 'accept': await driverApi.accept(order.id); break;
        case 'pickup': await driverApi.pickup(order.id); break;
        case 'out': await driverApi.outForDelivery(order.id); break;
        case 'delivered': await driverApi.delivered(order.id); break;
      }
      await load();
    } catch (e: any) {
      if (e instanceof ApiError) {
        if (e.status === 401 || e.status === 403) {
          Alert.alert('Sessão expirada', 'Faça login novamente');
          await logout();
          router.replace('/driver/login');
        } else if (e.status === 404) {
          Alert.alert('Pedido não encontrado', 'Este pedido não está mais disponível');
          await load();
        } else {
          Alert.alert('Transição inválida', e.message || 'Não foi possível atualizar o pedido');
          await load();
        }
      } else {
        Alert.alert('Erro de conexão', 'Verifique sua internet e tente novamente');
      }
    } finally {
      setBusy(false);
    }
  }

  function renderList() {
    if (loading) {
      return <ActivityIndicator size="large" color="#B8C438" className="mt-10" />;
    }
    let data: DriverOrder[] = [];
    let emptyMsg = '';
    if (tab === 'available') { data = available; emptyMsg = 'Nenhum pedido disponível no momento'; }
    else if (tab === 'assigned') { data = assigned; emptyMsg = 'Nenhuma entrega em andamento'; }
    else { data = history; emptyMsg = 'Nenhuma entrega concluída ainda'; }

    return (
      <FlatList
        data={data}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => (
          <OrderCard order={item} variant={tab === 'available' ? 'available' : tab === 'assigned' ? 'assigned' : 'history'} onAction={handleAction} busy={busy} />
        )}
        ListEmptyComponent={<Text className="text-[#9CA3AF] text-center mt-10">{emptyMsg}</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#B8C438" />}
        contentContainerStyle={{ padding: 16 }}
      />
    );
  }

  return (
    <View className="flex-1 bg-[#0F0F0F]">
      <View className="bg-[#1A1A1A] px-4 pt-14 pb-3 border-b border-[#333]">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-[#B8C438] font-extrabold text-xl">KING FOOD</Text>
            <Text className="text-[#E2DDCF] text-sm">Entregador · {user?.name || ''}</Text>
          </View>
          <Pressable onPress={async () => { await logout(); router.replace('/driver/login'); }} className="bg-[#333] rounded-lg px-3 py-2">
            <Text className="text-white text-sm">Sair</Text>
          </Pressable>
        </View>
      </View>

      <View className="flex-row bg-[#1A1A1A] border-b border-[#333]">
        {([
          ['available', `Disponíveis (${available.length})`],
          ['assigned', `Minhas entregas (${assigned.length})`],
          ['history', 'Histórico'],
        ] as const).map(([key, label]) => (
          <Pressable key={key} onPress={() => setTab(key)} className={`flex-1 py-3 items-center ${tab === key ? 'border-b-2 border-[#B8C438]' : ''}`}>
            <Text className={`text-sm ${tab === key ? 'text-[#B8C438] font-bold' : 'text-[#9CA3AF]'}`}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text className="text-red-400 text-sm text-center py-2">{error}</Text> : null}
      {renderList()}
    </View>
  );
}
