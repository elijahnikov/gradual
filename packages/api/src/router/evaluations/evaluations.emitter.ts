import EventEmitter, { on } from "node:events";

type EventMap<T> = Record<keyof T, unknown[]>;

class IterableEventEmitter<T extends EventMap<T>> extends EventEmitter<T> {
  toIterable<TEventName extends keyof T & string>(
    eventName: TEventName,
    opts?: NonNullable<Parameters<typeof on>[2]>
  ): AsyncIterable<T[TEventName]> {
    return on(this as EventEmitter, eventName, opts) as AsyncIterable<
      T[TEventName]
    >;
  }
}

export interface EvaluationEvent {
  id: string;
  featureFlagId: string;
  environmentId: string;
  variationId: string | null;
  value: unknown;
  reasons: unknown[] | null;
  evaluatedAt: Date | null;
  ruleId: string | null;
  sdkVersion: string;
  userAgent: string | null;
  createdAt: Date;
  matchedTargetName: string | null;
  flagConfigVersion: number | null;
  sdkPlatform: string | null;
  errorDetail: string | null;
  evaluationDurationUs: number | null;
  isAnonymous: boolean | null;
}

interface EvaluationEvents {
  add: [event: EvaluationEvent];
}

export const ee = new IterableEventEmitter<EvaluationEvents>();
