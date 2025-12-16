import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useWalletClient, usePublicClient, useAccount } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import StrategyVaultImplementationABI from '@/abis/StrategyVaultImplementation.json';
import MockERC20ABI from '@/abis/MockERC20.json';
import TimeLockRuleABI from '@/abis/TimeLockRule.json';
import PriceRuleABI from '@/abis/PriceRule.json';
import PerformanceRuleABI from '@/abis/PerformanceRule.json';
import { SUPPORTED_TOKENS, PROXY_SYSTEM_FUJI } from '@/config/constants';
import { Loader2, Lock, Unlock, ArrowRightLeft, Wallet, Plus, Clock, TrendingUp, X, RefreshCw, BarChart3 } from 'lucide-react';

interface VaultCardProps {
    address: `0x${string}`;
}

function RuleItem({ address, index }: { address: `0x${string}`, index: number }) {
    // Try TimeLock first
    const { data: timeDesc, isError: isTimeError } = useReadContract({
        address,
        abi: TimeLockRuleABI.abi,
        functionName: 'getDescription',
    });

    // Try PriceRule if TimeLock fails
    const { data: priceDesc, isError: isPriceError } = useReadContract({
        address,
        abi: PriceRuleABI.abi,
        functionName: 'getDescription',
        query: { enabled: isTimeError || !timeDesc }
    });

    // Try PerformanceRule if others fail
    const { data: perfDesc } = useReadContract({
        address,
        abi: PerformanceRuleABI.abi,
        functionName: 'getDescription',
        query: { enabled: (isTimeError || !timeDesc) && (isPriceError || !priceDesc) }
    });

    const description = (timeDesc || priceDesc || perfDesc) as string;

    return (
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 p-2 rounded-lg border border-white/5">
            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                {index + 1}
            </div>
            <span className="font-mono">{description || "Loading rule..."}</span>
        </div>
    );
}

