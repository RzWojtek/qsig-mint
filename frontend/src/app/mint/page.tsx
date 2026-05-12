"use client";
import { useState } from "react";
import Link from "next/link";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL!;

const CHAINS: Record<string, { name: string; chainId: number; gate: string }> = {
  base:     { name: "Base",     chainId: 8453,   gate: process.env.NEXT_PUBLIC_GATE_BASE     || "" },
  arbitrum: { name: "Arbitrum", chainId: 42161,  gate: process.env.NEXT_PUBLIC_GATE_ARBITRUM || "" },
  optimism: { name: "Optimism", chainId: 10,     gate: process.env.NEXT_PUBLIC_GATE_OPTIMISM || "" },
  ink:      { name: "Ink",      chainId: 763373, gate: process.env.NEXT_PUBLIC_GATE_INK      || "" },
  megaeth:  { name: "MegaETH",  chainId: 6342,   gate: process.env.NEXT_PUBLIC_GATE_MEGAETH  || "" },
};

const GATE_ABI = [
  "function mint(uint256 dayEpoch, bytes32 pkHash, bytes32[] calldata proof, bytes calldata sig) payable",
];

const EXPLORERS: Record<string, string> = {
  base:     "https://basescan.org/tx/",
  arbitrum: "https://arbiscan.io/tx/",
  optimism: "https://optimistic.etherscan.io/tx/",
  ink:      "https://explorer.inkonchain.com/tx/",
  megaeth:  "https://megaexplorer.xyz/tx/",
};

type Step = "idle" | "keygen" | "sign" | "waiting" | "mint" | "done" | "error";

