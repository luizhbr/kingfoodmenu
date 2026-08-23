import { describe, it, expect } from 'vitest';
import { isPointInPolygon } from '../../lib/geo.js';

describe('isPointInPolygon', () => {
  // Contrato: cada par do polígono é [lat, lng] (conforme JSDoc e todos os consumidores).
  // O bug original interpretava como [lng, lat] — os testes abaixo fixam o contrato correto.

  describe('retângulo assimétrico [lat, lng]', () => {
    // lat 0-1, lng 10-11 (assimétrico para detectar inversão lat/lng)
    const poly: [number, number][] = [[0, 10], [0, 11], [1, 11], [1, 10]];

    it('ponto central dentro → true', () => {
      expect(isPointInPolygon(0.5, 10.5, poly)).toBe(true);
    });

    it('ponto fora (lat grande) → false', () => {
      expect(isPointInPolygon(5, 10.5, poly)).toBe(false);
    });

    it('ponto fora (lng grande) → false', () => {
      expect(isPointInPolygon(0.5, 20, poly)).toBe(false);
    });

    it('ponto fora (ambos) → false', () => {
      expect(isPointInPolygon(5, 5, poly)).toBe(false);
    });
  });

  describe('quadrado simétrico [lat, lng]', () => {
    const sq: [number, number][] = [[0, 0], [0, 1], [1, 1], [1, 0]];

    it('centro → true', () => {
      expect(isPointInPolygon(0.5, 0.5, sq)).toBe(true);
    });

    it('fora → false', () => {
      expect(isPointInPolygon(2, 2, sq)).toBe(false);
    });
  });

  describe('triângulo [lat, lng]', () => {
    const tri: [number, number][] = [[0, 0], [0, 10], [5, 5]];

    it('dentro → true', () => {
      expect(isPointInPolygon(2, 5, tri)).toBe(true);
    });

    it('fora → false', () => {
      expect(isPointInPolygon(10, 5, tri)).toBe(false);
    });
  });

  describe('coordenadas reais (Columbus, OH)', () => {
    // Approx: lat 39.9-40.1, lng -83.1 to -82.9
    const zone: [number, number][] = [
      [39.95, -83.10],
      [39.95, -82.90],
      [40.05, -82.90],
      [40.05, -83.10],
    ];

    it('centro de Columbus dentro → true', () => {
      expect(isPointInPolygon(40.0, -83.0, zone)).toBe(true);
    });

    it('longe (Nova York) → false', () => {
      expect(isPointInPolygon(40.71, -74.0, zone)).toBe(false);
    });
  });

  describe('polígono aberto vs fechado', () => {
    // O algoritmo conecta o último ao primeiro ponto automaticamente.
    const openPoly: [number, number][] = [[0, 0], [0, 10], [10, 10], [10, 0]];

    it('polígono sem repetir primeiro ponto → funciona', () => {
      expect(isPointInPolygon(5, 5, openPoly)).toBe(true);
    });
  });
});
