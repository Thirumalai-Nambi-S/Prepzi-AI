"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Mic,
  Sparkles,
  Clock3,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/Spinner";
import ThemeToggle from "@/components/ThemeToggle";
import Reveal from "@/components/Reveal";
import Footer from "@/components/Footer";
import DateTimeClock from "@/components/DateTimeClock";
import { apiGetCurrentUser } from "@/lib/api";
import { useRouter } from "next/navigation";

const ROUNDS = [
  {
    label: "Round 1",
    title: "Quantitative Aptitude",
    text: "10 timed multiple-choice questions - arithmetic, logical reasoning, and data interpretation. 60 seconds per question, auto-scored.",
  },
  {
    label: "Round 2",
    title: "Technical Interview",
    text: "A focused, professional-tone voice interview on your role and tech stack, with an AI interviewer that reacts to your answers in real time.",
  },
  {
    label: "Round 3",
    title: "Behavioral Interview",
    text: "A warmer voice conversation with an HR-style interviewer covering past experience, soft skills, and culture fit.",
  },
];

const FEATURES = [
  {
    icon: Mic,
    title: "Real Voice Conversation",
    text: "Speak your answers out loud to an AI interviewer that listens and reacts - not a script you read off a screen.",
  },
  {
    icon: Sparkles,
    title: "Evidence-Based Feedback",
    text: "Every comment cites the actual question and answer it's about, with a concrete way to improve - never a vague verdict.",
  },
  {
    icon: Clock3,
    title: "Practice Anytime",
    text: "No scheduling, no waiting on a friend. Start a full 3-round interview whenever you have twenty minutes to spare.",
  },
  {
    icon: TrendingUp,
    title: "Track Every Attempt",
    text: "Every interview you take is saved with its full feedback report, so you can see exactly where you're improving.",
  },
];

const LandingPage = () => {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    apiGetCurrentUser()
      .then(({ user }) => {
        if (user) {
          router.replace("/dashboard");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* ---------- NAV ---------- */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-dark-100/80 border-b border-light-600/10">
        <nav className="max-w-7xl mx-auto flex items-center justify-between page-gutter py-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Prepzi-AI logo" width={34} height={34} className="rounded-full" />
            <h2 className="text-primary-200 text-xl">Prepzi-AI</h2>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium opacity-80">
            <a href="#how-it-works" className="hover:text-primary-200 transition-colors">How it works</a>
            <a href="#features" className="hover:text-primary-200 transition-colors">Features</a>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild className="btn-secondary hidden sm:inline-flex">
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild className="btn-primary">
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* ---------- HERO ---------- */}
        <section className="max-w-7xl mx-auto page-gutter pt-16 sm:pt-24 pb-12 flex flex-col items-center text-center gap-6">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-dark-200 px-4 py-1.5 text-xs sm:text-sm font-medium text-primary-200 shadow-sm">
              <Sparkles className="size-3.5" />
              AI-Powered Interview Practice
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="text-4xl sm:text-6xl font-bold leading-[1.1] max-w-3xl">
              Walk into any interview
              <br />
              <span className="italic bg-gradient-to-r from-primary-200 via-[#a78bfa] to-[#fda4af] bg-clip-text text-transparent">
                already prepared.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="text-lg opacity-70 max-w-xl">
              Prepzi-AI runs you through a real three-round hiring process - aptitude, technical, and
              behavioral - with a voice AI interviewer, then tells you exactly what to fix.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
              <Button asChild className="btn-primary !px-8 !min-h-12 text-base gap-2">
                <Link href="/sign-up">
                  Start practicing free <ArrowRight className="size-4" />
                </Link>
              </Button>
              <a
                href="#how-it-works"
                className="text-sm font-semibold opacity-70 hover:opacity-100 transition-opacity underline underline-offset-4"
              >
                See how it works
              </a>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <p className="text-xs opacity-50 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-success-100" />
              Free to practice &middot; No credit card required
            </p>
          </Reveal>

          <Reveal delay={400} className="w-full">
            <div className="relative mt-10 max-w-3xl mx-auto">
              <div className="card-border mx-auto">
                <div className="card flex flex-col sm:flex-row items-center gap-6 px-8 py-8 sm:py-10">
                  <img
                    src="/robot.png"
                    alt="Prepzi-AI interviewer illustration"
                    width={280}
                    height={280}
                    className="w-48 sm:w-64 shrink-0 animate-float"
                  />
                  <div className="flex flex-col gap-4 text-left w-full">
                    <p className="badge-text text-primary-200">Live in your next session</p>
                    <div className="flex flex-wrap gap-2">
                      {["3 Rounds", "Voice AI Interviewer", "Instant Feedback"].map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-dark-200 px-3 py-1 text-xs font-semibold shadow-sm"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="opacity-70 text-sm">
                      Pick a role and tech stack, and Prepzi-AI builds a complete mock interview - timed
                      aptitude test, then two back-to-back voice rounds - graded the moment you finish.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ---------- HOW IT WORKS ---------- */}
        <section id="how-it-works" className="max-w-7xl mx-auto page-gutter py-16 sm:py-24">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl font-bold text-center">How your interview works</h2>
          </Reveal>
          <Reveal delay={60}>
            <p className="text-center opacity-70 mt-3 max-w-xl mx-auto">
              Every interview you create runs through 3 rounds, just like a real hiring process.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-3 gap-6 mt-12">
            {ROUNDS.map((r, i) => (
              <Reveal key={r.title} delay={i * 120}>
                <div className="surface-card h-full">
                  <div className="card p-6 flex flex-col gap-3 h-full">
                    <p className="badge-text text-primary-200">{r.label}</p>
                    <h3>{r.title}</h3>
                    <p className="opacity-70 text-sm">{r.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------- FEATURES ---------- */}
        <section id="features" className="max-w-7xl mx-auto page-gutter py-16 sm:py-24">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl font-bold text-center">Why students choose Prepzi-AI</h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 100}>
                <div className="surface-card h-full">
                  <div className="card p-6 flex flex-col gap-3 h-full">
                    <div className="flex items-center justify-center size-11 rounded-xl bg-primary-200/15 text-primary-200">
                      <f.icon className="size-5" />
                    </div>
                    <h3 className="text-lg">{f.title}</h3>
                    <p className="opacity-70 text-sm">{f.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------- FINAL CTA ---------- */}
        <section className="max-w-7xl mx-auto page-gutter pb-20">
          <Reveal>
            <div className="card-cta">
              <div className="flex flex-col gap-4 max-w-lg">
                <h2>Ready to practice your next interview?</h2>
                <p className="text-lg opacity-80">
                  Create your first mock interview in under a minute - completely free.
                </p>
                <Button asChild className="btn-primary max-sm:w-full w-fit gap-2">
                  <Link href="/sign-up">
                    Get started <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
              <img src="/robot.png" alt="" width={220} height={220} className="max-sm:hidden animate-float" />
            </div>
          </Reveal>
        </section>
      </main>

      <div className="max-w-7xl mx-auto page-gutter w-full flex justify-center">
        <DateTimeClock />
      </div>
      <div className="max-w-7xl mx-auto page-gutter w-full">
        <Footer />
      </div>
    </div>
  );
};

export default LandingPage;
