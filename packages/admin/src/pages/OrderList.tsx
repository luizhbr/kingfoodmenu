import { useState, useEffect, useCallback } from 'react';
import OrderCard from '../components/OrderCard.js';

interface Order {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  subtotal: number;
  total: number;
  createdAt: string;
  scheduledAt: string | null;
  customer: { id: string; name: string; email: string } | null;
  location: { id: string; name: string };
  _count: { items: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const token = localStorage.getItem('token') || '';

  const loadOrders = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter) params.set('orderType', typeFilter);

    fetch(`/api/orders?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao carregar pedidos');
        return res.json();
      })
      .then((data) => {
        setOrders(data.data);
        setPagination(data.pagination);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, statusFilter, typeFilter, token]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Atualização otimista pós-ação — refetch da lista para sincronizar status
  const handleStatusChange = useCallback((_orderId: string, _newStatus: string) => {
    loadOrders();
  }, [loadOrders]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
        {pagination && (
          <span className="text-sm text-gray-500">{pagination.total} pedido{pagination.total !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          aria-label="Filtrar por status"
        >
          <option value="">Todos os status</option>
          <option value="PENDING">Pendente</option>
          <option value="CONFIRMED">Confirmado</option>
          <option value="PREPARING">Em preparo</option>
          <option value="READY">Pronto</option>
          <option value="OUT_FOR_DELIVERY">Em entrega</option>
          <option value="DELIVERED">Entregue</option>
          <option value="PICKED_UP">Retirado</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          aria-label="Filtrar por tipo de pedido"
        >
          <option value="">Todos os tipos</option>
          <option value="DELIVERY">Entrega</option>
          <option value="PICKUP">Retirada</option>
        </select>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" role="status" aria-label="Carregando" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error}</div>
      )}

      {!loading && !error && orders.length === 0 && (
        <p className="text-gray-500 text-center py-12">Nenhum pedido encontrado.</p>
      )}

      {!loading && orders.length > 0 && (
        <>
          {/* Grid de cards — mobile-first, expande no tablet/desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                token={token}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >Anterior</button>
              <span className="text-sm text-gray-600">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >Próximo</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
