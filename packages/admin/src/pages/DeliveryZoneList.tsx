import { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

interface DeliveryZone {
  id: string;
  name: string;
  charge: number;
  minOrder: number;
  boundaries: [number, number][] | null;
  isActive: boolean;
}

interface LocationData {
  id: string;
  name: string;
  lat?: number | null;
  lng?: number | null;
}

/** Valida a estrutura do polígono: array de pares [lat, lng] (contrato do sistema). */
function parseBoundaries(json: string): { value: [number, number][] | null; error: string } {
  const trimmed = json.trim();
  if (!trimmed) return { value: null, error: '' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { value: null, error: 'JSON inválido para boundaries.' };
  }
  if (!Array.isArray(parsed) || parsed.length < 3) {
    return { value: null, error: 'Boundaries deve ser um array com pelo menos 3 pares [lat, lng].' };
  }
  for (const pair of parsed) {
    if (
      !Array.isArray(pair) || pair.length !== 2 ||
      typeof pair[0] !== 'number' || typeof pair[1] !== 'number' ||
      !Number.isFinite(pair[0]) || !Number.isFinite(pair[1]) ||
      pair[0] < -90 || pair[0] > 90 || pair[1] < -180 || pair[1] > 180
    ) {
      return { value: null, error: 'Cada par deve ser [lat, lng] numérico (lat -90..90, lng -180..180).' };
    }
  }
  return { value: parsed as [number, number][], error: '' };
}

function formatBoundaries(boundaries: unknown): string {
  if (!boundaries) return '';
  try {
    return JSON.stringify(boundaries, null, 2);
  } catch {
    return '';
  }
}

/** Arredonda coordenada para 6 casas (~11cm) — evita ruído de float do Maps. */
function roundCoord(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

export default function DeliveryZoneList() {
  const { locationId } = useParams<{ locationId: string }>();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New/Edit zone form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Ref espelhado: elimina race entre openEdit/setEditingId e o submit (closure
  // sempre lê o id mais recente, mesmo com cliques rápidos).
  const editingIdRef = useRef<string | null>(null);
  const setEditingIdSafe = (id: string | null) => {
    editingIdRef.current = id;
    setEditingId(id);
  };
  const [name, setName] = useState('');
  const [charge, setCharge] = useState('0');
  const [minOrder, setMinOrder] = useState('0');
  const [boundariesJson, setBoundariesJson] = useState('');
  const [saving, setSaving] = useState(false);

  // Google Maps editor state
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const zonePolysRef = useRef<google.maps.Polygon[]>([]);
  const storeMarkerRef = useRef<google.maps.Marker | null>(null);
  const isDrawingRef = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [vertices, setVertices] = useState<[number, number][]>([]);

  const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const hasGoogleMaps = !!googleMapsKey && !mapError && mapLoaded;

  // Carrega zonas + location (lat/lng para centrar o mapa)
  useEffect(() => {
    if (!locationId) return;
    Promise.all([
      api.get<{ data: DeliveryZone[] }>(`/locations/${locationId}/delivery-zones`),
      api.get<{ data: LocationData }>(`/locations/${locationId}`),
    ])
      .then(([zonesRes, locRes]) => {
        setZones(zonesRes.data);
        setLocation(locRes.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [locationId]);

  // Carrega a biblioteca Maps (mesma chave VITE_GOOGLE_MAPS_API_KEY do storefront)
  useEffect(() => {
    if (!googleMapsKey) return;
    let active = true;
    setOptions({ key: googleMapsKey });
    importLibrary('maps')
      .then(() => { if (active) setMapLoaded(true); })
      .catch((err: unknown) => {
        if (active) setMapError(err instanceof Error ? err.message : String(err));
      });
    return () => { active = false; };
  }, [googleMapsKey]);

  // Inicializa o mapa e desenha as zonas existentes
  useEffect(() => {
    if (!hasGoogleMaps || !showForm || !mapDivRef.current) return;
    const center = location?.lat != null && location?.lng != null
      ? { lat: location.lat, lng: location.lng }
      : { lat: 39.9612, lng: -82.9988 }; // Columbus, OH padrão
    const map = new google.maps.Map(mapDivRef.current, {
      center,
      zoom: location?.lat != null ? 13 : 11,
      mapTypeControl: true,
      streetViewControl: false,
    });
    mapRef.current = map;

    // Marcador da loja (referência visual para desenhar as zonas)
    if (storeMarkerRef.current) storeMarkerRef.current.setMap(null);
    if (location?.lat != null && location?.lng != null) {
      storeMarkerRef.current = new google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map,
        title: location.name || 'Loja',
        label: { text: '🏪', fontSize: '18px' },
        zIndex: 1000,
      });
    }

    // Zonas existentes (preview azul)
    zonePolysRef.current.forEach((p) => p.setMap(null));
    zonePolysRef.current = [];
    for (const zone of zones) {
      if (!zone.boundaries || !Array.isArray(zone.boundaries) || zone.boundaries.length < 3) continue;
      const poly = new google.maps.Polygon({
        paths: zone.boundaries.map(([la, ln]) => ({ lat: la, lng: ln })),
        strokeColor: '#2563eb',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        map,
      });
      zonePolysRef.current.push(poly);
    }

    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!isDrawingRef.current || !e.latLng) return;
      setVertices((prev) => [...prev, [roundCoord(e.latLng!.lat()), roundCoord(e.latLng!.lng())]]);
    });

    setMapReady(true);
    return () => {
      zonePolysRef.current.forEach((poly) => poly.setMap(null));
      zonePolysRef.current = [];
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      if (storeMarkerRef.current) { storeMarkerRef.current.setMap(null); storeMarkerRef.current = null; }
      if (polygonRef.current) { polygonRef.current.setMap(null); polygonRef.current = null; }
      mapRef.current = null;
      setMapReady(false);
    };
    // zones/location mudam após fetch ou save; showForm monta o div do mapa
  }, [hasGoogleMaps, zones, location, showForm]);

  useEffect(() => {
    isDrawingRef.current = showForm;
  }, [showForm]);

  // Renderiza o polígono de edição + pinos arrastáveis
  useEffect(() => {
    if (!hasGoogleMaps || !mapReady || !mapRef.current) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (polygonRef.current) { polygonRef.current.setMap(null); polygonRef.current = null; }

    if (vertices.length === 0) return;
    const pts = vertices.map((v) => ({ lat: v[0], lng: v[1] }));
    if (vertices.length >= 3) {
      polygonRef.current = new google.maps.Polygon({
        paths: pts,
        strokeColor: '#dc2626',
        strokeOpacity: 1,
        strokeWeight: 2,
        fillColor: '#ef4444',
        fillOpacity: 0.25,
        map: mapRef.current,
      });
    }
    vertices.forEach((v, i) => {
      const marker = new google.maps.Marker({
        position: { lat: v[0], lng: v[1] },
        map: mapRef.current!,
        draggable: true,
        label: String(i + 1),
        title: `Ponto ${i + 1}`,
      });
      marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
        const pos = marker.getPosition();
        if (!pos) return;
        setVertices((prev) => prev.map((vv, idx) =>
          idx === i ? [roundCoord(pos.lat()), roundCoord(pos.lng())] : vv
        ));
      });
      markersRef.current.push(marker);
    });
  }, [vertices, hasGoogleMaps, mapReady]);

  const resetForm = () => {
    setEditingIdSafe(null);
    setName('');
    setCharge('0');
    setMinOrder('0');
    setBoundariesJson('');
    setVertices([]);
  };

  const openCreate = () => {
    if (showForm) resetForm();
    setShowForm(!showForm);
    setError('');
  };

  const openEdit = (zone: DeliveryZone) => {
    setEditingIdSafe(zone.id);
    setName(zone.name);
    setCharge(String(zone.charge));
    setMinOrder(String(zone.minOrder));
    setBoundariesJson(formatBoundaries(zone.boundaries));
    const b = Array.isArray(zone.boundaries)
      ? (zone.boundaries as [number, number][]).filter(
          (pair) => Array.isArray(pair) && pair.length === 2 &&
            Number.isFinite(pair[0]) && Number.isFinite(pair[1])
        )
      : [];
    setVertices(b);
    setShowForm(true);
    setError('');
  };

  // Quando o mapa fica pronto com uma zona em edição, ajusta o zoom ao polígono
  useEffect(() => {
    if (!mapReady || !mapRef.current || !editingId || vertices.length < 1) return;
    const bounds = new google.maps.LatLngBounds();
    vertices.forEach(([la, ln]) => bounds.extend({ lat: la, lng: ln }));
    mapRef.current.fitBounds(bounds);
  }, [mapReady, editingId, vertices]);

  const clearVertices = () => setVertices([]);

  const undoLastVertex = () => setVertices((prev) => prev.slice(0, -1));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Vértices vindos do editor visual OU do JSON (fallback sem Maps)
    let boundaries: [number, number][] | null = null;
    if (hasGoogleMaps) {
      if (vertices.length < 3) {
        setError('Desenhe o polígono no mapa com pelo menos 3 pontos antes de salvar.');
        return;
      }
      boundaries = vertices;
    } else {
      const { value, error: boundaryError } = parseBoundaries(boundariesJson);
      if (boundaryError) {
        setError(boundaryError);
        return;
      }
      boundaries = value;
    }

    // Validação de valores numéricos (rejeita NaN/negativos antes do submit)
    const chargeNum = parseFloat(charge);
    const minOrderNum = parseFloat(minOrder);
    if (isNaN(chargeNum) || chargeNum < 0 || isNaN(minOrderNum) || minOrderNum < 0) {
      setError('Charge e Min Order devem ser números maiores ou iguais a zero.');
      return;
    }

    // Fecha o polígono (GeoJSON: 1º vértice == último) se ainda não fechado
    const normalizedBoundaries = boundaries
      ? (() => {
          const first = boundaries[0];
          const last = boundaries[boundaries.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            return [...boundaries, first];
          }
          return boundaries;
        })()
      : boundaries;

    setSaving(true);
    const currentEditingId = editingIdRef.current; // snapshot estável do id
    try {
      const payload = {
        name,
        charge: chargeNum,
        minOrder: minOrderNum,
        boundaries: normalizedBoundaries,
      };
      if (currentEditingId) {
        const res = await api.patch<{ data: DeliveryZone }>(`/locations/${locationId}/delivery-zones/${currentEditingId}`, payload);
        setZones((prev) => prev.map((z) => (z.id === currentEditingId ? res.data : z)));
      } else {
        const res = await api.post<{ data: DeliveryZone }>(`/locations/${locationId}/delivery-zones`, payload);
        setZones((prev) => [...prev, res.data]);
      }
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar zona de entrega.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (zone: DeliveryZone) => {
    try {
      await api.patch(`/locations/${locationId}/delivery-zones/${zone.id}`, {
        isActive: !zone.isActive,
      });
      setZones((prev) =>
        prev.map((z) => z.id === zone.id ? { ...z, isActive: !z.isActive } : z)
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteZone = async (id: string) => {
    if (!confirm('Delete this delivery zone?')) return;
    try {
      await api.delete(`/locations/${locationId}/delivery-zones/${id}`);
      setZones((prev) => prev.filter((z) => z.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Zonas de entrega</h1>
        <button
          onClick={openCreate}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {showForm ? 'Cancelar' : 'Add Zone'}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{editingId ? `Editar zona: ${name}` : 'Nova zona de entrega'}</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mapa / desenho do polígono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Área no mapa</label>
              {hasGoogleMaps ? (
                <>
                  <div ref={mapDivRef} className="w-full h-80 rounded-lg border border-gray-300" />
                  <p className="text-xs text-gray-500 mt-2">
                    Clique no mapa para adicionar pontos. Arraste os pinos numerados para ajustar. Mínimo de 3 pontos.
                  </p>
                  {vertices.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        type="button"
                        onClick={undoLastVertex}
                        className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Desfazer último ponto
                      </button>
                      <button
                        type="button"
                        onClick={clearVertices}
                        className="text-xs px-3 py-1.5 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                      >
                        Limpar polígono
                      </button>
                      <span className="text-xs text-gray-500 self-center">
                        {vertices.length} ponto{vertices.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <textarea
                    value={boundariesJson}
                    onChange={(e) => setBoundariesJson(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none font-mono"
                    placeholder='[[lat, lng], [lat, lng], [lat, lng]]'
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Google Maps não configurado (VITE_GOOGLE_MAPS_API_KEY). Edite o polígono como JSON: array de pares [lat, lng] com pelo menos 3 vértices.
                  </p>
                </>
              )}
            </div>

            {/* Campos da zona */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zone Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                  placeholder="e.g., Downtown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Charge ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={charge}
                  onChange={(e) => setCharge(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Order ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Create Zone'}
              </button>
            </div>
          </div>
        </form>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" role="status" aria-label="Carregando" />
        </div>
      )}

      {!loading && zones.length === 0 && !showForm && (
        <p className="text-gray-500 text-center py-12">No delivery zones configured.</p>
      )}

      {!loading && zones.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="table-responsive"><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Charge</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Min Order</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr key={zone.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td data-label="Nome" className="px-4 py-3 font-medium text-gray-900">{zone.name}</td>
                  <td data-label="Charge" className="px-4 py-3 text-right">${zone.charge.toFixed(2)}</td>
                  <td data-label="Min Order" className="px-4 py-3 text-right">${zone.minOrder.toFixed(2)}</td>
                  <td data-label="Status" className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(zone)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${zone.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                      aria-label={`${zone.isActive ? 'Deactivate' : 'Activate'} zone ${zone.name}`}
                    >
                      {zone.isActive ? 'Ativo' : 'Inactive'}
                    </button>
                  </td>
                  <td data-label="Ações" className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEdit(zone)}
                      className="text-blue-600 hover:text-blue-700 text-xs font-medium mr-3"
                      aria-label={`Edit zone ${zone.name}`}
                    >Editar</button>
                    <button
                      onClick={() => deleteZone(zone.id)}
                      className="text-red-600 hover:text-red-700 text-xs font-medium"
                      aria-label={`Delete zone ${zone.name}`}
                    >Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}
