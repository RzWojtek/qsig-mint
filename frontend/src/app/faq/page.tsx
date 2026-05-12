import Link from "next/link";

const FAQ = [
  {
    q: "What is SPHINCS-?",
    a: "SPHINCS- is a post-quantum cryptographic signature scheme. Its security relies entirely on the collision resistance of keccak256 — no elliptic curves involved. Shor's algorithm (which would break Bitcoin and Ethereum) cannot crack it. The reference implementation was published by Vitalik Buterin.",
  },
  {
    q: "Why do I need to generate a new key every day?",
    a: "Each SPHINCS- key is tied to a specific date (day_epoch = unix_timestamp ÷ 86400). Yesterday's key is invalid today — the signed message includes the date. This prevents replay attacks and enforces daily participation.",
  },
  {
    q: "What happens to my private key?",
    a: "The private key (sk) is ephemeral — it is generated and destroyed in the same moment. It is never stored or transmitted. Only the public key (pk) and signature are retained for public verification, as they are public by design.",
  },
  {
    q: "Why do I wait ~5 minutes after signing?",
    a: "The backend collects all submissions from a given time window, builds a Merkle tree, and posts a single root on-chain — one transaction for everyone. The cron job runs every 5 minutes. This drastically reduces gas costs.",
  },
  {
    q: "How many times can I mint?",
    a: "Once per day (UTC) per wallet per network. You can mint on each of the 5 supported networks separately — Base, Arbitrum, Optimism, Ink, MegaETH.",
  },
  {
    q: "Is the contract safe?",
    a: "The contract is immutable — no admin, no proxy, no pause function. The code is open-source and verified on-chain. The backend can delay a mint, but it cannot mint to the wrong address or exceed the hard cap.",
  },
  {
    q: "What is the 0.0005 ETH for?",
    a: "It is the price of one mint (~$1.5). Funds go directly to the developer's address. The contract has no hidden fees.",
  },
  {
    q: "What is the QSIG token?",
    a: "QSIG (Quantum Signature) is an ERC-20 token with a hard cap of 21,000,000. 10M is the LP reserve (DEX liquidity), 1M is permanently burned to the 0x...dEaD address. Public mint: 20,000 slots × 500 QSIG = 10M tokens. This is a technical experiment.",
  },
  {
    q: "How can I verify my signature?",
    a: "Visit /proof?pkHash=0x...&chain=base — you will receive the full tuple (pk, sig, recipient, attestation). You can run verify.py from Vitalik's repository locally to confirm it.",
  },
];

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-black text-white font-mono">
      <nav className="border-b border-zinc-800 px-6 py-4 flex gap-6 text-sm items-center">
        <Link href="/" className="text-zinc-400 hover:text-white">QSIG</Link>
        <Link href="/mint" className="text-zinc-400 hover:text-white">mint</Link>
        <span className="text-cyan-400 font-bold">faq</span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 pt-16 pb-16">
        <h1 className="text-2xl font-bold mb-10">frequently asked questions</h1>
        <div className="space-y-8">
          {FAQ.map((item, i) => (
            <div key={i} className="border-b border-zinc-800 pb-8 last:border-0">
              <div className="text-cyan-400 text-sm font-medium mb-2">
                Q: {item.q}
              </div>
              <div className="text-zinc-300 text-sm leading-relaxed">
                {item.a}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
