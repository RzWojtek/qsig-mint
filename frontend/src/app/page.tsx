"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

// Adres tokenu QSIG na Base
const QSIG_TOKEN_ADDRESS = "0xE6417fDB0FBB671deaced0C4209C8087f435EcAf";
const BASE_RPC = "https://base.llamarpc.com"; // publiczny darmowy RPC, nie wymaga klucza

// totalSupply() — selector 0x18160ddd
async function fetchTotalMinted(): Promise<number> {
  const response = await fetch(BASE_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [
        { to: QSIG_TOKEN_ADDRESS, data: "0x18160ddd" },
        "latest",
      ],
      id: 1,
    }),
  });
  const data = await response.json();
  // wynik w wei (18 decimals) — dzielimy przez 1e18
  const raw = BigInt(data.result);
  const total = Number(raw / BigInt("1000000000000000000"));
  // Odejmujemy 10M LP + 1M burn = 11M które były mintowane przy deployu
  // Pokazujemy tylko publiczne minty
  return Math.max(0, total - 11_000_000);
}

const MAX_PUBLIC_SUPPLY = 10_000_000; // 20,000 slotów × 500 QSIG
const HARD_CAP          = 21_000_000;

export default function Home() {
  const [minted,  setMinted]  = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTotalMinted()
      .then(v => { setMinted(v); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const pct     = minted !== null ? Math.min(100, (minted / MAX_PUBLIC_SUPPLY) * 100) : 0;
  const slots   = minted !== null ? Math.floor(minted / 500) : null;
  const remaining = minted !== null ? MAX_PUBLIC_SUPPLY - minted : null;

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

        {/* ── Licznik Total Minted ─────────────────────────────── */}
        <div className="border border-zinc-800 rounded-xl p-5 mb-8 bg-zinc-900/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">
              public mint progress · Base
            </span>
            {loading ? (
              <span className="text-xs text-zinc-600 animate-pulse">loading...</span>
            ) : (
              <span className="text-xs text-zinc-400">
                {slots !== null ? slots.toLocaleString() : "—"} mints
              </span>
            )}
          </div>

          {/* Pasek postępu */}
          <div className="w-full bg-zinc-800 rounded-full h-2 mb-3 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-1000"
              style={{
                width: `${pct}%`,
                background: pct > 80
                  ? "linear-gradient(90deg, #00e5ff, #ff4d4d)"
                  : "linear-gradient(90deg, #00e5ff, #0080ff)",
              }}
            />
          </div>

          {/* Liczby */}
          <div className="flex items-end justify-between">
            <div>
              {loading ? (
                <div className="text-2xl font-bold text-zinc-600 animate-pulse">———</div>
              ) : (
                <div className="text-2xl font-bold text-white">
                  {minted !== null ? minted.toLocaleString() : "—"}
                  <span className="text-sm text-zinc-500 font-normal ml-2">QSIG minted</span>
                </div>
              )}
              <div className="text-xs text-zinc-600 mt-1">
                out of {MAX_PUBLIC_SUPPLY.toLocaleString()} public supply
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-cyan-400">
                {pct.toFixed(2)}%
              </div>
              <div className="text-xs text-zinc-600">
                {remaining !== null ? remaining.toLocaleString() : "—"} remaining
              </div>
            </div>
          </div>
        </div>
        {/* ── Koniec licznika ──────────────────────────────────── */}

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
