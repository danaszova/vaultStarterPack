'use client';

import { useReadContract } from 'wagmi';
import { FACTORY_ADDRESS_FUJI } from '@/config/constants';
import StrategyFactoryABI from '@/abis/StrategyFactory.json';
import VaultCard from './VaultCard';
import { Loader2 } from 'lucide-react';

export default function VaultList() {
    const { data: count, isLoading } = useReadContract({
        address: FACTORY_ADDRESS_FUJI as `0x${string}`,
        abi: StrategyFactoryABI.abi,
        functionName: 'getStrategyCount',
    });

    // For MVP, just fetching the last 5 strategies or all if small count
    // In production, we'd use a subgraph or event indexing
    const total = count ? Number(count) : 0;
    const indices = Array.from({ length: total }, (_, i) => BigInt(i)).reverse(); // Show newest first

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Your Vaults</h2>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
                </div>
            ) : total === 0 ? (
                <div className="text-center py-16 px-6 text-gray-500 bg-white/5 rounded-2xl border border-white/10 border-dashed backdrop-blur-sm">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Loader2 className="h-8 w-8 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-1">No vaults found</h3>
                    <p className="text-gray-400">Create your first strategy vault to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {indices.map((index) => (
                        <VaultStrategyWrapper key={index.toString()} index={index} />
                    ))}
                </div>
            )}
        </div>
    );
}

function VaultStrategyWrapper({ index }: { index: bigint }) {
    const { data: address } = useReadContract({
        address: FACTORY_ADDRESS_FUJI as `0x${string}`,
        abi: StrategyFactoryABI.abi,
        functionName: 'getStrategy',
        args: [index],
    });

    if (!address) return null;

    return <VaultCard address={address as `0x${string}`} />;
}
