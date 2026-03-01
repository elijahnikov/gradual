import { useParams } from "@tanstack/react-router";
import { useSubscription } from "@trpc/tanstack-react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useTRPC } from "@/lib/trpc";

export interface LiveEvaluation {
  id: string;
  featureFlagId: string;
  flagName: string | null;
  flagKey: string | null;
  environmentId: string;
  variationId: string | null;
  errorDetail: string | null;
  sdkPlatform: string | null;
  evaluationDurationUs: number | null;
  createdAt: Date;
}

type LiveEvaluationListener = (event: LiveEvaluation) => void;

const LiveEvaluationContext = createContext<{
  subscribe: (listener: LiveEvaluationListener) => () => void;
} | null>(null);

export function LiveEvaluationProvider({ children }: { children: ReactNode }) {
  const trpc = useTRPC();
  const { organizationSlug, projectSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug",
  });
  const listenersRef = useRef(new Set<LiveEvaluationListener>());

  const onData = useCallback((event: LiveEvaluation) => {
    for (const listener of listenersRef.current) {
      listener(event);
    }
  }, []);

  useSubscription(
    trpc.project.watchEvaluations.subscriptionOptions(
      { organizationSlug, projectSlug },
      { enabled: true, onData }
    )
  );

  const subscribe = useCallback((listener: LiveEvaluationListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  return (
    <LiveEvaluationContext.Provider value={{ subscribe }}>
      {children}
    </LiveEvaluationContext.Provider>
  );
}

export function useLiveEvaluationListener(listener: LiveEvaluationListener) {
  const ctx = useContext(LiveEvaluationContext);
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    if (!ctx) {
      return;
    }
    return ctx.subscribe((event) => {
      listenerRef.current(event);
    });
  }, [ctx]);
}
