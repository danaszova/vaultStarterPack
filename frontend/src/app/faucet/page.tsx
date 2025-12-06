'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, usePublicClient, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import MockERC20ABI from '@/abis/MockERC20.json';
import { MOCK_USDC_FUJI } from '@/config/constants';
import { Loader2, Coins, Wallet, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function FaucetPage() {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const [isMinting, setIsMinting] = useState(false);

    const {
        writeContractAsync: mintWriteAsync
    } = useWriteContract();

    const { data: balance, refetch: refetchBalance } = useReadContract({
        address: MOCK_USDC_FUJI,
        abi: MockERC20ABI.abi,
        functionName: 'balanceOf',
        args: [address],
        query: { enabled: !!address }
    });

    const handleMint = async () => {
        if (!address || !publicClient) return;
        setIsMinting(true);
        try {
            console.log("Minting tokens...");
            const hash = await mintWriteAsync({
                address: MOCK_USDC_FUJI,
                abi: MockERC20ABI.abi,
                functionName: 'mint',
                args: [address, parseUnits('1000', 6)], // USDC is 6 decimals
            });
            console.log("Waiting for mint confirmation...", hash);
            await publicClient.waitForTransactionReceipt({ hash });
            console.log("Mint confirmed!");
            refetchBalance();
            alert("Successfully minted 1000 DANA tokens!");
        } catch (err) {
            console.error("Mint failed:", err);
            alert("Mint failed. Check console.");
        } finally {
            setIsMinting(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#0a0b0f] text-white selection:bg-blue-500/30">
            <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] pointer-events-none opacity-20"></div>

            <Navbar />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12">
                <div className="max-w-2xl mx-auto text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
                        <Coins className="h-4 w-4" />
                        Testnet Faucet
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-gray-400 mb-6 tracking-tight">
                        Get Free DANA Tokens
                    </h1>
                    <p className="text-lg text-gray-400 leading-relaxed">
                        Mint free DANA test tokens to experiment with the CrossChain Vault strategies.
                        These tokens have no real value and are for testing on Avalanche Fuji only.
                    </p>
                </div>

                <div className="max-w-md mx-auto">
                    <div className="group relative bg-black/40 rounded-2xl border border-white/10 backdrop-blur-xl p-8 hover:border-blue-500/30 transition-all duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        <div className="flex items-center justify-between mb-8 p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                    <Wallet className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Your Balance</p>
                                    <p className="text-xl font-bold font-mono">
                                        {balance ? formatUnits(balance as bigint, 6) : '0'} DANA
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleMint}
                            disabled={isMinting || !address}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 flex justify-center items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {isMinting ? (
                                <Loader2 className="animate-spin h-6 w-6" />
                            ) : (
                                <Coins className="h-6 w-6 group-hover:scale-110 transition-transform" />
                            )}
                            {isMinting ? 'Minting Tokens...' : 'Mint 1000 DANA'}
                        </button>

                        {!address && (
                            <p className="text-center text-sm text-red-400 mt-4">
                                Please connect your wallet to mint tokens.
                            </p>
                        )}

                        <div className="mt-6 text-center">
                            <p className="text-xs text-gray-500">
                                Contract: <span className="font-mono text-gray-400">{MOCK_USDC_FUJI.slice(0, 6)}...{MOCK_USDC_FUJI.slice(-4)}</span>
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <a href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">
                            Back to Vaults <ArrowRight className="h-4 w-4" />
                        </a>
                    </div>
                </div>
            </div>
        </main>
    );
}
