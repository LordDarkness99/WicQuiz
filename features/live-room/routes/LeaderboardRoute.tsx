"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchRoomByCode,
  fetchRoomPlayersByScore,
  fetchRoomStatus,
} from "@/features/live-room/data/liveRoomRepository";
import type { Room, Player, LeaderboardEntry } from "@/shared/domain/types";
import Button from "@/shared/ui/Button";
import { HorseRace } from "@/features/leaderboard";
import { RankedList } from "@/features/leaderboard";
import { FinalReveal } from "@/features/leaderboard";
import { LeaderboardSkeleton } from "@/shared/ui/Skeleton";
import { scramblePositions } from "@/features/leaderboard";
import { rankLeaderboard } from "@/features/leaderboard";

type ViewMode = "race" | "ranked";

export default function LeaderboardPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("race");
  const [suspenseMode, setSuspenseMode] = useState(false);
  const [showFinalReveal, setShowFinalReveal] = useState(false);

  // Fetch room and players
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const roomData = await fetchRoomByCode(roomCode);

        if (!roomData) {
          setError("Room not found.");
          setLoading(false);
          return;
        }

        setRoom(roomData);

        const playersData = await fetchRoomPlayersByScore(roomData.id);

        if (playersData === null) {
          setError("Failed to load players.");
          setLoading(false);
          return;
        }

        setPlayers(playersData);
      } catch {
        setError("Failed to load leaderboard data.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [roomCode]);

  // Subscribe to realtime player score updates
  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`leaderboard-players:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "qt_players",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const updated = payload.new as Player;
          setPlayers((prev) =>
            prev
              .map((p) => (p.id === updated.id ? updated : p))
              .sort((a, b) => b.score - a.score)
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "qt_players",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const newPlayer = payload.new as Player;
          setPlayers((prev) => {
            if (prev.some((p) => p.id === newPlayer.id)) return prev;
            return [...prev, newPlayer].sort((a, b) => b.score - a.score);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  // Subscribe to broadcast events for suspense mode and final reveal
  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomCode}`)
      .on("broadcast", { event: "suspense_mode" }, ({ payload }) => {
        const p = payload as { enabled: boolean };
        setSuspenseMode(p.enabled);
      })
      .on("broadcast", { event: "final_reveal_start" }, () => {
        setShowFinalReveal(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  // Subscribe to room status changes for isFinal detection
  useEffect(() => {
    if (!room?.id) return;

    const channel = supabase
      .channel(`leaderboard-room:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "qt_rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          const updated = payload.new as Room;
          setRoom(updated);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  // Poll for room status periodically as a fallback
  useEffect(() => {
    if (!room?.id || room.status === "finished") return;

    const interval = setInterval(async () => {
      const status = await fetchRoomStatus(room.id);

      if (status && status !== room.status) {
        setRoom((prev) =>
          prev ? { ...prev, status: status as Room["status"] } : prev
        );
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [room?.id, room?.status]);

  const isFinal = room?.status === "finished";

  const entries: LeaderboardEntry[] = rankLeaderboard(players);

  const maxScore = Math.max(...players.map((p) => p.score), 1);

  // Build scrambled positions map when suspense mode is active
  const scrambledPositionsMap = suspenseMode
    ? (() => {
        const scrambled = scramblePositions(entries);
        const map = new Map<string, number>();
        scrambled.forEach((p) => map.set(p.player_id, p.trackPosition));
        return map;
      })()
    : undefined;

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#021549] flex flex-col">
        <div className="bg-[#021549] px-6 py-4 flex items-center justify-between border-b border-white/10">
          <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
          <div className="h-8 w-24 bg-white/10 rounded-xl animate-pulse" />
        </div>
        <div className="flex-1 p-6">
          <LeaderboardSkeleton rows={6} />
        </div>
      </div>
    );
  }

  // Error
  if (error || !room) {
    return (
      <div className="min-h-screen bg-[#021549] flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">
            {error || "Room not found"}
          </h1>
        </div>
      </div>
    );
  }

  // Final reveal mode
  if (showFinalReveal) {
    return (
      <FinalReveal
        players={entries}
        onComplete={() => {
          // Stay on the reveal screen
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#021549] flex flex-col">
      {/* Suspense mode banner */}
      {suspenseMode && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#FFB95F] text-[#653e00] text-center py-2 font-bold text-sm tracking-wider"
        >
          🔀 SUSPENSE MODE
        </motion.div>
      )}

      {/* Header */}
      <div className="bg-[#021549] px-6 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <h1 className="text-[#FAFAF7] font-bold text-xl">Leaderboard</h1>
          <span className="bg-white/10 text-white/60 px-3 py-1 rounded-xl text-sm font-mono">
            {roomCode}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isFinal && (
            <span className="bg-[#FF6B6B] text-white px-4 py-1.5 rounded-2xl text-sm font-bold">
              Final
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setViewMode((prev) => (prev === "race" ? "ranked" : "race"))
            }
            className="text-white border-white/20"
          >
            {viewMode === "race" ? "Show Ranked List" : "Show Horse Race"}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          {viewMode === "race" ? (
            <HorseRace
              entries={entries}
              maxScore={maxScore}
              isFinal={isFinal}
              scrambledPositions={scrambledPositionsMap}
              suspenseMode={suspenseMode}
            />
          ) : (
            <RankedList entries={entries} isFinal={isFinal} />
          )}
        </motion.div>

        {/* Auto-update indicator */}
        {!isFinal && (
          <motion.p
            className="text-center text-white/30 text-sm mt-6"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            Live - updating automatically
          </motion.p>
        )}
      </div>
    </div>
  );
}
