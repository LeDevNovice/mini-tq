import { describe, expect, test } from 'vitest';

import { Subscribable } from '../src/subscribable';

class NumberBus extends Subscribable<number> {
  public errors: unknown[] = [];

  emit(n: number): void {
    this.notify(n);
  }

  protected override onNotifyError(error: unknown): void {
    this.errors.push(error);
  }
}

describe('Subscribable', () => {
  test('subscribes and unsubscribes with stable counts', () => {
    const bus = new NumberBus();

    expect(bus.listenerCount).toBe(0);

    const off = bus.subscribe(() => { });
    expect(bus.listenerCount).toBe(1);

    off();
    expect(bus.listenerCount).toBe(0);

    off();
    expect(bus.listenerCount).toBe(0);
  });

  test('batches multiple notify calls in the same microtask to one delivery', async () => {
    const bus = new NumberBus();
    const received: number[] = [];

    bus.subscribe((v) => received.push(v));

    bus.emit(1);
    bus.emit(2);
    bus.emit(3);

    expect(received).toEqual([]);

    await Promise.resolve();

    expect(received).toEqual([3]);
  });

  test('delivers multiple times across microtasks', async () => {
    const bus = new NumberBus();
    const received: number[] = [];

    bus.subscribe((v) => received.push(v));

    bus.emit(10);
    await Promise.resolve();
    bus.emit(20);
    await Promise.resolve();
    bus.emit(30);
    await Promise.resolve();

    expect(received).toEqual([10, 20, 30]);
  });

  test('multiple subscribers are all called in subscription order', async () => {
    const bus = new NumberBus();
    const calls: Array<{ id: string; value: number }> = [];

    bus.subscribe((v) => calls.push({ id: 'A', value: v }));
    bus.subscribe((v) => calls.push({ id: 'B', value: v }));

    bus.emit(7);
    await Promise.resolve();

    expect(calls).toEqual([
      { id: 'A', value: 7 },
      { id: 'B', value: 7 },
    ]);
  });

  test('a throwing subscriber does not prevent others from running and error is captured', async () => {
    const bus = new NumberBus();
    const calls: number[] = [];

    bus.subscribe(() => {
      throw new Error('boom');
    });
    bus.subscribe((v) => calls.push(v));

    bus.emit(42);
    await Promise.resolve();

    expect(calls).toEqual([42]);
    expect(bus.errors).toHaveLength(1);
    expect((bus.errors[0] as Error).message).toBe('boom');
  });

  test('unsubscribe during notification does not break iteration', async () => {
    const bus = new NumberBus();
    const calls: string[] = [];

    const offA = bus.subscribe((v) => {
      calls.push(`A:${v}`);
      offA();
    });

    bus.subscribe((v) => calls.push(`B:${v}`));

    bus.emit(99);
    bus.emit(100);
    await Promise.resolve();

    expect(calls).toEqual(['A:100', 'B:100']);

    bus.emit(101);
    await Promise.resolve();

    expect(calls).toEqual(['A:100', 'B:100', 'B:101']);
  });
});
