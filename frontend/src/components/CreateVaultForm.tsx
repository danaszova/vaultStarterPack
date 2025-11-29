'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { FACTORY_ADDRESS_FUJI, HUB_ADDRESS_SEPOLIA, ROUTER_FUJI, LINK_FUJI, CHAIN_SELECTOR_SEPOLIA, MOCK_TOKEN_FUJI } from '@/config/constants';
import StrategyFactoryABI from '@/abis/StrategyFactory.json';
import { Loader2 } from 'lucide-react';

export default function CreateVaultForm() {
    const { address } = useAccount();
    const { data: hash, writeContract, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const [amount, setAmount] = useState('10');
    const [lockPeriod, setLockPeriod] = useState('600'); // 10 mins

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!address) return;

        const params = {
            inputAsset: MOCK_TOKEN_FUJI, // Default to mock for now
            targetAsset: MOCK_TOKEN_FUJI,
            oracle: address, // Mock oracle
            triggerCondition: BigInt(Math.floor(Date.now() / 1000) - 3600), // Immediate trigger
            executionAmount: parseUnits(amount, 18),
            lockPeriod: BigInt(lockPeriod),
            beneficiary: address,
            conditionType: true,
            router: ROUTER_FUJI,
            hub: HUB_ADDRESS_SEPOLIA,
            destinationChainSelector: BigInt(CHAIN_SELECTOR_SEPOLIA),
            linkToken: LINK_FUJI
        };

        writeContract({
            address: FACTORY_ADDRESS_FUJI,
            abi: StrategyFactoryABI.abi,
            functionName: 'createStrategy',
            args: [params],
        });
    };

    return (
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-30 transition duration-500 blur"></div>
            <div className="relative bg-black/40 p-8 rounded-2xl border border-white/10 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Loader2 className="h-6 w-6 text-blue-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Create Strategy Vault</h2>
                </div>

                <form onSubmit={handleCreate} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Amount (TEST Token)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all"
                                placeholder="0.00"
                            />
                            <div className="absolute right-3 top-3 text-sm text-gray-500 font-mono">TEST</div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Lock Period (Seconds)</label>
                        <input
                            type="number"
                            value={lockPeriod}
                            onChange={(e) => setLockPeriod(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isPending || isConfirming}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {(isPending || isConfirming) && <Loader2 className="animate-spin h-5 w-5" />}
                        {isPending ? 'Confirming...' : isConfirming ? 'Deploying...' : 'Create Vault'}
                    </button>

                    {isSuccess && (
                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Vault created successfully!
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
