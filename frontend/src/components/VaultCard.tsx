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
        <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm hover:border-blue-500/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-white mb-1">Strategy Vault</h3>
                    <p className="text-xs text-gray-500 font-mono">{address.slice(0, 6)}...{address.slice(-4)}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold ${executed ? 'bg-green-900/50 text-green-400' : 'bg-blue-900/50 text-blue-400'}`}>
                    {executed ? 'EXECUTED' : 'ACTIVE'}
                </div>
            </div>

            <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Balance</span>
                    <span className="text-white font-mono">{balance ? formatUnits(balance as bigint, 18) : '0'} TEST</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Status</span>
                    <div className="flex items-center gap-1 text-white">
                        {locked ? <Lock className="h-3 w-3 text-orange-500" /> : <Unlock className="h-3 w-3 text-gray-500" />}
                        <span>{locked ? 'Locked' : 'Unlocked'}</span>
                    </div>
                </div>
            </div>

            <button
                onClick={handleExecute}
                disabled={executed || isPending || isConfirming}
                className={`w-full py-2 px-4 rounded-lg font-bold flex justify-center items-center gap-2 transition-colors ${executed
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
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
    );
}
