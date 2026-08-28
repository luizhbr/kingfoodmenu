/**
 * Lógica de horários/status compartilhada (landing + cardápio).
 * Fuso padrão: America/New_York (Columbus, OH).
 */
export const TZ_DEF = 'America/New_York';

export const DEFAULT_HOURS: { day: number; label: string; hours: string }[] = [
  { day: 0, label: 'Domingo', hours: '6:00 PM – 10:30 PM' },
  { day: 1, label: 'Segunda-feira', hours: '7:00 PM – 10:00 PM' },
  { day: 2, label: 'Terça-feira', hours: 'Fechado' },
  { day: 3, label: 'Quarta-feira', hours: '7:00 PM – 10:00 PM' },
  { day: 4, label: 'Quinta-feira', hours: '7:00 PM – 10:00 PM' },
  { day: 5, label: 'Sexta-feira', hours: 'Fechado' },
  { day: 6, label: 'Sábado', hours: '9:00 PM – 11:00 PM' },
];

export function getHours(settings: any): { day: number; label: string; hours: string }[] {
  return settings?.landingHours?.rows || DEFAULT_HOURS;
}

export type OpenStatus =
  | { open: true; label: string; detail: string }
  | { open: false; label: string; detail: string };

function parseClock(token: string): number | null {
  const m = token.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

export function getColumbusNow(): { day: number; minutes: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ_DEF,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  let hour = parseInt(get('hour'), 10);
  if (Number.isNaN(hour) || hour === 24) hour = 0;
  const minute = parseInt(get('minute'), 10) || 0;
  return { day: dayMap[get('weekday')] ?? new Date().getDay(), minutes: hour * 60 + minute };
}

export function computeOpenStatus(rows?: { day: number; label: string; hours: string }[]): OpenStatus {
  const table = rows || DEFAULT_HOURS;
  const { day, minutes } = getColumbusNow();
  const row = table.find((h) => h.day === day) ?? table[0];
  if (row.hours === 'Fechado') {
    for (let i = 1; i <= 7; i++) {
      const nr = table.find((h) => h.day === (day + i) % 7)!;
      if (nr.hours !== 'Fechado') {
        const start = nr.hours.split('\u2013')[0]?.trim() ?? '';
        return { open: false, label: 'Fechado', detail: i === 1 ? `Abre amanhã ${start}` : `Abre ${nr.label} ${start}` };
      }
    }
    return { open: false, label: 'Fechado', detail: 'Veja horários' };
  }
  const [startTok, endTok] = row.hours.split('\u2013').map((s) => s.trim());
  const start = clampClock(startTok);
  const end = clampClock(endTok);
  if (start == null || end == null) return { open: false, label: 'Horários', detail: row.hours };
  if (minutes >= start && minutes < end) return { open: true, label: 'Aberto agora', detail: `Fecha ${endTok}` };
  if (minutes < start) return { open: false, label: 'Fechado', detail: `Abre ${startTok}` };
  for (let i = 1; i <= 7; i++) {
    const nr = table.find((h) => h.day === (day + i) % 7)!;
    if (nr.hours !== 'Fechado') {
      const ns = nr.hours.split('\u2013')[0]?.trim() ?? '';
      return { open: false, label: 'Fechado', detail: i === 1 ? `Abre amanhã ${ns}` : `Abre ${nr.label} ${ns}` };
    }
  }
  return { open: false, label: 'Fechado', detail: 'Veja horários' };
}

function clampClock(token: string): number | null {
  return parseClock(token);
}
