import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useWalletClient, usePublicClient, useAccount } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import StrategyVaultABI from '@/abis/StrategyVault.json';
import MockERC20ABI from '@/abis/MockERC20.json';
import TimeLockRuleABI from '@/abis/TimeLockRule.json';
import PriceRuleABI from '@/abis/PriceRule.json';
import { MOCK_USDC_FUJI, MOCK_ORACLE_FUJI } from '@/config/constants';
import { Loader2, Lock, Unlock, ArrowRightLeft, Wallet, Plus, Clock, TrendingUp, X, RefreshCw } from 'lucide-react';

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

    // Try PriceRule if TimeLock fails (simple fallback for now)
    const { data: priceDesc } = useReadContract({
        address,
        abi: PriceRuleABI.abi,
        functionName: 'getDescription',
        query: { enabled: isTimeError || !timeDesc }
    });

    const description = (timeDesc || priceDesc) as string;

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
        abi: StrategyVaultABI.abi,
        functionName: 'getBalance',
    });

    const { data: status, refetch: refetchStatus } = useReadContract({
        address,
        abi: StrategyVaultABI.abi,
        functionName: 'getStatus',
    });

    const { data: params } = useReadContract({
        address,
        abi: StrategyVaultABI.abi,
        functionName: 'params',
    });

    const { data: rules, refetch: refetchRules } = useReadContract({
        address,
        abi: StrategyVaultABI.abi,
        functionName: 'getRules',
    });

    const publicClient = usePublicClient();

    // Hook for Execution
    const {
        data: executeHash,
        writeContract: executeWrite,
        isPending: isExecutePending
    } = useWriteContract();

    const {
        isLoading: isExecuteConfirming,
        isSuccess: isExecuteSuccess
    } = useWaitForTransactionReceipt({ hash: executeHash });

    // Hook for Deposit (we handle loading state manually via isDepositing)
    const { writeContractAsync: depositWriteAsync } = useWriteContract();



    useEffect(() => {
        if (isExecuteSuccess) {
            console.log("Transaction confirmed, refreshing data...");
            refetchBalance();
            refetchStatus();
            refetchRules();
        }
    }, [isExecuteSuccess, refetchBalance, refetchStatus, refetchRules]);

    const [depositAmount, setDepositAmount] = useState('');
    const [isDepositing, setIsDepositing] = useState(false);
    const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);

    const handleRefresh = () => {
        refetchBalance();
        refetchStatus();
        refetchRules();
        refetchWalletBalance();
    };

    const handleExecute = () => {
        executeWrite({
            address,
            abi: StrategyVaultABI.abi,
            functionName: 'executeStrategy',
        });
    };

    const handleDeposit = async () => {
        if (!depositAmount || !params || !publicClient) return;
        setIsDepositing(true);
        try {
            const vaultParams = params as any;
            // Handle both object and array formats
            const inputAsset = vaultParams?.inputAsset || (Array.isArray(vaultParams) ? vaultParams[1] : undefined);

            if (!inputAsset) {
                console.error("Could not find input asset address");
                return;
            }

            const isUSDC = inputAsset.toLowerCase() === MOCK_USDC_FUJI.toLowerCase();
            const amount = parseUnits(depositAmount, isUSDC ? 6 : 18);

            console.log("Token:", inputAsset, "Is USDC:", isUSDC, "Amount:", amount);

            // 1. Approve
            console.log("Approving...");
            const approvalHash = await depositWriteAsync({
                address: inputAsset,
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
                abi: StrategyVaultABI.abi,
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

    const [executed, locked, timeRemaining] = (status as [boolean, boolean, bigint]) || [false, false, 0n];
    // Cast params to any to access struct fields safely
    const vaultParams = params as any;

    // Handle both object (if ABI supports it) and array (fallback) formats
    // Struct order: name, inputAsset, targetAsset, executionAmount, ...
    const name = vaultParams?.name || (Array.isArray(vaultParams) ? vaultParams[0] : undefined);
    const inputAsset = vaultParams?.inputAsset || (Array.isArray(vaultParams) ? vaultParams[1] : undefined);

    const vaultName = name || "Strategy Vault";
    const ruleCount = (rules as any[])?.length || 0;

    // Case insensitive comparison
    const isUSDC = inputAsset && MOCK_USDC_FUJI && inputAsset.toLowerCase() === MOCK_USDC_FUJI.toLowerCase();

    // Fetch User Wallet Balance
    const { data: walletBalance, refetch: refetchWalletBalance } = useReadContract({
        address: inputAsset,
        abi: MockERC20ABI.abi,
        functionName: 'balanceOf',
        args: [userAddress],
        query: { enabled: !!userAddress && !!inputAsset }
    });



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
                            <h3 className="text-lg font-bold text-white leading-tight">{vaultName}</h3>
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
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${executed
                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                        : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                        {executed ? 'EXECUTED' : 'ACTIVE'}
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-sm text-gray-400">Vault Balance</span>
                        <div className="flex items-center gap-2">
                            <span className="text-white font-mono font-bold">{balance ? formatUnits(balance as bigint, isUSDC ? 6 : 18) : '0'} {isUSDC ? 'DANA' : 'TEST'}</span>
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
                                {walletBalance ? formatUnits(walletBalance as bigint, isUSDC ? 6 : 18) : '0'} {isUSDC ? 'DANA' : 'TEST'}
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

                <div className="space-y-3">
                    {!executed && (
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
                                    {isUSDC ? 'DANA' : 'TEST'}
                                </div>
                            </div>
                            <button
                                onClick={handleDeposit}
                                disabled={!depositAmount || isDepositing || (walletBalance !== undefined && !!depositAmount && parseUnits(depositAmount, isUSDC ? 6 : 18) > (walletBalance as bigint))}
                                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border ${(!depositAmount || isDepositing || (walletBalance !== undefined && depositAmount && parseUnits(depositAmount, isUSDC ? 6 : 18) > (walletBalance as bigint)))
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
                        disabled={executed || isExecutePending || isExecuteConfirming}
                        className={`w-full py-3 px-4 rounded-xl font-bold flex justify-center items-center gap-2 transition-all ${executed
                            ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                            : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/20'
                            }`}
                    >
                        {(isExecutePending || isExecuteConfirming) ? (
                            <Loader2 className="animate-spin h-4 w-4" />
                        ) : (
                            <ArrowRightLeft className="h-4 w-4" />
                        )}
                        {executed ? 'Executed' : 'Execute Strategy'}
                    </button>

                    {!executed && !locked && (
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

function AddRuleModal({ vaultAddress, onClose }: { vaultAddress: `0x${string}`, onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<'time' | 'price'>('time');
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
            } else {
                console.log("Deploying PriceRule...");
                // Price is 8 decimals in Chainlink
                const price = BigInt(Number(targetPrice) * 100000000);

                const hash = await walletClient.deployContract({
                    abi: PriceRuleABI.abi,
                    bytecode: PriceRuleABI.bytecode as `0x${string}`,
                    args: [MOCK_ORACLE_FUJI, price, isGreaterThan],
                    account: walletClient.account,
                });
                const receipt = await publicClient.waitForTransactionReceipt({ hash });
                ruleAddress = receipt.contractAddress!;
            }

            console.log("Rule deployed at:", ruleAddress);
            console.log("Adding rule to vault...");

            writeContract({
                address: vaultAddress,
                abi: StrategyVaultABI.abi,
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
                            <Clock className="h-4 w-4" /> Time Lock
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('price')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'price' ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/5' : 'text-gray-400 hover:text-white'}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Price Trigger
                        </div>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {activeTab === 'time' ? (
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
                    ) : (
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

                    <button
                        onClick={handleAddRule}
                        disabled={isLoading}
                        className={`w-full py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all ${activeTab === 'time'
                            ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/20'
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
