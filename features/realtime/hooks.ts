import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Hook to subscribe to a Supabase Realtime channel for a room.
 * Uses a handler registry so onBroadcast works even before channel is subscribed.
 */
export function useRoomChannel(roomCode: string) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const listenersRef = useRef<Map<string, Set<(p: Record<string, unknown>) => void>>>(new Map());

  useEffect(() => {
    const channel = supabase.channel(`room:${roomCode}`);
    channelRef.current = channel;

    // Re-attach any listeners that were registered before channel was created
    listenersRef.current.forEach((_handlers, event) => {
      channel.on('broadcast', { event }, ({ payload }) => {
        listenersRef.current.get(event)?.forEach(h => h(payload as Record<string, unknown>));
      });
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomCode]);

  const broadcast = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      channelRef.current?.send({
        type: "broadcast",
        event,
        payload,
      });
    },
    []
  );

  const onBroadcast = useCallback(
    (event: string, callback: (payload: Record<string, unknown>) => void) => {
      if (!listenersRef.current.has(event)) {
        listenersRef.current.set(event, new Set());
        // Attach to channel if it already exists
        channelRef.current?.on('broadcast', { event }, ({ payload }) => {
          listenersRef.current.get(event)?.forEach(h => h(payload as Record<string, unknown>));
        });
      }
      listenersRef.current.get(event)!.add(callback);
    },
    []
  );

  return { channel: channelRef, broadcast, onBroadcast };
}

/**
 * Hook to listen for new players joining a room via Postgres changes.
 */
export function usePlayersSubscription(
  roomId: string,
  onPlayerJoin: (player: Record<string, unknown>) => void
) {
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`players:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "qt_players",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          onPlayerJoin(payload.new as Record<string, unknown>);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, onPlayerJoin]);
}

/**
 * Hook to listen for answers being submitted.
 */
export function useAnswersSubscription(
  questionId: string,
  onAnswer: (answer: Record<string, unknown>) => void
) {
  const onAnswerRef = useRef(onAnswer);
  onAnswerRef.current = onAnswer;

  useEffect(() => {
    if (!questionId) return;

    // Fetch any answers already submitted before subscription was set up
    supabase
      .from("qt_answers")
      .select("*")
      .eq("question_id", questionId)
      .then(({ data }) => {
        if (data) data.forEach((row) => onAnswerRef.current(row));
      });

    const channel = supabase
      .channel(`answers:${questionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "qt_answers",
          filter: `question_id=eq.${questionId}`,
        },
        (payload) => {
          onAnswerRef.current(payload.new as Record<string, unknown>);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [questionId]);
}

/**
 * Hook for the countdown timer, broadcasting ticks via Realtime.
 */
export function useTimer(
  durationSeconds: number,
  isRunning: boolean,
  onTick?: (remaining: number) => void,
  onComplete?: () => void
) {
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Only reset when timer transitions from stopped→running (not when durationSeconds changes mid-tick)
  const wasRunningRef = useRef(false);
  useEffect(() => {
    if (isRunning && !wasRunningRef.current) {
      setTimeRemaining(durationSeconds);
    }
    wasRunningRef.current = isRunning;
  }, [isRunning, durationSeconds]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onTickRef.current?.(0);
          onCompleteRef.current?.();
          return 0;
        }
        onTickRef.current?.(next);
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const reset = useCallback(
    (newDuration?: number) => {
      setTimeRemaining(newDuration ?? durationSeconds);
    },
    [durationSeconds]
  );

  return { timeRemaining, reset };
}
