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
        <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm">
            <h2 className="text-xl font-bold mb-4 text-white">Create Strategy Vault</h2>
            <form onSubmit={handleCreate} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Amount (TEST Token)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-black/50 border border-gray-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Lock Period (Seconds)</label>
                    <input
                        type="number"
                        value={lockPeriod}
                        onChange={(e) => setLockPeriod(e.target.value)}
                        className="w-full bg-black/50 border border-gray-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isPending || isConfirming}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex justify-center items-center gap-2"
                >
                    {(isPending || isConfirming) && <Loader2 className="animate-spin h-4 w-4" />}
                    {isPending ? 'Confirming...' : isConfirming ? 'Deploying...' : 'Create Vault'}
                </button>

                {isSuccess && (
                    <div className="p-3 bg-green-900/30 border border-green-800 rounded-lg text-green-400 text-sm">
                        Vault created successfully!
                    </div>
                )}
            </form>
        </div>
    );
}
