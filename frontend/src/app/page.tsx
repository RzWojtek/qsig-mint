"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL!;

// Adresy tokenów na każdej sieci
const TOKEN_ADDRESSES: Record<string, string> = {
  base:     "0xE6417fDB0FBB671deaced0C4209C8087f435EcAf",
  arbitrum: "0xCe5fC8F1319e3cd9fA4068b916AA16B10Fa8CCcC",
  ink:      "0xE6417fDB0FBB671deaced0C4209C8087f435EcAf",
  megaeth:  "0xe0fc756Ff8292974C35f8526854d4E307e1F7fBC",
};

const CHAIN_LABELS: Record<string, string> = {
  base:     "Base",
  arbitrum: "Arbitrum",
  ink:      "Ink",
  megaeth:  "MegaETH",
};

interface SupplyData {
  public_minted: number;
  slots_used:    number;
  pct:           string;
  remaining:     number;
}

interface ChainSupply {
  [chain: string]: SupplyData | null;
}

export default function Home() {
  const [supplies, setSupplies] = useState<ChainSupply>({
    base: null, arbitrum: null, ink: null, megaeth: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pobierz supply dla każdej sieci z backendu
    const chains = ["base", "arbitrum", "ink", "megaeth"];
    Promise.allSettled(
      chains.map(chain =>
        fetch(`${BACKEND}/api/supply?chain=${chain}`)
          .then(r => r.json())
          .then(d => ({ chain, data: d.ok ? d : null }))
          .catch(() => ({ chain, data: null }))
      )
    ).then(results => {
      const newSupplies: ChainSupply = {};
      results.forEach(r => {
        if (r.status === "fulfilled") {
          newSupplies[r.value.chain] = r.value.data;
        }
      });
      setSupplies(newSupplies);
      setLoading(false);
    });
  }, []);

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

        {/* ── Per-chain mint progress ───────────────────────── */}
        <div className="border border-zinc-800 rounded-xl p-5 mb-8 bg-zinc-900/30">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-4">
            mint progress per network
          </div>

          <div className="space-y-5">
            {Object.entries(CHAIN_LABELS).map(([chain, label]) => {
              const s   = supplies[chain];
              const pct = s ? parseFloat(s.pct) : 0;

              return (
                <div key={chain}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-zinc-400 font-medium">{label}</span>
                    <div className="flex items-center gap-3 text-xs">
                      {loading || !s ? (
                        <span className="text-zinc-600 animate-pulse">loading...</span>
                      ) : (
                        <>
                          <span className="text-zinc-500">
                            {s.slots_used.toLocaleString()} mints
                          </span>
                          <span className="text-cyan-400 font-bold">
                            {pct.toFixed(3)}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    {!loading && s ? (
                      <div
                        className="h-1.5 rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.max(pct > 0 ? 0.3 : 0, pct)}%`,
                          background: pct > 80
                            ? "linear-gradient(90deg, #00e5ff, #ff4d4d)"
                            : "linear-gradient(90deg, #00e5ff, #0080ff)",
                        }}
                      />
                    ) : (
                      <div className="h-1.5 rounded-full bg-zinc-700 animate-pulse w-full" />
                    )}
                  </div>

                  {!loading && s && (
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-zinc-600">
                        {s.public_minted.toLocaleString()} QSIG minted
                      </span>
                      <span className="text-xs text-zinc-600">
                        {s.remaining.toLocaleString()} remaining
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-zinc-800 mt-4 pt-3 text-xs text-zinc-600">
            10,000,000 QSIG public supply per network · 20,000 slots × 500 QSIG
          </div>
        </div>
        {/* ── End progress ─────────────────────────────────── */}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-10 text-sm">
          {[
            ["token",       "QSIG (Quantum Signature)"],
            ["networks",    "Base · Arb · Ink · MegaETH"],
            ["mint price",  "0.0005 ETH (~$1.5)"],
            ["tokens/mint", "500 QSIG"],
            ["hard cap",    "21,000,000 per network"],
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
