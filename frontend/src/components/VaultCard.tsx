'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits } from 'viem';
import StrategyVaultABI from '@/abis/StrategyVault.json';
import { Loader2, Lock, Unlock, ArrowRightLeft } from 'lucide-react';

interface VaultCardProps {
    address: `0x${string}`;
}

export default function VaultCard({ address }: VaultCardProps) {
    const { data: balance } = useReadContract({
        address,
        abi: StrategyVaultABI.abi,
        functionName: 'getBalance',
    });

    const { data: status } = useReadContract({
        address,
        abi: StrategyVaultABI.abi,
        functionName: 'getStatus',
    });

    const { data: hash, writeContract, isPending } = useWriteContract();
    const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

    const handleExecute = () => {
        writeContract({
            address,
            abi: StrategyVaultABI.abi,
            functionName: 'executeStrategy',
        });
    };

    const [executed, locked, timeRemaining] = (status as [boolean, boolean, bigint]) || [false, false, 0n];

    return (
        <div className="group relative bg-black/40 rounded-2xl border border-white/10 backdrop-blur-xl hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

            <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                            <Lock className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white leading-tight">Strategy Vault</h3>
                            <p className="text-xs text-gray-500 font-mono mt-1">{address.slice(0, 6)}...{address.slice(-4)}</p>
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${executed
                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                        : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                        {executed ? 'EXECUTED' : 'ACTIVE'}
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-sm text-gray-400">Balance</span>
                        <span className="text-white font-mono font-bold">{balance ? formatUnits(balance as bigint, 18) : '0'} TEST</span>
                    </div>
                    <div className="flex justify-between items-center text-sm px-1">
                        <span className="text-gray-400">Status</span>
                        <div className="flex items-center gap-2 text-white">
                            {locked ? (
                                <span className="flex items-center gap-1.5 text-orange-400">
                                    <Lock className="h-3 w-3" /> Locked
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 text-gray-400">
                                    <Unlock className="h-3 w-3" /> Unlocked
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleExecute}
                    disabled={executed || isPending || isConfirming}
                    className={`w-full py-3 px-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-all ${executed
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/20'
                        }`}
                >
                    {(isPending || isConfirming) ? (
                        <Loader2 className="animate-spin h-4 w-4" />
                    ) : (
                        <ArrowRightLeft className="h-4 w-4" />
                    )}
                    {executed ? 'Executed' : 'Execute Strategy'}
                </button>
            </div>
        </div>
    );
}
