'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseUnits } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  SUPPORTED_TOKENS,
  PROXY_SYSTEM_FUJI
} from '@/config/constants';
import VaultProxyFactoryABI from '@/abis/VaultProxyFactory.json';
import TimeLockRuleABI from '@/abis/TimeLockRule.json';
import PriceRuleABI from '@/abis/PriceRule.json';
import PerformanceRuleABI from '@/abis/PerformanceRule.json';
import { Loader2, Wallet, Clock, TrendingUp, Target } from 'lucide-react';

export default function ProxyVaultForm() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [depositToken, setDepositToken] = useState<keyof typeof SUPPORTED_TOKENS>('USDC_T');
  const [status, setStatus] = useState('');

  // Custom rule parameters
  const [timeLockDuration, setTimeLockDuration] = useState('1'); // seconds (1 second default for testing)
  const [priceTarget, setPriceTarget] = useState(''); // Will be set to current price * 2 after fetching
  const [priceComparison, setPriceComparison] = useState<'greater' | 'less'>('greater');
  const [performanceTarget, setPerformanceTarget] = useState('1000'); // USDC_T amount
  const [performanceToken, setPerformanceToken] = useState<'USDC_T' | 'DANA'>('USDC_T');

  // Calculate unlock time for preview
  const calculateUnlockTime = () => {
    const seconds = parseInt(timeLockDuration);
    if (isNaN(seconds) || seconds <= 0) return null;

    const addedSeconds = Math.max(1, seconds);
    const unlockTimestamp = Math.floor(Date.now() / 1000) + addedSeconds;
    return {
      timestamp: unlockTimestamp,
      date: new Date(unlockTimestamp * 1000).toLocaleString(),
      secondsFromNow: addedSeconds
    };
  };

  const unlockPreview = calculateUnlockTime();

  const handleCreateProxyVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !publicClient || !walletClient) return;

    try {
      setStatus('Deploying custom rules...');

      // DEBUG: Log all input values
      console.log("DEBUG - Creating vault with parameters:", {
        timeLockDuration,
        timeLockDurationAsNumber: Number(timeLockDuration),
        priceTarget,
        priceComparison,
        performanceTarget,
        performanceToken,
        depositToken
      });

      // Deploy TimeLockRule
      const currentTime = Math.floor(Date.now() / 1000);
      const secondsValue = parseFloat(timeLockDuration);
      if (isNaN(secondsValue) || secondsValue < 0) {
        throw new Error(`Invalid TimeLock duration: ${timeLockDuration}. Please enter a valid number.`);
      }

      const addedSeconds = Math.max(1, Math.floor(secondsValue));
      const unlockTime = BigInt(currentTime + addedSeconds);
      console.log("Deploying TimeLockRule with unlockTime:", unlockTime.toString(), "addedSeconds:", addedSeconds, "inputSeconds:", timeLockDuration);

      const timeLockHash = await walletClient.deployContract({
        abi: TimeLockRuleABI.abi,
        bytecode: TimeLockRuleABI.bytecode as `0x${string}`,
        args: [unlockTime],
        account: walletClient.account,
      });
      const timeLockReceipt = await publicClient.waitForTransactionReceipt({ hash: timeLockHash });
      const timeLockAddress = timeLockReceipt.contractAddress!;
      console.log("TimeLockRule deployed at:", timeLockAddress);

      setStatus('Deploying PriceRule...');

      // For testing, we'll use a target price of $20 (2x testnet price of ~$10)
      // In production, we would fetch current price and double it
      const targetPriceValue = priceTarget ? parseFloat(priceTarget) : 20; // Default $20 if not set
      const targetPriceInWei = BigInt(Math.floor(targetPriceValue * 10 ** 8)); // 8 decimals for Chainlink

      const priceHash = await walletClient.deployContract({
        abi: PriceRuleABI.abi,
        bytecode: PriceRuleABI.bytecode as `0x${string}`,
        args: [PROXY_SYSTEM_FUJI.MockChainlinkAggregator, targetPriceInWei, priceComparison === 'greater'],
        account: walletClient.account,
      });
      const priceReceipt = await publicClient.waitForTransactionReceipt({ hash: priceHash });
      const priceAddress = priceReceipt.contractAddress!;
      console.log("PriceRule deployed at:", priceAddress);

      setStatus('Deploying PerformanceRule...');

      // Use selected performance token
      const perfTokenAddress = SUPPORTED_TOKENS[performanceToken].address;
      const perfTokenDecimals = SUPPORTED_TOKENS[performanceToken].decimals;
      const targetBalance = parseUnits(performanceTarget, perfTokenDecimals);

      const perfHash = await walletClient.deployContract({
        abi: PerformanceRuleABI.abi,
        bytecode: PerformanceRuleABI.bytecode as `0x${string}`,
        args: [perfTokenAddress, targetBalance],
        account: walletClient.account,
      });
      const perfReceipt = await publicClient.waitForTransactionReceipt({ hash: perfHash });
      const perfAddress = perfReceipt.contractAddress!;
      console.log("PerformanceRule deployed at:", perfAddress);

      // Now create vault with the deployed rule addresses
      setStatus('Creating Proxy Vault...');
      const failsafeDuration = 365 * 24 * 60 * 60; // 1 year in seconds

      const selectedRules = [timeLockAddress, priceAddress, perfAddress];

      const vaultHash = await writeContractAsync({
        address: PROXY_SYSTEM_FUJI.VaultProxyFactory as `0x${string}`,
        abi: VaultProxyFactoryABI.abi,
        functionName: 'createVault',
        args: [
          address, // owner
          SUPPORTED_TOKENS[depositToken].address, // depositToken
          failsafeDuration, // failsafeDuration (1 year)
          selectedRules // initialRules
        ],
      });

      console.log("Proxy vault creation tx:", vaultHash);
      setStatus('Confirming vault creation...');
      await publicClient.waitForTransactionReceipt({ hash: vaultHash });

      setTimeout(() => {
        setStatus('');
        alert(`Proxy Vault Created Successfully!

Custom Rules Deployed:
• TimeLock: ${timeLockDuration} seconds (unlocks in ${addedSeconds} seconds)
• Price: ${priceComparison === 'greater' ? '>' : '<'} $${targetPriceValue}
• Performance: ${performanceTarget} ${performanceToken}

Vault Features:
• Upgradable proxy architecture
• Sequential rule execution
• 0.1% deposit fee
• 2% success fee on profits
• 1-year failsafe timer`);
      }, 2000);

    } catch (err: any) {
      console.error(err);
      alert(`Failed to create proxy vault: ${err.message || 'See console for details'}`);
      setStatus('');
    }
  };

  if (!isConnected) {
    return (
      <div className="relative group h-full">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-30 transition duration-500 blur"></div>
        <div className="relative bg-black/40 p-8 rounded-2xl border border-white/10 backdrop-blur-xl flex flex-col items-center justify-center text-center h-full min-h-[400px]">
          <div className="p-4 bg-blue-500/10 rounded-full mb-6">
            <Wallet className="h-10 w-10 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Connect Wallet</h2>
          <p className="text-gray-400 mb-8 max-w-xs leading-relaxed">
            Connect your wallet to create and manage upgradable proxy vaults with custom rules.
          </p>
          <div className="scale-110">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group h-full">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-30 transition duration-500 blur"></div>
      <div className="relative bg-black/40 p-6 rounded-2xl border border-white/10 backdrop-blur-xl h-full flex flex-col">
        <form onSubmit={handleCreateProxyVault} className="flex flex-col h-full gap-5">

          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Create Proxy Vault
              </h2>
            </div>
            <p className="text-xs text-gray-500 ml-11">
              Deploy a new vault with sequential execution rules.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
            {/* Deposit Token Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Deposit Token</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(SUPPORTED_TOKENS).map(([symbol, token]) => (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() => setDepositToken(symbol as keyof typeof SUPPORTED_TOKENS)}
                    className={`p-3 rounded-xl border transition-all text-left ${depositToken === symbol
                      ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                  >
                    <div className="font-bold text-white text-sm">{token.symbol}</div>
                    <div className="text-[10px] text-gray-400 truncate">{token.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Rules Configuration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Strategy Rules</label>
                <div className="flex items-center gap-2">
                  {/* Compact toggle could go here if needed, but let's keep it expanded by default for clarity */}
                </div>
              </div>

              <div className="space-y-4">
                {/* 1. TimeLock Rule */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3 hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-bold text-white">1. Time Lock</span>
                  </div>

                  <div className="space-y-2">
                    <div className="relative group/input">
                      <input
                        type="number"
                        value={timeLockDuration}
                        onChange={(e) => setTimeLockDuration(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg pl-3 pr-16 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 transition-all font-mono"
                        placeholder="Duration"
                        min="1"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-gray-500 font-medium">seconds</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: '1s', val: '1', color: 'blue' },
                        { label: '1m', val: '60', color: 'purple' },
                        { label: '5m', val: '300', color: 'pink' }
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setTimeLockDuration(preset.val)}
                          className={`text-xs py-1.5 rounded-lg border bg-${preset.color}-500/10 border-${preset.color}-500/20 text-${preset.color}-300 hover:bg-${preset.color}-500/20 transition-all font-medium`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {unlockPreview && (
                      <div className="text-[10px] text-blue-300/80 bg-blue-900/10 px-2 py-1.5 rounded border border-blue-500/10 mt-2">
                        Unlocks in {unlockPreview.secondsFromNow}s • {unlockPreview.date}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Price Rule */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3 hover:border-purple-500/30 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-bold text-white">2. Price Target</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <select
                        value={priceComparison}
                        onChange={(e) => setPriceComparison(e.target.value as 'greater' | 'less')}
                        className="bg-black/20 border border-white/10 rounded-lg px-2 py-2 text-sm text-white outline-none focus:border-purple-500/50 cursor-pointer"
                      >
                        <option value="greater">{'>'}</option>
                        <option value="less">{'<'}</option>
                      </select>
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={priceTarget}
                          onChange={(e) => setPriceTarget(e.target.value)}
                          className="w-full bg-black/20 border border-white/10 rounded-lg pl-3 pr-12 py-2 text-sm text-white outline-none focus:border-purple-500/50 font-mono"
                          placeholder="20.00"
                          step="0.01"
                        />
                        <span className="absolute right-3 top-2 text-xs text-gray-500 font-medium">USD</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500">
                      Target AVAX Price
                    </p>
                  </div>
                </div>

                {/* 3. Performance Rule */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3 hover:border-pink-500/30 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-pink-400" />
                    <span className="text-sm font-bold text-white">3. Balance Target</span>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={performanceTarget}
                        onChange={(e) => setPerformanceTarget(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg pl-3 pr-2 py-2 text-sm text-white outline-none focus:border-pink-500/50 font-mono"
                        placeholder="1000"
                      />
                    </div>
                    <select
                      value={performanceToken}
                      onChange={(e) => setPerformanceToken(e.target.value as 'USDC_T' | 'DANA')}
                      className="w-24 bg-black/20 border border-white/10 rounded-lg px-2 py-2 text-sm text-white outline-none focus:border-pink-500/50"
                    >
                      <option value="USDC_T">USDC</option>
                      <option value="DANA">DANA</option>
                    </select>
                  </div>
                </div>

              </div>
            </div>

            {/* Fees */}
            <div className="p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
              <div className="flex justify-between items-center text-[10px] text-yellow-500/80 uppercase font-bold tracking-wider mb-2">
                <span>Protocol Fees</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                <div>Deposit: <span className="text-white font-mono">0.1%</span></div>
                <div>Success: <span className="text-white font-mono">2.0%</span></div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending || isConfirming || !!status}
              className="w-full group/btn relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <div className="relative z-10 flex justify-center items-center gap-2">
                {(isPending || isConfirming || !!status) && <Loader2 className="animate-spin h-5 w-5" />}
                <span>{status ? status : isPending ? 'Confirming...' : isConfirming ? 'Creating...' : 'Deploy Vault'}</span>
              </div>
            </button>

            {/* Status Messages */}
            {(isSuccess && !status) && (
              <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0"></div>
                Vault created successfully!
              </div>
            )}

            {error && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs break-words animate-in fade-in slide-in-from-top-2">
                <span className="font-bold block mb-1">Error:</span> {error.message}
              </div>
            )}
          </div>

        </form>
      </div>
    </div>
  );
}
