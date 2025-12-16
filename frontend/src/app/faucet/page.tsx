'use client';

import { useState } from 'react';
import { useWriteContract, useAccount, usePublicClient, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import MockERC20ABI from '@/abis/MockERC20.json';
import { SUPPORTED_TOKENS, type TokenSymbol } from '@/config/constants';
import { Loader2, Coins, Wallet, ArrowRight, ChevronDown } from 'lucide-react';

export default function FaucetPage() {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const [isMinting, setIsMinting] = useState(false);
    const [selectedToken, setSelectedToken] = useState<TokenSymbol>('DANA');

    const {
        writeContractAsync: mintWriteAsync
    } = useWriteContract();

    // Get balances for all tokens only when connected
    const danaBalance = useReadContract({
        address: SUPPORTED_TOKENS.DANA.address,
        abi: MockERC20ABI.abi,
        functionName: 'balanceOf',
        args: [address],
        query: { 
            enabled: !!address,
            refetchOnWindowFocus: false // Reduce unnecessary refetches
        }
    });

    const usdcTBalance = useReadContract({
        address: SUPPORTED_TOKENS.USDC_T.address,
        abi: MockERC20ABI.abi,
        functionName: 'balanceOf',
        args: [address],
        query: { 
            enabled: !!address,
            refetchOnWindowFocus: false // Reduce unnecessary refetches
        }
    });

    const handleMint = async () => {
        if (!address || !publicClient) return;
        setIsMinting(true);
        try {
            const tokenConfig = SUPPORTED_TOKENS[selectedToken];
            console.log(`Minting ${selectedToken} tokens...`);
            
            const hash = await mintWriteAsync({
                address: tokenConfig.address,
                abi: MockERC20ABI.abi,
                functionName: 'mint',
                args: [address, parseUnits('1000', tokenConfig.decimals)],
            });
            
            console.log("Waiting for mint confirmation...", hash);
            await publicClient.waitForTransactionReceipt({ hash });
            console.log("Mint confirmed!");
            
            // Refetch balances
            danaBalance.refetch();
            usdcTBalance.refetch();
            
            alert(`Successfully minted 1000 ${selectedToken} tokens!`);
        } catch (err) {
            console.error("Mint failed:", err);
            alert(`Mint failed. Check console. Error: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setIsMinting(false);
        }
    };

    const getTokenBalance = (token: TokenSymbol) => {
        if (token === 'DANA') {
            return danaBalance.data ? formatUnits(danaBalance.data as bigint, SUPPORTED_TOKENS.DANA.decimals) : '0';
        } else {
            return usdcTBalance.data ? formatUnits(usdcTBalance.data as bigint, SUPPORTED_TOKENS.USDC_T.decimals) : '0';
        }
    };


    return (
        <main className="min-h-screen bg-[#0a0b0f] text-white selection:bg-blue-500/30">
            <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] pointer-events-none opacity-20"></div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12">
                <div className="max-w-2xl mx-auto text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
                        <Coins className="h-4 w-4" />
                        Testnet Faucet
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-gray-400 mb-6 tracking-tight">
                        Get Free Test Tokens
                    </h1>
                    <p className="text-lg text-gray-400 leading-relaxed">
                        Mint free test tokens to experiment with the CrossChain Vault strategies.
                        These tokens have no real value and are for testing on Avalanche Fuji only.
                    </p>
                </div>

                <div className="max-w-md mx-auto">
                    <div className="group relative bg-black/40 rounded-2xl border border-white/10 backdrop-blur-xl p-8 hover:border-blue-500/30 transition-all duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                        {/* Token Balances Header */}
                        <div className="flex items-center justify-between mb-6 p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                    <Wallet className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Available Test Tokens</p>
                                    <p className="text-sm text-gray-400">Separate balances for DANA and USDC_T</p>
                                </div>
                            </div>
                        </div>

                        {/* Token Balances Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-400">DANA Balance</span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${selectedToken === 'DANA' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                        DANA
                                    </span>
                                </div>
                                <p className="text-lg font-bold font-mono">
                                    {getTokenBalance('DANA')}
                                </p>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-400">USDC_T Balance</span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${selectedToken === 'USDC_T' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                        USDC_T
                                    </span>
                                </div>
                                <p className="text-lg font-bold font-mono">
                                    {getTokenBalance('USDC_T')}
                                </p>
                            </div>
                        </div>

                        {/* Token Selector */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Select Token to Mint
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedToken}
                                    onChange={(e) => setSelectedToken(e.target.value as TokenSymbol)}
                                    className="w-full bg-black/60 border border-white/10 rounded-xl py-3 px-4 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all"
                                >
                                    {Object.entries(SUPPORTED_TOKENS).map(([symbol, config]) => (
                                        <option key={symbol} value={symbol}>
                                            {config.name} ({symbol})
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                                    <ChevronDown className="h-5 w-5 text-gray-400" />
                                </div>
                            </div>
                        </div>

                        {/* Mint Button */}
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
                            {isMinting ? `Minting ${selectedToken}...` : `Mint 1000 ${selectedToken}`}
                        </button>

                        {!address && (
                            <p className="text-center text-sm text-red-400 mt-4">
                                Please connect your wallet to mint tokens.
                            </p>
                        )}

                        {/* Contract Info */}
                        <div className="mt-6 text-center">
                            <p className="text-xs text-gray-500">
                                Selected Contract: <span className="font-mono text-gray-400">
                                    {SUPPORTED_TOKENS[selectedToken].address.slice(0, 6)}...{SUPPORTED_TOKENS[selectedToken].address.slice(-4)}
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Back to Vaults */}
                    <div className="mt-8 text-center">
                        <a href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">
                            Back to Vaults <ArrowRight className="h-4 w-4" />
                        </a>
                    </div>

                    {/* Token Information */}
                    <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/5">
                        <h3 className="text-sm font-medium text-gray-400 mb-2">Token Information</h3>
                        <div className="space-y-2 text-xs text-gray-500">
                            <p>• <span className="text-gray-400">DANA</span>: Test token with 6 decimals (mimics USDC)</p>
                            <p>• <span className="text-gray-400">USDC_T</span>: Additional test token for unlimited liquidity testing</p>
                            <p>• Both tokens are mintable from this faucet for testing purposes only</p>
                            <p>• Tokens have no real value and exist only on Avalanche Fuji testnet</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
