// src/core/store.ts — the one typed store (ARCH-09).
// Why a store and not module-to-module calls: chapters, DOM components and the GL layer
// change the same few facts (world, chapter, plan...). Each owns its own DOM and reacts to
// the store, so no module ever reaches into another module's elements.

export type Tier = 'HIGH' | 'MED' | 'LOW';
export type PlanId = '10' | '15' | '20';
export type ChapterId = 'hero' | 'mass' | 'ignite' | 'programs' | 'orbit' | 'gravity' | 'join';

export interface State {
  /** 0 = black world, 1 = white world; fractional only during a sweep. */
  world: number;
  tier: Tier;
  reducedMotion: boolean;
  ambientPaused: boolean;
  selectedPlan: PlanId | null;
  chapter: ChapterId;
  staticMode: boolean;
}

type Listener<K extends keyof State> = (value: State[K], previous: State[K]) => void;

const state: State = {
  world: 0,
  tier: 'MED',
  reducedMotion: false,
  ambientPaused: false,
  selectedPlan: null,
  chapter: 'hero',
  staticMode: false,
};

const listeners = new Map<keyof State, Set<Listener<keyof State>>>();

export const store = {
  get<K extends keyof State>(key: K): State[K] {
    return state[key];
  },

  set<K extends keyof State>(key: K, value: State[K]): void {
    const previous = state[key];
    if (Object.is(previous, value)) return;
    state[key] = value;
    listeners.get(key)?.forEach((listener) => listener(value, previous));
  },

  /** Subscribe to one key. Returns the unsubscribe function. */
  on<K extends keyof State>(key: K, listener: Listener<K>): () => void {
    let set = listeners.get(key);
    if (!set) {
      set = new Set();
      listeners.set(key, set);
    }
    set.add(listener as Listener<keyof State>);
    return () => set.delete(listener as Listener<keyof State>);
  },

  snapshot(): Readonly<State> {
    return { ...state };
  },
};
