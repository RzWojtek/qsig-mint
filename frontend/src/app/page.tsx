import Link from "next/link";

export default function Home() {
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

        <div className="grid grid-cols-2 gap-3 mb-10 text-sm">
          {[
            ["token",        "QSIG (Quantum Signature)"],
            ["networks",     "Base · Arb · OP · Ink · Mega"],
            ["mint price",   "0.0005 ETH (~$1.5)"],
            ["tokens/mint",  "500 QSIG"],
            ["hard cap",     "21,000,000 QSIG"],
            ["max slots",    "20,000 per network"],
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
