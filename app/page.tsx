"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Button from "@/shared/ui/Button";
import AnimatedContainer from "@/shared/ui/AnimatedContainer";
import { hasHostId } from "@/shared/hostIdentity";

const STEPS = [
  {
    icon: "draw",
    step: "01",
    title: "Host creates the quiz",
    desc: "Pick question types, set timers, attach media, or generate high-quality trivia with AI in seconds.",
  },
  {
    icon: "qr_code_scanner",
    step: "02",
    title: "Team joins instantly",
    desc: "Scan the on-screen QR code or type the room code on any phone. No app download, zero friction.",
  },
  {
    icon: "social_leaderboard",
    step: "03",
    title: "Compete in real-time",
    desc: "Real-time scoring, live horse-race animation between rounds, and a dynamic podium for the winner.",
  },
];

const FEATURES = [
  {
    icon: "bolt",
    title: "Real-time sync",
    desc: "Questions and answer reveals push to every participant's device with sub-second latency.",
    tag: "WebSocket Live",
  },
  {
    icon: "directions_run",
    title: "Horse-race leaderboard",
    desc: "Watch team standings physically gallop across the screen as scores update round by round.",
    tag: "Visual Dynamics",
  },
  {
    icon: "smart_toy",
    title: "AI question generator",
    desc: "Generate full trivia packs on any topic or difficulty instantly with built-in AI authoring.",
    tag: "Smart Engine",
  },
  {
    icon: "qr_code_2",
    title: "QR instant entry",
    desc: "Display the large room QR code on your projector or monitor for effortless mobile joining.",
    tag: "Frictionless",
  },
  {
    icon: "magic_button",
    title: "Joker wildcard rounds",
    desc: "Double-point tactical wildcards allow players to mount thrilling comebacks before the finale.",
    tag: "Game Mechanics",
  },
  {
    icon: "category",
    title: "Diverse question types",
    desc: "Multiple choice, true/false, numeric sliders, type-in text, and media-rich trivia.",
    tag: "Multi-Format",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [isReturningHost, setIsReturningHost] = useState(false);

  useEffect(() => {
    setIsReturningHost(hasHostId());
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (code.length >= 4) router.push(`/play/${code}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0D1722] text-[#F8FAFC] selection:bg-[#B88B4A] selection:text-[#0D1722]">
      {/* ── Top Navigation Bar ───────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-[#283E58]/60 bg-[#0D1722]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1C2D42] to-[#121F2E] border border-[#B88B4A]/40 flex items-center justify-center shadow-[0_0_15px_rgba(184,139,74,0.15)] group-hover:border-[#B88B4A] transition-all">
              <Image
                src="/ikon.png"
                alt="WicQuiz logo"
                width={26}
                height={26}
                className="rounded-md"
              />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-[#F8FAFC] group-hover:text-[#D4A76A] transition-colors">
                WicQuiz
              </span>
              <div className="flex items-center gap-1.5 -mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34D399]" />
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#94A3B8]">
                  Live Arena
                </span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {isReturningHost ? (
              <button
                onClick={() => router.push("/host/dashboard")}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold text-[#F8FAFC] bg-[#162536] border border-[#283E58] hover:border-[#B88B4A]/50 hover:bg-[#1C2D42] transition-all"
                title="Host Dashboard"
              >
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden material-symbols-outlined text-[16px] text-[#B88B4A]">dashboard</span>
              </button>
            ) : (
              <Link
                href="/auth/login"
                className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold text-[#F8FAFC] bg-[#162536] border border-[#283E58] hover:border-[#B88B4A]/50 hover:bg-[#1C2D42] transition-all"
              >
                Login
              </Link>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push("/host/new")}
              className="shadow-sm px-3 sm:px-4"
            >
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span className="hidden sm:inline">Host a Quiz</span>
                <span className="sm:hidden">Host</span>
              </span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {/* ── Hero Section ───────────────────────────────────── */}
        <section className="relative px-4 sm:px-6 pt-16 sm:pt-20 pb-20 sm:pb-28 md:pt-28 md:pb-36 overflow-hidden tactical-grid border-b border-[#283E58]/40">
          {/* Subtle atmospheric ambient glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#2E5339]/25 blur-[120px] rounded-full pointer-events-none -z-10" />
          <div className="absolute bottom-0 right-10 w-[400px] h-[300px] bg-[#B88B4A]/10 blur-[100px] rounded-full pointer-events-none -z-10" />

          <AnimatedContainer className="max-w-4xl mx-auto text-center relative z-10">
            {/* Tactical Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#162536]/90 border border-[#B88B4A]/30 mb-7 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B88B4A]" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#D4A76A]">
                Next-Gen Multiplayer Arena
              </span>
            </div>

            <h1 data-aos="fade-up" className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1] sm:leading-[1.08] mb-4 sm:mb-6">
              Turn any meeting into a{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#B88B4A] via-[#E2BE80] to-[#B88B4A]">
                high-stakes
              </span>{" "}
              game show
            </h1>

            <p data-aos="fade-up" data-aos-delay="100" className="text-base sm:text-lg md:text-xl text-[#94A3B8] max-w-2xl mx-auto mb-10 leading-relaxed">
              Real-time synchronization, galloping horse-race leaderboards, and AI question authoring.
              Participants join from any mobile device in seconds without app installs.
            </p>

            {/* Quick Actions */}
            <div data-aos="fade-up" data-aos-delay="200" className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
              <Button
                variant="primary"
                size="lg"
                onClick={() => router.push("/host/new")}
                className="w-full sm:w-auto min-w-[200px]"
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">mic</span>
                  <span>Host a Quiz Now</span>
                </span>
              </Button>
              <a
                href="#join"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl border border-[#283E58] bg-[#142232]/80 text-[#F8FAFC] font-extrabold hover:border-[#B88B4A]/60 hover:bg-[#1C2D42] active:scale-98 transition-all"
              >
                <span className="material-symbols-outlined text-[20px] text-[#B88B4A]">
                  dialpad
                </span>
                <span>Enter Room Code</span>
              </a>
            </div>

            {/* Live Metrics Ribbon */}
            <div className="mt-16 pt-8 border-t border-[#283E58]/50 grid grid-cols-2 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-[#F8FAFC] tracking-tight">0 ms</span>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#94A3B8]">
                  Perceived Lag
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-[#D4A76A] tracking-tight">6+ Types</span>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#94A3B8]">
                  Question Formats
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1 flex flex-col items-center">
                <span className="text-2xl font-black text-[#4ADE80] tracking-tight">1-Click</span>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#94A3B8]">
                  Mobile Join
                </span>
              </div>
            </div>
          </AnimatedContainer>
        </section>

        {/* ── Join or Host Interactive Terminal ───────────────── */}
        <section id="join" className="px-4 sm:px-6 py-12 sm:py-20 bg-[#0D1722]">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              {/* Player Join Card */}
              <AnimatedContainer delay={0.1}>
                <div data-aos="fade-right" className="tactical-card h-full rounded-3xl p-8 sm:p-10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-[#1C2D42] border border-[#B88B4A]/30 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[26px] text-[#B88B4A]">
                          confirmation_number
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#94A3B8] bg-[#162536] px-3 py-1 rounded-full border border-[#283E58]">
                        Player Entrance
                      </span>
                    </div>
                    <h3 className="text-2xl font-extrabold text-[#F8FAFC] mb-2 tracking-tight">
                      Join Active Game
                    </h3>
                    <p className="text-sm text-[#94A3B8] mb-8 leading-relaxed">
                      Enter the 4–6 character room code displayed on the host screen to jump straight into the arena.
                    </p>
                  </div>

                  <form onSubmit={handleJoin} className="space-y-4">
                    <div className="relative">
                      <input
                        type="text"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        placeholder="ROOM CODE"
                        maxLength={6}
                        className="w-full text-center text-2xl font-black tracking-[0.3em] uppercase px-6 py-4 rounded-2xl bg-[#0A121B] border border-[#283E58] text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#B88B4A] focus:ring-1 focus:ring-[#B88B4A] focus:outline-none transition-all"
                      />
                    </div>
                    <Button
                      variant="primary"
                      size="lg"
                      type="submit"
                      disabled={roomCode.trim().length < 4}
                      className="w-full"
                    >
                      Enter Arena
                    </Button>
                  </form>
                </div>
              </AnimatedContainer>

              {/* Host Quick Launch Card */}
              <AnimatedContainer delay={0.2}>
                <div data-aos="fade-left" className="tactical-card h-full rounded-3xl p-8 sm:p-10 flex flex-col justify-between border-t-2 border-t-[#2E5339]">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-[#2E5339]/30 border border-[#2E5339] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[26px] text-[#4ADE80]">
                          sensors
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#4ADE80] bg-[#2E5339]/30 px-3 py-1 rounded-full border border-[#2E5339]/50">
                        Host Console
                      </span>
                    </div>
                    <h3 className="text-2xl font-extrabold text-[#F8FAFC] mb-2 tracking-tight">
                      Launch as Host
                    </h3>
                    <p className="text-sm text-[#94A3B8] mb-8 leading-relaxed">
                      Create custom questions, schedule rounds, configure timers, and command the leaderboard live on your terms.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => router.push("/host/new")}
                      className="w-full"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        <span>Create New Quiz</span>
                      </span>
                    </Button>
                    <button
                      onClick={() => router.push("/host/dashboard")}
                      className="w-full py-3 text-xs font-bold text-[#94A3B8] hover:text-[#F8FAFC] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Open Host Dashboard</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </AnimatedContainer>
            </div>
          </div>
        </section>

        {/* ── Three-Step Pipeline ─────────────────────────────── */}
        <section className="px-4 sm:px-6 py-16 sm:py-24 border-t border-[#283E58]/40 bg-[#0B141E]">
          <div className="max-w-5xl mx-auto">
            <AnimatedContainer className="text-center mb-16">
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#B88B4A]">
                Workflow Architecture
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-2">
                Three steps to game-show glory
              </h2>
            </AnimatedContainer>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {STEPS.map((item, i) => (
                <AnimatedContainer key={item.title} delay={i * 0.1}>
                  <div data-aos="flip-up" data-aos-delay={i * 100} className="tactical-card h-full rounded-2xl p-8 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 rounded-xl bg-[#1C2D42] border border-[#B88B4A]/30 flex items-center justify-center text-[#B88B4A]">
                          <span className="material-symbols-outlined text-[24px]">
                            {item.icon}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-black text-[#B88B4A] bg-[#B88B4A]/10 px-2.5 py-1 rounded-md border border-[#B88B4A]/20">
                          {item.step}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                      <p className="text-sm text-[#94A3B8] leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </AnimatedContainer>
              ))}
            </div>
          </div>
        </section>

        {/* ── Feature Matrix ─────────────────────────────────── */}
        <section className="px-4 sm:px-6 py-16 sm:py-24 border-t border-[#283E58]/40 bg-[#0D1722]">
          <div className="max-w-5xl mx-auto">
            <AnimatedContainer className="text-center mb-16">
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#B88B4A]">
                Platform Capabilities
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-2">
                Engineered for engagement & speed
              </h2>
            </AnimatedContainer>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((feat, i) => (
                <AnimatedContainer key={feat.title} delay={i * 0.05}>
                  <div data-aos="zoom-in" data-aos-delay={i * 100} className="tactical-card h-full rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-[#1C2D42] border border-[#283E58] flex items-center justify-center text-[#D4A76A]">
                          <span className="material-symbols-outlined text-[20px]">
                            {feat.icon}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#94A3B8] bg-[#142232] px-2 py-0.5 rounded border border-[#283E58]/50">
                          {feat.tag}
                        </span>
                      </div>
                      <h3 className="font-bold text-white mb-1.5 text-base">{feat.title}</h3>
                      <p className="text-xs text-[#94A3B8] leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>
                </AnimatedContainer>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-[#283E58]/40 bg-[#0A121B] text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4 text-xs text-[#94A3B8]">
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center sm:text-left">
            <span className="font-bold text-[#F8FAFC]">WicQuiz</span>
            <span className="hidden sm:inline">•</span>
            <span>Modern Real-Time Pub Quiz Platform</span>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6">
            <Link href="/auth/login" className="hover:text-[#F8FAFC] transition-colors">
              Host Login
            </Link>
            <Link href="/auth/register" className="hover:text-[#F8FAFC] transition-colors">
              Create Account
            </Link>
            <Link href="/host/dashboard" className="hover:text-[#F8FAFC] transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