export default function MintPage() {
  const [chain,   setChain]   = useState("base");
  const [step,    setStep]    = useState<Step>("idle");
  const [pk,      setPk]      = useState("");
  const [pkHash,  setPkHash]  = useState("");
  const [epoch,   setEpoch]   = useState(0);
  const [merkle,  setMerkle]  = useState<{ proof: string[]; root: string } | null>(null);
  const [txHash,  setTxHash]  = useState("");
  const [error,   setError]   = useState("");
  const [logs,    setLogs]    = useState<string[]>([]);

  function addLog(msg: string) {
    setLogs(prev => [...prev, `[${new Date().toISOString().slice(11, 19)}] ${msg}`]);
  }

  // ── Krok 1: Generuj klucz SPHINCS- ────────────────────────────────────
  async function doKeygen() {
    setStep("keygen");
    setError("");
    setLogs([]);
    addLog("Generuję klucz SPHINCS-...");
    try {
      const res  = await fetch(`${BACKEND}/api/keygen`, { method: "POST" });
      const data = await res.json();
      if (!data.pk) throw new Error("Brak klucza w odpowiedzi backendu");
      setPk(data.pk);
      setPkHash(data.pk_hash);
      addLog(`✓ Klucz gotowy. pk_hash: 0x${data.pk_hash.slice(0, 12)}...`);
      setStep("sign");
      await doSign(data.pk, data.pk_hash);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  }

  // ── Krok 2: Połącz wallet i podpisz ────────────────────────────────────
  async function doSign(pkVal: string, pkHashVal: string) {
    setError("");
    try {
      if (!window.ethereum) throw new Error("Zainstaluj MetaMask");

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      }) as string[];
      const recipient = accounts[0];
      addLog(`✓ Wallet: ${recipient.slice(0, 10)}...`);

      const chainHex = "0x" + CHAINS[chain].chainId.toString(16);
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainHex }],
      }).catch(() => {});

      addLog(`Wysyłam podpis do backendu (sieć: ${chain})...`);

      const res  = await fetch(`${BACKEND}/api/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pk: pkVal, sig: pkVal, recipient, chain }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Błąd backendu");

      setEpoch(data.day_epoch);
      addLog(`✓ Zaakceptowany! day_epoch: ${data.day_epoch}`);
      addLog("Czekam na Merkle root (max ~5 min)...");
      setStep("waiting");

      await pollForProof(pkHashVal, chain, data.day_epoch);

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  }

  // ── Polling co 30s czy root jest gotowy ───────────────────────────────
  async function pollForProof(pkh: string, ch: string, ep: number) {
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 30_000));
      addLog(`Sprawdzam proof... (próba ${i + 1}/20)`);
      try {
        const res  = await fetch(
          `${BACKEND}/api/proof?pkHash=${pkh}&chain=${ch}&dayEpoch=${ep}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.merkle?.proof) {
            setMerkle(data.merkle);
            addLog("✓ Merkle proof gotowy! Możesz mintować.");
            setStep("mint");
            return;
          }
        }
      } catch {}
    }
    addLog("Timeout — spróbuj kliknąć 'mint now' mimo to.");
    setStep("mint");
  }

  // ── Krok 3: Mint on-chain z atestacją EIP-712 ─────────────────────────
  async function doMint() {
    setError("");
    addLog("Pobieram atestację backendu...");
    try {
      if (!window.ethereum) throw new Error("Zainstaluj MetaMask");

      const { ethers } = await import("ethers");
      const provider   = new ethers.BrowserProvider(window.ethereum);
      const signer_    = await provider.getSigner();
      const network    = await provider.getNetwork();
      const recipient  = await signer_.getAddress();

      // Pobierz atestację EIP-712 z backendu
      const attestRes = await fetch(`${BACKEND}/api/attest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pkHash:   pkHash,
          recipient,
          dayEpoch: epoch,
          chainId:  network.chainId.toString(),
        }),
      });
      const attestData = await attestRes.json();
      if (!attestData.ok) throw new Error(attestData.error || "Błąd atestacji");

      addLog("✓ Atestacja OK. Wysyłam transakcję mint...");

      const gate  = new ethers.Contract(CHAINS[chain].gate, GATE_ABI, signer_);
      const proof = (merkle?.proof || []) as string[];

      const tx = await gate.mint(
        epoch,
        "0x" + pkHash,
        proof,
        attestData.sig,
        { value: ethers.parseEther("0.0005") }
      );

      addLog(`TX: ${tx.hash.slice(0, 16)}...`);
      await tx.wait();
      setTxHash(tx.hash);
      addLog("✅ 500 QSIG zmintowane!");
      setStep("done");

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  }

  const isWaiting = step === "waiting";

  return (
    <main className="min-h-screen bg-black text-white font-mono">
      <nav className="border-b border-zinc-800 px-6 py-4 flex gap-6 text-sm items-center">
        <Link href="/" className="text-zinc-400 hover:text-white">QSIG</Link>
        <span className="text-cyan-400 font-bold">mint</span>
        <Link href="/faq" className="text-zinc-400 hover:text-white">faq</Link>
      </nav>

      <div className="max-w-lg mx-auto px-6 pt-16 pb-16">
        <h1 className="text-2xl font-bold mb-1">daily mint</h1>
        <p className="text-zinc-500 text-sm mb-8">
          raz dziennie (UTC) · nowy klucz SPHINCS- · 500 QSIG za 0.0005 ETH
        </p>

        {/* Wybór sieci */}
        <div className="mb-6">
          <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">wybierz sieć</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CHAINS).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setChain(key)}
                disabled={step !== "idle"}
                className={`px-3 py-1.5 rounded text-xs border transition-colors ${
                  chain === key
                    ? "bg-cyan-400 text-black border-cyan-400 font-bold"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {val.name}
              </button>
            ))}
          </div>
        </div>

        {/* Kroki */}
        <div className="space-y-2 mb-8">
          {[
            { n: 1, label: "generuj klucz SPHINCS-",        done: ["sign","waiting","mint","done"].includes(step) },
            { n: 2, label: "połącz wallet + wyślij podpis",  done: ["waiting","mint","done"].includes(step) },
            { n: 3, label: "czekaj na Merkle root (~5 min)", done: ["mint","done"].includes(step), active: isWaiting },
            { n: 4, label: "mint on-chain",                  done: step === "done" },
          ].map(s => (
            <div key={s.n} className={`flex items-center gap-3 p-3 rounded-lg border text-sm transition-colors ${
              s.done
                ? "border-zinc-800 text-zinc-600"
                : s.active
                  ? "border-cyan-400/50 text-white bg-cyan-400/5"
                  : "border-zinc-800 text-zinc-400"
            }`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-bold ${
                s.done    ? "bg-zinc-800 text-zinc-500"
                : s.active  ? "bg-cyan-400 text-black animate-pulse"
                : "border border-zinc-700 text-zinc-600"
              }`}>
                {s.done ? "✓" : s.n}
              </span>
              {s.label}
              {s.active && <span className="ml-auto text-xs text-zinc-500">⏳</span>}
            </div>
          ))}
        </div>

        {/* Akcja */}
        <div className="space-y-3">
          {step === "idle" && (
            <button onClick={doKeygen}
              className="w-full bg-cyan-400 text-black font-bold py-3 rounded-lg hover:bg-cyan-300 transition-colors">
              generate key
            </button>
          )}
          {step === "waiting" && (
            <div className="text-center text-zinc-500 text-sm py-4">
              ⏳ czekam na cron backendu... (co 5 minut postuje Merkle root)
            </div>
          )}
          {step === "mint" && (
            <button onClick={doMint}
              className="w-full bg-cyan-400 text-black font-bold py-3 rounded-lg hover:bg-cyan-300 transition-colors">
              mint now — 0.0005 ETH
            </button>
          )}
          {step === "done" && (
            <div className="border border-green-500/30 bg-green-500/5 rounded-lg p-5 text-center">
              <div className="text-green-400 font-bold text-lg mb-2">✅ 500 QSIG zmintowane!</div>
              {txHash && (
                <a href={`${EXPLORERS[chain]}${txHash}`} target="_blank"
                  className="text-xs text-zinc-400 hover:text-white underline block mb-3">
                  → Zobacz transakcję na explorerze ↗
                </a>
              )}
              <p className="text-zinc-600 text-xs">Wróć jutro po kolejne 500 QSIG</p>
            </div>
          )}
          {step === "error" && (
            <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-4">
              <p className="text-red-400 text-sm mb-3">❌ {error}</p>
              <button
                onClick={() => { setStep("idle"); setLogs([]); setError(""); }}
                className="text-xs text-zinc-500 hover:text-white underline">
                zacznij od nowa
              </button>
            </div>
          )}
        </div>

        {/* Logi */}
        {logs.length > 0 && (
          <div className="mt-6 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-500 space-y-1 max-h-40 overflow-y-auto">
            {logs.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}
      </div>
    </main>
  );
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}