export default function VaultCard({ address }: VaultCardProps) {
    const { address: userAddress } = useAccount();

    const { data: balance, refetch: refetchBalance } = useReadContract({
        address,
        abi: StrategyVaultImplementationABI.abi,
        functionName: 'getBalance',
    });

    const { data: status, refetch: refetchStatus } = useReadContract({
        address,
        abi: StrategyVaultImplementationABI.abi,
        functionName: 'getStatus',
    });

    const { data: params, error: paramsError } = useReadContract({
        address,
        abi: StrategyVaultImplementationABI.abi,
        functionName: 'params',
    });

    const { data: rules, refetch: refetchRules } = useReadContract({
        address,
        abi: StrategyVaultImplementationABI.abi,
        functionName: 'getRules',
    });

    // Destructure status and compute derived values
    const [isLocked, currentRuleIndex, timeUntilFailsafe, currentToken, completedSuccessfully] = (status as [boolean, bigint, bigint, string, boolean]) || [false, 0n, 0n, "", false];
    const ruleCount = (rules as any[])?.length || 0;
    const isConditionCheckEnabled = isLocked && currentRuleIndex < ruleCount;

    // Check if current rule condition is met (only when vault is locked and has rules)
    const { data: canExecuteCurrentRule, refetch: refetchCanExecute } = useReadContract({
        address,
        abi: StrategyVaultImplementationABI.abi,
        functionName: 'checkCurrentRule',
        query: {
            enabled: isConditionCheckEnabled
        }
    });

    // Get current rule address
    const currentRuleAddress = isConditionCheckEnabled && rules ? (rules as `0x${string}`[])[Number(currentRuleIndex)] : undefined;

    // Fetch description for current rule (only when condition check is enabled)
    const { data: timeDesc } = useReadContract({
        address: currentRuleAddress,
        abi: TimeLockRuleABI.abi,
        functionName: 'getDescription',
        query: { enabled: !!currentRuleAddress && isConditionCheckEnabled }
    });

    const { data: priceDesc } = useReadContract({
        address: currentRuleAddress,
        abi: PriceRuleABI.abi,
        functionName: 'getDescription',
        query: { enabled: !!currentRuleAddress && isConditionCheckEnabled && !timeDesc }
    });

    const { data: perfDesc } = useReadContract({
        address: currentRuleAddress,
        abi: PerformanceRuleABI.abi,
        functionName: 'getDescription',
        query: { enabled: !!currentRuleAddress && isConditionCheckEnabled && !timeDesc && !priceDesc }
    });

    const currentRuleDescription = (timeDesc || priceDesc || perfDesc) as string;

    console.log(`VaultCard ${address}:`, { balance, status, params, paramsError, rules, canExecuteCurrentRule, isLocked, currentRuleIndex, ruleCount, isConditionCheckEnabled, currentRuleAddress, currentRuleDescription });

    const publicClient = usePublicClient();

    // Check if current rule is a TimeLockRule by trying to read unlockTime
    const { data: timeLockTimestamp } = useReadContract({
        address: currentRuleAddress,
        abi: TimeLockRuleABI.abi,
        functionName: 'unlockTime',
        query: { enabled: !!currentRuleAddress && isConditionCheckEnabled }
    });

    // Helper for countdown
    const [currentTime, setCurrentTime] = useState(Date.now());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const getTimeRemaining = (targetTs: bigint) => {
        const target = Number(targetTs) * 1000;
        const diff = target - currentTime;
        if (diff <= 0) return null;

        const seconds = Math.floor(diff / 1000) % 60;
        const minutes = Math.floor(diff / (1000 * 60)) % 60;
        const hours = Math.floor(diff / (1000 * 60 * 60));

        return `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`;
    };

    // Auto-refresh canExecuteCurrentRule when timer hits zero
    useEffect(() => {
        if (timeLockTimestamp && isConditionCheckEnabled) {
            const targetTime = Number(timeLockTimestamp) * 1000;
            // If we just passed the unlock time (within last 2 seconds)
            if (currentTime >= targetTime && currentTime - targetTime < 2000) {
                console.log("Timer expired, refreshing condition check...");
                refetchCanExecute();
            }
        }
    }, [currentTime, timeLockTimestamp, isConditionCheckEnabled, refetchCanExecute]);

    // Hook for Execution
    const {
        data: executeHash,
        writeContract: executeWrite,
        isPending: isExecutePending,
        error: executeError
    } = useWriteContract();

    const {
        isLoading: isExecuteConfirming,
        isSuccess: isExecuteSuccess
    } = useWaitForTransactionReceipt({ hash: executeHash });

    // Hook for Deposit (we handle loading state manually via isDepositing)
    const { writeContractAsync: depositWriteAsync } = useWriteContract();

    const [depositAmount, setDepositAmount] = useState('');
    const [isDepositing, setIsDepositing] = useState(false);
    const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
    const [executionInitiated, setExecutionInitiated] = useState(false);

    useEffect(() => {
        if (isExecuteSuccess) {
            console.log("Transaction confirmed, refreshing data...");
            refetchBalance();
            refetchStatus();
            refetchRules();
            // Reset execution initiated state
            setExecutionInitiated(false);
        }
    }, [isExecuteSuccess, refetchBalance, refetchStatus, refetchRules]);

    // Reset execution initiated state if transaction fails or error occurs
    useEffect(() => {
        if (!isExecutePending && !isExecuteConfirming && executionInitiated) {
            // Check if there's an error or transaction was cancelled
            // We'll reset after a short delay to ensure we're not in a pending state
            const timer = setTimeout(() => {
                setExecutionInitiated(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isExecutePending, isExecuteConfirming, executionInitiated]);

    // Reset execution initiated state when error occurs
    useEffect(() => {
        if (executeError && executionInitiated) {
            setExecutionInitiated(false);
        }
    }, [executeError, executionInitiated]);

    const handleRefresh = () => {
        refetchBalance();
        refetchStatus();
        refetchRules();
        refetchWalletBalance();
        if (isConditionCheckEnabled) {
            refetchCanExecute();
        }
    };

    const handleExecute = async () => {
        // Prevent multiple executions
        if (executionInitiated || isExecutePending || isExecuteConfirming) {
            console.log("Execution blocked:", { executionInitiated, isExecutePending, isExecuteConfirming });
            return;
        }

        console.log("Initiating execution...");
        setExecutionInitiated(true);

        try {
            console.log("Sending execution transaction...");
            const hash = await depositWriteAsync({
                address,
                abi: StrategyVaultImplementationABI.abi,
                functionName: 'executeCurrentRule',
            });
            console.log("Execution transaction sent:", hash);
            // We can rely on the existing useWaitForTransactionReceipt for executeHash if we update it, 
            // but we are using depositWriteAsync which doesn't update executeHash automatically unless we share the hook?
            // Actually, best to use the same hook or just track the hash here.

            // To keep it simple and consistent with existing state tracking, let's use the RETURNED hash 
            // and wait for it locally or update a state that the existing WaitForTransaction uses?
            // The existing `isExecuteConfirming` depends on `executeHash`.
            // If we use `depositWriteAsync`, `executeHash` won't update.

            // Let's just fix the hook usage. 
            // We'll use `writeContractAsync` from a new hook specifically for execution to avoid conflicts,
            // or just use `depositWriteAsync` and manually wait for receipt here.

            const receipt = await publicClient?.waitForTransactionReceipt({ hash });
            console.log("Execution confirmed:", receipt);

            if (receipt?.status === 'success') {
                alert("Rule Executed Successfully!");
                handleRefresh();
            } else {
                alert("Execution Failed on-chain!");
            }

        } catch (err: any) {
            console.error("Execution error:", err);
            alert(`Execution failed: ${err.message || err}`);
        } finally {
            setExecutionInitiated(false);
        }
    };

    const handleDeposit = async () => {
        if (!depositAmount || !params || !publicClient || !tokenInfo) return;
        setIsDepositing(true);
        try {
            const vaultParams = params as any;
            // Handle both object and array formats
            const depositToken = vaultParams?.depositToken || (Array.isArray(vaultParams) ? vaultParams[0] : undefined);

            if (!depositToken) {
                console.error("Could not find deposit token address");
                return;
            }

            const amount = parseUnits(depositAmount, tokenDecimals);

            console.log("Token:", depositToken, "Token Symbol:", tokenSymbol, "Amount:", amount);

            // 1. Approve
            console.log("Approving...");
            const approvalHash = await depositWriteAsync({
                address: depositToken,
                abi: MockERC20ABI.abi,
                functionName: 'approve',
                args: [address, amount],
            });

            console.log("Waiting for approval confirmation...", approvalHash);
            await publicClient.waitForTransactionReceipt({ hash: approvalHash });
            console.log("Approval confirmed!");

            // 2. Deposit
            console.log("Depositing...");
            const depositHash = await depositWriteAsync({
                address,
                abi: StrategyVaultImplementationABI.abi,
                functionName: 'deposit',
                args: [amount],
            });

            console.log("Waiting for deposit confirmation...", depositHash);
            await publicClient.waitForTransactionReceipt({ hash: depositHash });
            console.log("Deposit confirmed!");

            // Wait 2 seconds for RPC to index
            setTimeout(() => {
                handleRefresh();
            }, 2000);

            setDepositAmount('');
            alert("Deposit successful! Balance updated.");
        } catch (err) {
            console.error("Deposit failed:", err);
            alert("Deposit failed. See console for details.");
        } finally {
            setIsDepositing(false);
        }
    };

    console.log('VaultCard status:', { isLocked, currentRuleIndex, timeUntilFailsafe, currentToken, completedSuccessfully });
    // Cast params to any to access struct fields safely
    const vaultParams = params as any;
    console.log('VaultCard params raw:', vaultParams);

    // Handle both object (if ABI supports it) and array (fallback) formats
    // Struct order: depositToken, failsafeDuration
    const depositToken = vaultParams?.depositToken || (Array.isArray(vaultParams) ? vaultParams[0] : undefined);
    const failsafeDuration = vaultParams?.failsafeDuration || (Array.isArray(vaultParams) ? vaultParams[1] : undefined);
    console.log('VaultCard parsed:', { depositToken, failsafeDuration });

    // Find token info from SUPPORTED_TOKENS
    const tokenInfo = depositToken ? Object.values(SUPPORTED_TOKENS).find(token =>
        token.address.toLowerCase() === depositToken.toLowerCase()
    ) : undefined;

    const tokenDecimals = tokenInfo?.decimals || 18;
    const tokenSymbol = tokenInfo?.symbol || 'TEST';

    // Fetch User Wallet Balance
    const { data: walletBalance, refetch: refetchWalletBalance, error: walletBalanceError } = useReadContract({
        address: depositToken,
        abi: MockERC20ABI.abi,
        functionName: 'balanceOf',
        args: [userAddress],
        query: { enabled: !!userAddress && !!depositToken }
    });

    console.log('VaultCard wallet balance:', { walletBalance, walletBalanceError, depositToken, userAddress });

    return (
        <div className="group relative bg-black/40 rounded-2xl border border-white/10 backdrop-blur-xl hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 overflow-hidden">
            {/* Same header content... */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

            <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                            <Lock className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white leading-tight">Proxy Vault</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-gray-500 font-mono">{address.slice(0, 6)}...{address.slice(-4)}</p>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(address);
                                        // Optional: Add a toast or visual feedback here
                                        alert("Address copied!");
                                    }}
                                    className="text-xs bg-white/5 hover:bg-white/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 transition-colors"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${completedSuccessfully
                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                        : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                        {completedSuccessfully ? 'COMPLETED' : 'ACTIVE'}
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-sm text-gray-400">Vault Balance</span>
                        <div className="flex items-center gap-2">
                            <span className="text-white font-mono font-bold">{balance ? formatUnits(balance as bigint, tokenDecimals) : '0'} {tokenSymbol}</span>
                            <button onClick={handleRefresh} className="p-1 hover:bg-white/10 rounded-full transition-colors text-gray-500 hover:text-white">
                                <RefreshCw className="h-3 w-3" />
                            </button>
                        </div>
                    </div>

                    {/* Wallet Balance Display */}
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-sm text-gray-400">Your Wallet</span>
                        <div className="flex items-center gap-2">
                            <span className="text-white font-mono font-bold">
                                {walletBalance ? formatUnits(walletBalance as bigint, tokenDecimals) : '0'} {tokenSymbol}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-sm text-gray-400">Rules</span>
                        <span className="text-white font-mono font-bold">{ruleCount} Active</span>
                    </div>

                    {/* Rule List */}
                    {ruleCount > 0 && (
                        <div className="space-y-2">
                            {(rules as `0x${string}`[]).map((ruleAddr, idx) => (
                                <RuleItem key={ruleAddr} address={ruleAddr} index={idx} />
                            ))}
                        </div>
                    )}

                    <div className="flex justify-between items-center text-sm px-1">
                        <span className="text-gray-400">Status</span>
                        <div className="flex items-center gap-2 text-white">
                            {isLocked ? (
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

                <div className="space-y-3">
                    {!completedSuccessfully && (
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    placeholder="Amount"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50 pr-12"
                                />
                                <div className="absolute right-3 top-2 text-sm text-gray-500 font-mono">
                                    {tokenSymbol}
                                </div>
                            </div>
                            <button
                                onClick={handleDeposit}
                                disabled={!depositAmount || isDepositing || (walletBalance !== undefined && !!depositAmount && parseUnits(depositAmount, tokenDecimals) > (walletBalance as bigint))}
                                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border ${(!depositAmount || isDepositing || (walletBalance !== undefined && depositAmount && parseUnits(depositAmount, tokenDecimals) > (walletBalance as bigint)))
                                    ? 'bg-white/5 text-gray-500 border-white/5 cursor-not-allowed'
                                    : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20'
                                    }`}
                            >
                                {isDepositing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Deposit'}
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleExecute}
                        disabled={completedSuccessfully || isExecutePending || isExecuteConfirming || executionInitiated || (isConditionCheckEnabled && canExecuteCurrentRule === false)}
                        className={`w-full py-3 px-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-all ${completedSuccessfully || executionInitiated || (isConditionCheckEnabled && canExecuteCurrentRule === false)
                            ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                            : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/20'
                            }`}
                    >
                        {(isExecutePending || isExecuteConfirming || executionInitiated) ? (
                            <Loader2 className="animate-spin h-4 w-4" />
                        ) : (
                            <ArrowRightLeft className="h-4 w-4" />
                        )}
                        {completedSuccessfully ? 'Completed' :
                            executionInitiated ? 'Executing...' :
                                !isConditionCheckEnabled ? 'Cannot Execute' :
                                    canExecuteCurrentRule === undefined ? 'Checking Condition...' :
                                        canExecuteCurrentRule === false ? `Condition Not Met (Rule ${Number(currentRuleIndex) + 1})` :
                                            'Execute Current Rule'}
                    </button>

                    {isConditionCheckEnabled && canExecuteCurrentRule === false && (
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-sm">
                            <p className="font-bold mb-1">Rule Condition Not Met (Rule {Number(currentRuleIndex) + 1}):</p>

                            {/* TimeLock Countdown Display */}
                            {timeLockTimestamp && (
                                <div className="mb-2">
                                    {(() => {
                                        const remaining = getTimeRemaining(timeLockTimestamp as bigint);
                                        if (remaining) {
                                            return (
                                                <div className="flex items-center gap-2 text-lg font-bold text-orange-400 bg-orange-500/10 p-2 rounded border border-orange-500/20">
                                                    <Clock className="h-5 w-5 animate-pulse" />
                                                    <span>Unlocks in: {remaining}</span>
                                                </div>
                                            );
                                        } else {
                                            return <p className="text-green-400 font-bold">Time unlock condition met. Refreshing...</p>;
                                        }
                                    })()}
                                </div>
                            )}

                            <p className="mb-2 font-mono text-xs bg-white/5 p-2 rounded border border-white/5">{currentRuleDescription || "Loading rule description..."}</p>
                            <p>The condition for this rule is not satisfied yet.</p>
                            <p className="text-xs mt-2">For TimeLock rules: Wait until the unlock time passes.</p>
                            <p className="text-xs">For Price rules: Check if the price condition is met.</p>
                            <p className="text-xs">For Performance rules: Ensure the vault has sufficient balance.</p>
                            <p className="text-xs mt-2 text-gray-500">This is normal for newly created vaults. Rules execute only when their conditions are met.</p>
                            {/* Auto-refresh hint for TimeLock */}
                            {timeLockTimestamp && (
                                <p className="text-xs mt-1 text-blue-400">The vault will automatically become executable when the timer hits zero.</p>
                            )}
                        </div>
                    )}

                    {executeError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm break-words">
                            <p className="font-bold mb-1">Execution Error:</p>
                            <p>{executeError.message || 'Unknown error'}</p>
                            <p className="text-xs mt-1">Check rule conditions and try again.</p>
                        </div>
                    )}

                    {!completedSuccessfully && !isLocked && (
                        <>
                            <button
                                onClick={() => setIsAddRuleOpen(true)}
                                className="w-full py-2 px-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-all bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 hover:border-white/10 text-sm"
                            >
                                <Plus className="h-4 w-4" />
                                Add Rule
                            </button>
                            {isAddRuleOpen && (
                                <AddRuleModal
                                    vaultAddress={address}
                                    depositToken={depositToken}
                                    onClose={() => setIsAddRuleOpen(false)}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function AddRuleModal({ vaultAddress, depositToken, onClose }: { vaultAddress: `0x${string}`, depositToken: `0x${string}`, onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<'time' | 'price' | 'performance'>('time');
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();
    const { writeContract, data: hash, isPending } = useWriteContract();
    const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
    const [isDeploying, setIsDeploying] = useState(false);

    // TimeLock State
    const [duration, setDuration] = useState('10'); // minutes

    // PriceRule State
    const [targetPrice, setTargetPrice] = useState('3000');
    const [isGreaterThan, setIsGreaterThan] = useState(true);

    // PerformanceRule State
    const [targetBalance, setTargetBalance] = useState('100');

    const handleAddRule = async () => {
        if (!walletClient || !publicClient) return;
        setIsDeploying(true);
        try {
            let ruleAddress: `0x${string}`;

            if (activeTab === 'time') {
                console.log("Deploying TimeLockRule...");
                const unlockTime = BigInt(Math.floor(Date.now() / 1000) + (Number(duration) * 60));

                const hash = await walletClient.deployContract({
                    abi: TimeLockRuleABI.abi,
                    bytecode: TimeLockRuleABI.bytecode as `0x${string}`,
                    args: [unlockTime],
                    account: walletClient.account,
                });
                const receipt = await publicClient.waitForTransactionReceipt({ hash });
                ruleAddress = receipt.contractAddress!;
            } else if (activeTab === 'price') {
                console.log("Deploying PriceRule...");
                // Price is 8 decimals in Chainlink
                const price = BigInt(Number(targetPrice) * 100000000);

                const hash = await walletClient.deployContract({
                    abi: PriceRuleABI.abi,
                    bytecode: PriceRuleABI.bytecode as `0x${string}`,
                    args: [PROXY_SYSTEM_FUJI.MockChainlinkAggregator, price, isGreaterThan],
                    account: walletClient.account,
                });
                const receipt = await publicClient.waitForTransactionReceipt({ hash });
                ruleAddress = receipt.contractAddress!;
            } else {
                console.log("Deploying PerformanceRule...");
                const tokenInfo = Object.values(SUPPORTED_TOKENS).find(token =>
                    token.address.toLowerCase() === depositToken.toLowerCase()
                );
                const tokenDecimals = tokenInfo?.decimals || 18;
                const balance = parseUnits(targetBalance, tokenDecimals);

                const hash = await walletClient.deployContract({
                    abi: PerformanceRuleABI.abi,
                    bytecode: PerformanceRuleABI.bytecode as `0x${string}`,
                    args: [depositToken, balance],
                    account: walletClient.account,
                });
                const receipt = await publicClient.waitForTransactionReceipt({ hash });
                ruleAddress = receipt.contractAddress!;
            }

            console.log("Rule deployed at:", ruleAddress);
            console.log("Adding rule to vault...");

            writeContract({
                address: vaultAddress,
                abi: StrategyVaultImplementationABI.abi,
                functionName: 'addRule',
                args: [ruleAddress],
            });

            // Close modal after initiating the second transaction (or wait for it?)
            // For better UX, we might want to wait, but let's close to let the main card handle the loading state
            onClose();

        } catch (err) {
            console.error("Failed to add rule:", err);
            alert("Failed to add rule. Check console.");
        } finally {
            setIsDeploying(false);
        }
    };

    const isLoading = isDeploying || isPending || isConfirming;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1a1b23] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="flex justify-between items-center p-4 border-b border-white/5">
                    <h3 className="text-lg font-bold text-white">Add Strategy Rule</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex border-b border-white/5">
                    <button
                        onClick={() => setActiveTab('time')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'time' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5' : 'text-gray-400 hover:text-white'}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Clock className="h-4 w-4" /> Time
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('price')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'price' ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/5' : 'text-gray-400 hover:text-white'}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Price
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('performance')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'performance' ? 'text-green-400 border-b-2 border-green-400 bg-green-500/5' : 'text-gray-400 hover:text-white'}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <BarChart3 className="h-4 w-4" /> Balance
                        </div>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {activeTab === 'time' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Unlock Delay (Minutes)</label>
                                <input
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500/50"
                                    placeholder="e.g. 60"
                                />
                            </div>
                            <p className="text-xs text-gray-500">
                                The vault will be locked until {duration} minutes from now.
                            </p>
                        </div>
                    )}

                    {activeTab === 'price' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Target Price (USD)</label>
                                <input
                                    type="number"
                                    value={targetPrice}
                                    onChange={(e) => setTargetPrice(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50"
                                    placeholder="e.g. 3000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Condition</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsGreaterThan(true)}
                                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${isGreaterThan ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-white/5 border-white/10 text-gray-400'}`}
                                    >
                                        Greater Than {'>'}
                                    </button>
                                    <button
                                        onClick={() => setIsGreaterThan(false)}
                                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${!isGreaterThan ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-white/5 border-white/10 text-gray-400'}`}
                                    >
                                        Less Than {'<'}
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">
                                Executes when Token Price is {isGreaterThan ? 'above' : 'below'} ${targetPrice}.
                            </p>
                        </div>
                    )}

                    {activeTab === 'performance' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Target Balance (DANA)</label>
                                <input
                                    type="number"
                                    value={targetBalance}
                                    onChange={(e) => setTargetBalance(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-green-500/50"
                                    placeholder="e.g. 100"
                                />
                            </div>
                            <p className="text-xs text-gray-500">
                                Executes when the vault balance reaches {targetBalance} DANA.
                            </p>
                        </div>
                    )}

                    <button
                        onClick={handleAddRule}
                        disabled={isLoading}
                        className={`w-full py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all ${activeTab === 'time'
                            ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : activeTab === 'price'
                                ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                                : 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20'
                            }`}
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                        {isDeploying ? "Deploying Rule..." : "Deploy & Add Rule"}
                    </button>
                </div>
            </div>
        </div>
    );
}
