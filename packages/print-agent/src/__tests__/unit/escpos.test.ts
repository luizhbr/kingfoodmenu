import { describe, it, expect } from 'vitest';
import { buildEscposBuffer, initPrinter, cut, feed, columnsFor, encodeLine } from '../../escpos.js';

describe('escpos builder', () => {
  it('starts with ESC @ init', () => {
    const buf = buildEscposBuffer('KING FOOD\n', { paperWidth: 80 });
    expect(buf[0]).toBe(0x1b);
    expect(buf[1]).toBe(0x40);
  });

  it('ends with feed + cut', () => {
    const buf = buildEscposBuffer('x\n', { paperWidth: 80 });
    const last = buf[buf.length - 1];
    const secondLast = buf[buf.length - 2];
    // GS V 0 = 0x1d 0x56 0x00
    expect(buf[buf.length - 3]).toBe(0x1d);
    expect(buf[buf.length - 2]).toBe(0x56);
    expect(buf[buf.length - 1]).toBe(0x00);
    expect(secondLast).toBe(0x56);
    expect(last).toBe(0x00);
  });

  it('encodes PT-BR accents with cp850', () => {
    const line = encodeLine('Açaí com pão de queijo');
    const text = line.toString('latin1');
    expect(text).toContain('A');
    expect(line.length).toBeGreaterThan(10);
  });

  it('columnsFor: 80mm=48, 58mm=32', () => {
    expect(columnsFor(80)).toBe(48);
    expect(columnsFor(58)).toBe(32);
  });

  it('init/cut/feed produce expected bytes', () => {
    expect(initPrinter()).toEqual(Buffer.from([0x1b, 0x40]));
    expect(cut()).toEqual(Buffer.from([0x1d, 0x56, 0x00]));
    expect(feed(3)).toEqual(Buffer.from([0x1b, 0x64, 3]));
  });
});
