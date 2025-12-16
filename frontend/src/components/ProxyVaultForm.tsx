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
import { Loader2, Wallet, Clock, TrendingUp, Target, Settings, ChevronDown, ChevronUp } from 'lucide-react';

export default function ProxyVaultForm() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [depositToken, setDepositToken] = useState<keyof typeof SUPPORTED_TOKENS>('USDC_T');
  const [status, setStatus] = useState('');
  const [showCustomRules, setShowCustomRules] = useState(true);
  
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
      const targetPriceInWei = BigInt(Math.floor(targetPriceValue * 10**8)); // 8 decimals for Chainlink
      
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
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-30 transition duration-500 blur"></div>
      <div className="relative bg-black/40 p-8 rounded-2xl border border-white/10 backdrop-blur-xl">
        <form onSubmit={handleCreateProxyVault} className="bg-[#1a1b23] p-8 rounded-2xl border border-white/10 h-full flex flex-col gap-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Create Custom Proxy Vault
            </h2>
            <div className="ml-auto text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
              Custom Rules
            </div>
          </div>

          {/* System Info */}
          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <p className="text-sm text-blue-300">
              <strong>Custom Rule Deployment:</strong> Each vault deploys its own rule contracts with your parameters. Higher gas cost but maximum flexibility.
            </p>
          </div>

          {/* Deposit Token Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Deposit Token</label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(SUPPORTED_TOKENS).map(([symbol, token]) => (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => setDepositToken(symbol as keyof typeof SUPPORTED_TOKENS)}
                  className={`p-4 rounded-xl border transition-all ${depositToken === symbol ? 'bg-blue-500/10 border-blue-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                >
                  <div className="text-left">
                    <div className="font-bold text-white">{token.symbol}</div>
                    <div className="text-xs text-gray-400 mt-1">{token.name}</div>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Get test tokens from the <a href="/faucet" className="text-blue-400 underline">faucet page</a>
            </p>
          </div>

          {/* Custom Rules Configuration */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-400">Custom Rule Configuration</label>
              <button
                type="button"
                onClick={() => setShowCustomRules(!showCustomRules)}
                className="text-xs bg-white/5 hover:bg-white/10 text-gray-400 px-2 py-1 rounded border border-white/10 flex items-center gap-1"
              >
                <Settings className="h-3 w-3" />
                {showCustomRules ? 'Hide' : 'Show'} 
                {showCustomRules ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
            
            {showCustomRules && (
              <div className="space-y-4 p-4 bg-white/5 border border-white/10 rounded-xl">
                {/* TimeLock Rule */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/10 rounded">
                      <Clock className="h-4 w-4 text-blue-400" />
                    </div>
                    <label className="text-sm font-medium text-white">TimeLock Rule</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={timeLockDuration}
                      onChange={(e) => {
                        console.log("TimeLock input changed:", e.target.value);
                        setTimeLockDuration(e.target.value);
                      }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                      placeholder="Duration in seconds"
                      min="1"
                      max="31536000"
                    />
                    <span className="text-sm text-gray-400 whitespace-nowrap">seconds</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTimeLockDuration('1');
                        console.log("Reset to 1 second");
                      }}
                      className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-2 py-1 rounded border border-blue-500/30"
                      title="Set to 1 second for testing"
                    >
                      1s
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTimeLockDuration('60');
                        console.log("Reset to 1 minute");
                      }}
                      className="text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-2 py-1 rounded border border-purple-500/30"
                      title="Set to 1 minute for testing"
                    >
                      1m
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTimeLockDuration('300');
                        console.log("Reset to 5 minutes");
                      }}
                      className="text-xs bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 px-2 py-1 rounded border border-pink-500/30"
                      title="Set to 5 minutes for testing"
                    >
                      5m
                    </button>
                  </div>
                    <p className="text-xs text-gray-500">
                    Vault will unlock after {timeLockDuration} seconds. <strong>For testing:</strong> Set to 1 (1 second), 60 (1 minute), or 300 (5 minutes).
                  </p>
                  
                  {unlockPreview && (
                    <div className="p-2 bg-blue-500/5 border border-blue-500/10 rounded text-xs text-blue-300">
                      <div className="font-bold mb-1">Unlock Time Preview:</div>
                      <div>Will unlock in {unlockPreview.secondsFromNow} seconds</div>
                      <div>Timestamp: {unlockPreview.timestamp}</div>
                      <div>Local time: {unlockPreview.date}</div>
                      <div className="text-xs text-blue-400 mt-1">
                        {unlockPreview.secondsFromNow <= 60 
                          ? "✅ Will unlock within 1 minute" 
                          : unlockPreview.secondsFromNow <= 300 
                            ? "✅ Will unlock within 5 minutes" 
                            : "⏳ Will take more than 5 minutes to unlock"}
                      </div>
                    </div>
                  )}
                </div>

                {/* Price Rule */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500/10 rounded">
                      <TrendingUp className="h-4 w-4 text-purple-400" />
                    </div>
                    <label className="text-sm font-medium text-white">Price Rule</label>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={priceComparison}
                      onChange={(e) => setPriceComparison(e.target.value as 'greater' | 'less')}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                    >
                      <option value="greater">Greater than</option>
                      <option value="less">Less than</option>
                    </select>
                    <input
                      type="number"
                      value={priceTarget}
                      onChange={(e) => setPriceTarget(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                      placeholder="Target price in USD"
                      step="0.01"
                      min="0"
                    />
                    <span className="text-sm text-gray-400 whitespace-nowrap">USD</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {priceTarget ? `Executes when AVAX price is ${priceComparison === 'greater' ? '>' : '<'} $${priceTarget}` : 'Default: Executes when AVAX price > $20 (2x testnet price). For testing: Set to ~$10 (current testnet price).'}
                  </p>
                </div>

                {/* Performance Rule */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-pink-500/10 rounded">
                      <Target className="h-4 w-4 text-pink-400" />
                    </div>
                    <label className="text-sm font-medium text-white">Performance Rule</label>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={performanceTarget}
                      onChange={(e) => setPerformanceTarget(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-pink-500/50"
                      placeholder="Target balance"
                      min="1"
                    />
                    <select
                      value={performanceToken}
                      onChange={(e) => setPerformanceToken(e.target.value as 'USDC_T' | 'DANA')}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-pink-500/50"
                    >
                      <option value="USDC_T">USDC_T</option>
                      <option value="DANA">DANA</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500">
                    Executes when vault balance reaches {performanceTarget} {performanceToken}. For testing: Set to a small amount like 10 {performanceToken}.
                  </p>
                </div>

                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-xs text-yellow-400">
                    <strong>Testing Tip:</strong> Click "1s" for 1 second unlock, "1m" for 1 minute, or "5m" for 5 minutes. Set Price to $10, and Performance to 10 {performanceToken}.
                  </p>
                </div>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-2">
              Rules execute sequentially. All conditions must be met for successful withdrawal.
            </p>
          </div>

          {/* Fee Information */}
          <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
            <div className="text-sm text-yellow-300">
              <strong>Fee Structure:</strong>
              <ul className="mt-1 space-y-1">
                <li>• <strong>0.1%</strong> deposit fee (goes to treasury)</li>
                <li>• <strong>2%</strong> success fee on profits (only if rules complete successfully)</li>
                <li>• <strong>No success fee</strong> on failsafe withdrawal (after 1 year)</li>
                <li>• <strong>Higher gas cost</strong> due to custom rule deployment (3 extra contracts)</li>
              </ul>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || isConfirming || !!status}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(isPending || isConfirming || !!status) && <Loader2 className="animate-spin h-5 w-5" />}
            {status ? status : isPending ? 'Confirming...' : isConfirming ? 'Creating Vault...' : 'Deploy Custom Rules & Create Vault'}
          </button>

          {isSuccess && !status && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Proxy vault created successfully! You can now deposit tokens.
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm break-words">
              <p className="font-bold mb-1">Error:</p>
              {error.message}
            </div>
          )}

          <div className="text-xs text-gray-500 text-center pt-4 border-t border-white/10">
            <p>Vault proxies to: {PROXY_SYSTEM_FUJI.StrategyVaultImplementation.slice(0, 10)}... (upgradable)</p>
            <p className="mt-1">Factory: {PROXY_SYSTEM_FUJI.VaultProxyFactory.slice(0, 10)}...</p>
            <p className="mt-1 text-yellow-500">Note: This creates 3 new rule contracts. Gas cost will be higher.</p>
          </div>
        </form>
      </div>
    </div>
  );
}
