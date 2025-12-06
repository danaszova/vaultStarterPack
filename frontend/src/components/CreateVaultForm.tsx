'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseUnits } from 'viem';
import { FACTORY_ADDRESS_FUJI, HUB_ADDRESS_SEPOLIA, ROUTER_FUJI, LINK_FUJI, CHAIN_SELECTOR_SEPOLIA, MOCK_TOKEN_FUJI, MOCK_USDC_FUJI } from '@/config/constants';
import StrategyFactoryABI from '@/abis/StrategyFactory.json';
import TimeLockRuleABI from '@/abis/TimeLockRule.json';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function CreateVaultForm() {
    const { address } = useAccount();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const [amount, setAmount] = useState('10');
    const [lockPeriod, setLockPeriod] = useState('600'); // 10 mins
    const [name, setName] = useState('');
    const [status, setStatus] = useState('');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!address || !walletClient || !publicClient) return;

        try {
            setStatus('Deploying Rule...');

            // 1. Deploy TimeLockRule
            const endTime = BigInt(Math.floor(Date.now() / 1000)) + BigInt(lockPeriod);
            const deployHash = await walletClient.deployContract({
                abi: TimeLockRuleABI.abi,
                bytecode: TimeLockRuleABI.bytecode as `0x${string}`,
                args: [endTime],
                account: address,
            });

            console.log("Deploying rule...", deployHash);
            const receipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
            const ruleAddress = receipt.contractAddress;

            if (!ruleAddress) throw new Error("Rule deployment failed");
            console.log("Rule deployed at:", ruleAddress);

            setStatus('Creating Vault...');

            // 2. Create Strategy with Rule
            // Always use DANA (MOCK_USDC_FUJI)
            const tokenAddress = MOCK_USDC_FUJI;
            const params = {
                name: name || "Untitled Vault",
                inputAsset: tokenAddress,
                targetAsset: tokenAddress, // For simplicity, target same asset for now
                executionAmount: parseUnits(amount, 6), // DANA/USDC has 6 decimals
                lockPeriod: BigInt(lockPeriod),
                beneficiary: address,
                router: ROUTER_FUJI,
                hub: HUB_ADDRESS_SEPOLIA,
                destinationChainSelector: BigInt(CHAIN_SELECTOR_SEPOLIA),
                linkToken: LINK_FUJI,
                rules: [ruleAddress]
            };

            console.log("Calling writeContract with params:", params);

            writeContract({
                address: FACTORY_ADDRESS_FUJI,
                abi: StrategyFactoryABI.abi,
                functionName: 'createStrategy',
                args: [params],
            }, {
                onSuccess: () => {
                    console.log("Transaction sent!");
                    setStatus('');
                },
                onError: (error) => {
                    console.error("Transaction failed:", error);
                    setStatus('');
                }
            });
        } catch (err) {
            console.error("Error in handleCreate:", err);
            setStatus('');
        }
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
                        <label className="block text-sm font-medium text-gray-400 mb-2">Vault Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all"
                            placeholder="e.g. My Savings"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Asset</label>
                        <div className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-gray-400 cursor-not-allowed">
                            DANA (Test Token)
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Target Execution Amount (DANA)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all"
                                placeholder="0.0"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            The strategy will execute automatically once the vault balance reaches this amount.
                        </p>
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
                        disabled={isPending || isConfirming || !!status}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {(isPending || isConfirming || !!status) && <Loader2 className="animate-spin h-5 w-5" />}
                        {status ? status : isPending ? 'Confirming...' : isConfirming ? 'Deploying Vault...' : 'Create Vault'}
                    </button>

                    {isSuccess && (
                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Vault created successfully!
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm break-words">
                            <p className="font-bold mb-1">Error:</p>
                            {error.message}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
