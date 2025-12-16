'use client';

import { useReadContract, useAccount, useChainId, useSwitchChain, useBlockNumber } from 'wagmi';
import { avalancheFuji } from 'wagmi/chains';
import { PROXY_SYSTEM_FUJI } from '@/config/constants';
import VaultProxyFactoryABI from '@/abis/VaultProxyFactory.json';
import VaultCard from './VaultCard';
import { Loader2, Wallet, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function VaultList() {
    const { isConnected, address } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();
    const { data: blockNumber } = useBlockNumber({ watch: true });
    
    const isCorrectNetwork = chainId === avalancheFuji.id;

    const [lastRefetchBlock, setLastRefetchBlock] = useState<bigint>(0n);
    const [manualRefreshCount, setManualRefreshCount] = useState(0);

    const { data: count, isLoading, isError, error, refetch } = useReadContract({
        address: PROXY_SYSTEM_FUJI.VaultProxyFactory as `0x${string}`,
        abi: VaultProxyFactoryABI.abi,
        functionName: 'getVaultCount',
        query: {
            refetchInterval: 3000, // Poll every 3 seconds as a backup
            enabled: isConnected, // Only fetch if connected
        }
    });

    console.log("VaultList: isConnected", isConnected, "address", address, "count", count, "isLoading", isLoading, "isError", isError, "blockNumber", blockNumber);

    if (isError) {
        console.error("Error fetching strategy count:", error);
    }

    // Enhanced polling based on block changes and manual refresh
    useEffect(() => {
        if (!isConnected || !isCorrectNetwork || !blockNumber) return;
        
        // Refetch if 3 blocks have passed since last refetch (more frequent than before)
        if (blockNumber - lastRefetchBlock > 3n) {
            console.log(`Block advanced from ${lastRefetchBlock} to ${blockNumber}, refetching vault count`);
            refetch();
            setLastRefetchBlock(blockNumber);
        }
    }, [blockNumber, isConnected, isCorrectNetwork, lastRefetchBlock, refetch]);

    // Refetch when wallet address changes (user switches account)
    useEffect(() => {
        if (isConnected && address) {
            console.log('Wallet address changed, refetching vaults');
            refetch();
        }
    }, [address, isConnected, refetch]);

    // Manual refresh handler
    const handleManualRefresh = () => {
        console.log('Manual refresh triggered');
        setManualRefreshCount(prev => prev + 1);
        refetch();
    };

    if (!isConnected) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">Your Vaults</h2>
                <div className="text-center py-16 px-6 text-gray-500 bg-white/5 rounded-2xl border border-white/10 border-dashed backdrop-blur-sm">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Wallet className="h-8 w-8 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-1">Wallet not connected</h3>
                    <p className="text-gray-400">Please connect your wallet to view your vaults.</p>
                </div>
            </div>
        );
    }

    if (!isCorrectNetwork) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">Your Vaults</h2>
                <div className="text-center py-16 px-6 text-gray-500 bg-white/5 rounded-2xl border border-white/10 border-dashed backdrop-blur-sm">
                    <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full"></div>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-1">Wrong Network</h3>
                    <p className="text-gray-400 mb-4">Please switch to Avalanche Fuji testnet to view your vaults.</p>
                    <button
                        onClick={() => switchChain({ chainId: avalancheFuji.id })}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-lg transition-colors"
                    >
                        Switch to Avalanche Fuji
                    </button>
                    <p className="text-xs text-gray-500 mt-4">Current network ID: {chainId}</p>
                </div>
            </div>
        );
    }

    // For MVP, just fetching the last 5 strategies or all if small count
    // In production, we'd use a subgraph or event indexing
    const total = count ? Number(count) : 0;
    console.log("VaultList: total vaults", total);
    const indices = Array.from({ length: total }, (_, i) => BigInt(i)).reverse(); // Show newest first
    console.log("VaultList: indices", indices);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Your Vaults</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleManualRefresh}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg border border-white/10 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <div className="text-xs text-gray-500 px-2 py-1 bg-white/5 rounded border border-white/5">
                        {total} vault{total !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            {isError ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center">
                    <p className="font-bold">Error loading vaults</p>
                    <p className="text-sm mt-1">{error?.message || "Unknown error occurred"}</p>
                    <div className="text-xs text-gray-500 mt-2 p-2 bg-black/20 rounded">
                        <p>Factory: {PROXY_SYSTEM_FUJI.VaultProxyFactory}</p>
                        <p>Network ID: {chainId} {isCorrectNetwork ? '(Correct)' : '(Wrong)'}</p>
                        <p>Block: {blockNumber?.toString() || 'Unknown'}</p>
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-xs font-bold transition-colors"
                    >
                        Retry
                    </button>
                </div>
            ) : isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="animate-spin h-10 w-10 text-blue-500" />
                    <p className="text-gray-400 text-sm">Loading vaults from factory...</p>
                    <div className="text-xs text-gray-500 text-center">
                        <p>Factory: {PROXY_SYSTEM_FUJI.VaultProxyFactory.slice(0, 10)}...</p>
                        <p>Refresh count: {manualRefreshCount}</p>
                    </div>
                </div>
            ) : total === 0 ? (
                <div className="text-center py-16 px-6 text-gray-500 bg-white/5 rounded-2xl border border-white/10 border-dashed backdrop-blur-sm">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Loader2 className="h-8 w-8 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-1">No vaults found</h3>
                    <p className="text-gray-400 mb-4">Create your first strategy vault to get started.</p>
                    <div className="text-xs text-gray-500 mt-2 space-y-1 bg-black/20 p-3 rounded-lg">
                        <p>Connected wallet: {address?.slice(0, 8)}...{address?.slice(-6)}</p>
                        <p>Factory: {PROXY_SYSTEM_FUJI.VaultProxyFactory}</p>
                        <p>Network: {chainId} {isCorrectNetwork ? '(Avalanche Fuji)' : '(Wrong network)'}</p>
                        <p>Block: {blockNumber?.toString() || 'Unknown'}</p>
                        <p>Refresh count: {manualRefreshCount}</p>
                    </div>
                    <button
                        onClick={handleManualRefresh}
                        className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 text-sm font-medium transition-colors"
                    >
                        Check Again
                    </button>
                </div>
            ) : (
                <>
                    <div className="mb-4 text-sm text-gray-400 flex justify-between items-center">
                        <span>Showing {total} vault{total !== 1 ? 's' : ''} (newest first)</span>
                        <span className="text-xs">Updated at block {blockNumber?.toString()}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {indices.map((index) => (
                            <VaultStrategyWrapper key={index.toString()} index={index} manualRefreshCount={manualRefreshCount} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function VaultStrategyWrapper({ index, manualRefreshCount }: { index: bigint, manualRefreshCount: number }) {
    const { data: address, isLoading, error, refetch } = useReadContract({
        address: PROXY_SYSTEM_FUJI.VaultProxyFactory as `0x${string}`,
        abi: VaultProxyFactoryABI.abi,
        functionName: 'getVault',
        args: [index],
    });

    // Refetch when manualRefreshCount changes (triggered by parent)
    useEffect(() => {
        refetch();
    }, [manualRefreshCount, refetch]);

    console.log(`VaultStrategyWrapper: index ${index} -> address ${address}, isLoading: ${isLoading}, error: ${error}`);

    if (isLoading) {
        return (
            <div className="bg-black/40 rounded-2xl border border-white/10 p-6 animate-pulse">
                <div className="h-6 bg-white/5 rounded mb-4"></div>
                <div className="space-y-3">
                    <div className="h-4 bg-white/5 rounded"></div>
                    <div className="h-4 bg-white/5 rounded"></div>
                    <div className="h-10 bg-white/5 rounded"></div>
                </div>
            </div>
        );
    }

    if (!address) {
        console.warn(`No vault address found for index ${index}`);
        return null;
    }

    if (error) {
        console.error(`Error fetching vault at index ${index}:`, error);
        return (
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                <p className="text-red-400 text-sm font-bold">Error loading vault</p>
                <p className="text-red-400/70 text-xs mt-1">Index: {index.toString()}</p>
                <p className="text-red-400/70 text-xs mt-1">{error.message}</p>
            </div>
        );
    }

    return <VaultCard address={address as `0x${string}`} />;
}
