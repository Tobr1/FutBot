/**
 * Las K mejores particiones DISTINTAS: una candidata entra si difiere en al menos `minDiff`
 * jugadores de todas las que ya están con costo menor o igual (selección codiciosa por costo).
 * Si una nueva es mejor que otras parecidas, las desplaza. La mejor de todas nunca se descarta.
 */
export class TopK<T> {
  private readonly items: Array<{ key: T; cost: number }> = [];

  constructor(
    private readonly k: number,
    private readonly minDiff: number,
    /** Jugadores que hay que mover para pasar de una partición a la otra (0 = la misma). */
    private readonly distance: (a: T, b: T) => number,
    private readonly clone: (key: T) => T = (key) => key,
  ) {}

  /** Costo que hay que mejorar para entrar. */
  get threshold(): number {
    return this.items.length < this.k ? Infinity : this.items[this.items.length - 1].cost;
  }

  offer(key: T, cost: number): boolean {
    if (!(cost < this.threshold)) return false;
    let displaced: number[] | null = null;
    for (let idx = 0; idx < this.items.length; idx++) {
      const item = this.items[idx];
      if (this.distance(item.key, key) >= this.minDiff) continue;
      if (item.cost <= cost) return false;
      (displaced ??= []).push(idx);
    }
    if (displaced) for (let d = displaced.length - 1; d >= 0; d--) this.items.splice(displaced[d], 1);
    let pos = this.items.length;
    while (pos > 0 && this.items[pos - 1].cost > cost) pos--;
    this.items.splice(pos, 0, { key: this.clone(key), cost });
    if (this.items.length > this.k) this.items.pop();
    return true;
  }

  result(): ReadonlyArray<{ key: T; cost: number }> {
    return this.items;
  }
}

/** Cantidad de bits en 1 de un entero de 32 bits. */
export function popcount(x: number): number {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return Math.imul((x + (x >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24;
}
