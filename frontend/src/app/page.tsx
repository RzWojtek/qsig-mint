"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL!;

interface Supply {
  public_minted: number;
  slots_used:    number;
  pct:           string;
  remaining:     number;
}

export default function Home() {
  const [supply,  setSupply]  = useState<Supply | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND}/api/supply`)
      .then(r => r.json())
      .then(d => { if (d.ok) setSupply(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const pct = supply ? parseFloat(supply.pct) : 0;

  return (
    <main className="min-h-screen bg-black text-white font-mono">
      <nav className="border-b border-zinc-800 px-6 py-4 flex gap-6 text-sm items-center">
        <span className="text-cyan-400 font-bold text-lg">QSIG</span>
        <Link href="/mint" className="text-zinc-400 hover:text-white transition-colors">mint</Link>
        <Link href="/faq"  className="text-zinc-400 hover:text-white transition-colors">faq</Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 pt-24 pb-16">
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          quantum<br/>
          <span className="text-cyan-400">signature</span><br/>
          daily mint.
        </h1>

        <p className="text-zinc-400 text-lg mb-10 leading-relaxed">
          The first daily-mint token gated by a real{" "}
          <span className="text-white font-bold">SPHINCS−</span> post-quantum
          signature. Generate a fresh key every day, sign once, mint{" "}
          <span className="text-white font-bold">500 $QSIG</span>.
          Shor&apos;s algorithm can&apos;t touch us.
        </p>

        {/* ── Total Minted Counter ─────────────────────────────── */}
        <div className="border border-zinc-800 rounded-xl p-5 mb-8 bg-zinc-900/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">
              public mint progress · Base
            </span>
            {loading ? (
              <span className="text-xs text-zinc-600 animate-pulse">loading...</span>
            ) : (
              <span className="text-xs text-zinc-400">
                {supply ? supply.slots_used.toLocaleString() : "—"} mints
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-zinc-800 rounded-full h-2 mb-4 overflow-hidden">
            {!loading && (
              <div
                className="h-2 rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.max(pct, pct > 0 ? 0.5 : 0)}%`,
                  background: pct > 80
                    ? "linear-gradient(90deg, #00e5ff, #ff4d4d)"
                    : "linear-gradient(90deg, #00e5ff, #0080ff)",
                }}
              />
            )}
            {loading && (
              <div className="h-2 rounded-full bg-zinc-700 animate-pulse w-full" />
            )}
          </div>

          {/* Numbers */}
          <div className="flex items-end justify-between">
            <div>
              {loading ? (
                <div className="text-2xl font-bold text-zinc-600 animate-pulse">———</div>
              ) : (
                <div className="text-2xl font-bold text-white">
                  {supply ? supply.public_minted.toLocaleString() : "0"}
                  <span className="text-sm text-zinc-500 font-normal ml-2">QSIG minted</span>
                </div>
              )}
              <div className="text-xs text-zinc-600 mt-1">
                out of 10,000,000 public supply
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-cyan-400">
                {loading ? "—" : `${pct.toFixed(3)}%`}
              </div>
              <div className="text-xs text-zinc-600">
                {supply ? supply.remaining.toLocaleString() : "—"} remaining
              </div>
            </div>
          </div>
        </div>
        {/* ── End Counter ──────────────────────────────────────── */}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-10 text-sm">
          {[
            ["token",       "QSIG (Quantum Signature)"],
            ["networks",    "Base · Arb · OP · Ink · Mega"],
            ["mint price",  "0.0005 ETH (~$1.5)"],
            ["tokens/mint", "500 QSIG"],
            ["hard cap",    "21,000,000 QSIG"],
            ["max slots",   "20,000 per network"],
          ].map(([k, v]) => (
            <div key={k} className="border border-zinc-800 rounded-lg p-3">
              <div className="text-zinc-500 text-xs mb-1">{k}</div>
              <div className="text-white font-medium">{v}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 flex-wrap">
          <Link href="/mint"
            className="bg-cyan-400 text-black px-8 py-3 rounded-lg font-bold hover:bg-cyan-300 transition-colors">
            → mint now
          </Link>
          <Link href="/faq"
            className="border border-zinc-700 text-zinc-300 px-8 py-3 rounded-lg hover:border-zinc-500 hover:text-white transition-colors">
            how it works
          </Link>
        </div>

        <p className="text-zinc-700 text-xs mt-8">
          Immutable contract · open-source · verified on-chain · no admin
        </p>
      </div>
    </main>
  );
}
