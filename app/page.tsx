"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/shared/ui/Button";
import AnimatedContainer from "@/shared/ui/AnimatedContainer";
import { hasHostId } from "@/shared/hostIdentity";

const STEPS = [
  {
    icon: "mic",
    title: "Host creates the quiz",
    desc: "Pick question types, set timers, add images or video — or let AI generate questions in one click.",
  },
  {
    icon: "qr_code_2",
    title: "Team joins the room",
    desc: "Scan the QR code or type the room code on any phone. No app download, no account.",
  },
  {
    icon: "social_leaderboard",
    title: "Compete live",
    desc: "Real-time scoring, a horse-race leaderboard everyone can see, and a winner crowned at the end.",
  },
];

const FEATURES = [
  { icon: "bolt", title: "Real-time sync", desc: "Questions appear on every phone the instant you advance. Zero lag." },
  { icon: "directions_run", title: "Horse-race leaderboard", desc: "Watch the standings gallop across the screen between rounds." },
  { icon: "smart_toy", title: "AI-generated questions", desc: "Out of ideas? Get quality trivia on any topic in seconds." },
  { icon: "qr_code_2", title: "QR-code joining", desc: "One scan and players are in. Show the code on your screen — done." },
  { icon: "style", title: "Joker rounds", desc: "Double-point wildcard questions keep the board shaken up to the end." },
  { icon: "category", title: "Six question types", desc: "Multiple choice, true/false, slider, type-in, image, video, and audio." },
];

export default function HomePage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [, setIsReturningHost] = useState(false);

  useEffect(() => {
    setIsReturningHost(hasHostId());
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (code.length >= 4) router.push(`/play/${code}`);
  };

  return (
    <main className="flex-1 flex flex-col bg-surface text-on-surface">
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="bg-primary px-6 py-20 md:py-28">
        <AnimatedContainer className="max-w-3xl mx-auto text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary-fixed-dim mb-5">
            Real-time pub quiz
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-on-primary tracking-tight leading-[1.05] mb-5">
            Turn any meeting into a game show
          </h1>
          <p className="text-lg text-on-primary/70 max-w-xl mx-auto mb-9 leading-relaxed">
            Live scoring, horse-race leaderboards, and AI-generated questions.
            Your team joins from their phones in seconds — no setup required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="coral"
              size="lg"
              onClick={() => router.push("/host/new")}
              className="w-full sm:w-auto"
            >
              Host a quiz
            </Button>
            <a
              href="#join"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-on-primary/25 text-on-primary font-bold hover:bg-on-primary/10 active:scale-95 transition"
            >
              I have a code
            </a>
          </div>

          <button
            onClick={() => router.push("/host/dashboard")}
            className="mt-7 inline-flex items-center gap-1 text-sm font-semibold text-on-primary/50 hover:text-on-primary transition-colors"
          >
            Host dashboard
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </AnimatedContainer>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <AnimatedContainer className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary/60">
              How it works
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-primary tracking-tight mt-2">
              Three steps to game-show glory
            </h2>
          </AnimatedContainer>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STEPS.map((item, i) => (
              <AnimatedContainer key={item.title} delay={i * 0.1}>
                <div className="h-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-7">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-fixed text-on-primary-fixed mb-5">
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Step {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="text-lg font-bold text-primary mb-2">{item.title}</h3>
                  <p className="text-on-surface-variant leading-relaxed text-sm">{item.desc}</p>
                </div>
              </AnimatedContainer>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section className="px-6 py-20 bg-surface-container-low">
        <div className="max-w-5xl mx-auto">
          <AnimatedContainer className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary/60">
              Features
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-primary tracking-tight mt-2">
              Everything a great team quiz needs
            </h2>
          </AnimatedContainer>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feat, i) => (
              <AnimatedContainer key={feat.title} delay={i * 0.07}>
                <div className="h-full rounded-xl bg-surface-container-lowest border border-outline-variant/40 p-6 flex gap-4 items-start">
                  <span className="material-symbols-outlined text-primary mt-0.5">{feat.icon}</span>
                  <div>
                    <h3 className="font-bold text-primary mb-1">{feat.title}</h3>
                    <p className="text-on-surface-variant text-sm leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              </AnimatedContainer>
            ))}
          </div>
        </div>
      </section>

      {/* ── Join / Host ────────────────────────────────────── */}
      <section id="join" className="px-6 py-20">
        <div className="max-w-md mx-auto">
          <AnimatedContainer className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-primary tracking-tight">Ready to play?</h2>
            <p className="text-on-surface-variant mt-2">Start as a host or grab a seat as a player.</p>
          </AnimatedContainer>

          <AnimatedContainer delay={0.1}>
            <div className="rounded-xl bg-primary p-8 text-center">
              <span className="material-symbols-outlined text-tertiary-fixed-dim text-3xl">mic</span>
              <h3 className="text-xl font-bold text-on-primary mt-2 mb-1">Host a quiz</h3>
              <p className="text-on-primary/60 text-sm mb-6">Create questions, run the show, crown a winner.</p>
              <Button variant="coral" size="lg" className="w-full" onClick={() => router.push("/host/new")}>
                Host a quiz
              </Button>
            </div>
          </AnimatedContainer>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-outline-variant/50" />
            <span className="text-on-surface-variant/70 font-semibold text-xs uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-outline-variant/50" />
          </div>

          <AnimatedContainer delay={0.2}>
            <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/40 p-8 text-center">
              <span className="material-symbols-outlined text-primary text-3xl">confirmation_number</span>
              <h3 className="text-xl font-bold text-primary mt-2 mb-1">Join the game</h3>
              <p className="text-on-surface-variant text-sm mb-6">Got a room code? Enter it and get in.</p>
              <form onSubmit={handleJoin} className="space-y-3">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ROOM CODE"
                  maxLength={6}
                  className="w-full text-center text-2xl font-bold tracking-[0.3em] px-6 py-4 rounded-xl border border-outline-variant/60 focus:border-primary focus:outline-none bg-surface placeholder:text-on-surface-variant/40"
                />
                <Button variant="primary" size="lg" className="w-full" type="submit" disabled={roomCode.trim().length < 4}>
                  Join the game
                </Button>
              </form>
            </div>
          </AnimatedContainer>
        </div>
      </section>

      <footer className="py-8 text-center border-t border-outline-variant/40">
        <p className="text-on-surface-variant/60 text-sm">No account needed — just create or join.</p>
      </footer>
    </main>
  );
}
