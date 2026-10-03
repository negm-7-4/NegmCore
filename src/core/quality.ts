// src/core/quality.ts — tier choice (RESP-01) and the adaptive quality controller (RESP-02).
// Why a controller: the same page must hold 60 fps on a laptop GPU and 45 fps on a
// mid-range phone; the tier is a first guess, the controller corrects it from real frames.
import { device } from './device';
import { store, type Tier } from './store';

export interface TierSettings {
  dprCap: number;
  msaa: number;
  bloom: 'full' | 'half' | 'off';
  aberration: boolean;
  motes: number;
  latheSegments: number;
  dprFloor: number;
}

export const TIERS: Record<Tier, TierSettings> = {
  HIGH: { dprCap: 2.0, msaa: 4, bloom: 'full', aberration: true, motes: 4000, latheSegments: 96, dprFloor: 1.0 },
  MED: { dprCap: 1.5, msaa: 2, bloom: 'half', aberration: false, motes: 2000, latheSegments: 64, dprFloor: 1.0 },
  LOW: { dprCap: 1.25, msaa: 0, bloom: 'off', aberration: false, motes: 800, latheSegments: 48, dprFloor: 0.85 },
};

/** The tier table of §12.2, applied once at start. QA forces it by viewport (QA-02). */
export function chooseTier(): Tier {
  if (device.qa) return window.innerWidth >= 1024 ? 'HIGH' : 'LOW';
  if (device.coarsePointer && (device.cores <= 6 || device.memoryGb <= 4)) return 'LOW';
  if (device.finePointer && device.cores >= 8) return 'HIGH';
  return 'MED';
}

export interface LiveQuality {
  dpr: number;
  bloom: boolean;
  aberration: boolean;
}

type Step = 'dpr' | 'bloom' | 'aberration';

/**
 * Steps quality down when the smoothed frame time stays above 20 ms for 1.5 s, and up only
 * after 8 s below 12 ms. A level that had to be lowered twice is locked, so it never oscillates.
 */
export class QualityController {
  readonly live: LiveQuality;
  private readonly settings: TierSettings;
  private readonly maxDpr: number;
  private smoothed = 16.7;
  private slowFor = 0;
  private fastFor = 0;
  private readonly history: Step[] = [];
  /** Set once quality has been raised; a later downgrade then locks the level. */
  private raised = false;
  private locked = false;
  private readonly listeners = new Set<(q: LiveQuality) => void>();

  constructor(tier: Tier) {
    this.settings = TIERS[tier];
    this.maxDpr = Math.min(window.devicePixelRatio || 1, this.settings.dprCap);
    this.live = { dpr: this.maxDpr, bloom: this.settings.bloom !== 'off', aberration: this.settings.aberration };
  }

  get tierSettings(): TierSettings {
    return this.settings;
  }

  onChange(listener: (q: LiveQuality) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Feed one frame duration in milliseconds. Disabled in QA, where frames are software-rendered. */
  sample(frameMs: number, dt: number): void {
    if (device.qa || store.get('staticMode')) return;
    this.smoothed += (Math.min(frameMs, 100) - this.smoothed) * 0.1;
    if (this.smoothed > 20) {
      this.slowFor += dt;
      this.fastFor = 0;
      if (this.slowFor >= 1.5) {
        this.slowFor = 0;
        this.stepDown();
      }
    } else if (this.smoothed < 12) {
      this.fastFor += dt;
      this.slowFor = 0;
      if (this.fastFor >= 8) {
        this.fastFor = 0;
        this.stepUp();
      }
    } else {
      this.slowFor = 0;
      this.fastFor = 0;
    }
  }

  private stepDown(): void {
    const floor = this.settings.dprFloor;
    let step: Step | null = null;
    if (this.live.dpr - 0.25 >= floor - 1e-6) {
      this.live.dpr = Math.max(floor, this.live.dpr - 0.25);
      step = 'dpr';
    } else if (this.live.bloom) {
      this.live.bloom = false;
      step = 'bloom';
    } else if (this.live.aberration) {
      this.live.aberration = false;
      step = 'aberration';
    }
    if (!step) return;
    this.history.push(step);
    // A downgrade after an upgrade means the upgrade was wrong: stop raising for good.
    if (this.raised) this.locked = true;
    this.emit();
  }

  private stepUp(): void {
    if (this.locked) return;
    const step = this.history.pop();
    if (!step) return;
    if (step === 'dpr') this.live.dpr = Math.min(this.maxDpr, this.live.dpr + 0.25);
    if (step === 'bloom') this.live.bloom = this.settings.bloom !== 'off';
    if (step === 'aberration') this.live.aberration = this.settings.aberration;
    this.raised = true;
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener(this.live));
  }
}
