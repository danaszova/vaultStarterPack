import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying Proxy Vault System...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);

  // Deploy StrategyVaultImplementation first (logic contract)
  console.log("\n📦 Deploying StrategyVaultImplementation...");
  const StrategyVaultImplementationFactory = await ethers.getContractFactory("StrategyVaultImplementation");
  const implementation = await StrategyVaultImplementationFactory.deploy();
  await implementation.waitForDeployment();
  const implementationAddress = await implementation.getAddress();
  console.log(`✅ StrategyVaultImplementation deployed to: ${implementationAddress}`);

  // Fee parameters (in basis points)
  const depositFeeBps = 10;      // 0.1%
  const successFeeBps = 200;     // 2%

  // Use deployer address as treasury for now (will be upgraded to multi-sig later)
  const treasury = deployer.address;

  // Deploy VaultProxyFactory
  console.log("\n🏭 Deploying VaultProxyFactory...");
  const VaultProxyFactory = await ethers.getContractFactory("VaultProxyFactory");
  const factory = await VaultProxyFactory.deploy(
    implementationAddress,
    treasury,
    depositFeeBps,
    successFeeBps
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`✅ VaultProxyFactory deployed to: ${factoryAddress}`);

  // Deploy sample rules (optional)
  console.log("\n⚙️ Deploying sample rules...");
  
  // TimeLockRule (unlocks in 7 days)
  const unlockTime = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  const TimeLockRuleFactory = await ethers.getContractFactory("TimeLockRule");
  const timeLockRule = await TimeLockRuleFactory.deploy(unlockTime);
  await timeLockRule.waitForDeployment();
  const timeLockRuleAddress = await timeLockRule.getAddress();
  console.log(`   TimeLockRule (7 days) deployed to: ${timeLockRuleAddress}`);

  // PriceRule (mock oracle address, target price $2000, greater than)
  // For testing, we can use a mock oracle. But let's deploy a mock aggregator first.
  // Since we have a MockChainlinkAggregator, let's deploy it.
  console.log("\n📈 Deploying MockChainlinkAggregator for PriceRule...");
  const MockAggregatorFactory = await ethers.getContractFactory("MockChainlinkAggregator");
  const mockAggregator = await MockAggregatorFactory.deploy(8, "Mock AVAX/USD");
  await mockAggregator.waitForDeployment();
  const mockAggregatorAddress = await mockAggregator.getAddress();
  console.log(`   MockChainlinkAggregator deployed to: ${mockAggregatorAddress}`);

  // Update the price to $1800 (with 8 decimals) so that the current price is below our target $2000
  const initialPrice = 1800 * 10**8;
  await (await mockAggregator.updatePrice(initialPrice)).wait();
  console.log(`   MockChainlinkAggregator price updated to: $${1800}`);

  // Now deploy PriceRule
  const targetPrice = 2000 * 10**8; // $2000 with 8 decimals
  const isGreaterThan = true;
  const PriceRuleFactory = await ethers.getContractFactory("PriceRule");
  const priceRule = await PriceRuleFactory.deploy(mockAggregatorAddress, targetPrice, isGreaterThan);
  await priceRule.waitForDeployment();
  const priceRuleAddress = await priceRule.getAddress();
  console.log(`   PriceRule (target $2000) deployed to: ${priceRuleAddress}`);

  // PerformanceRule (target balance 1000 DANA tokens)
  // We need a token address. Let's deploy MockERC20 (DANA) or use existing one.
  // Check if MockERC20 is already deployed, if not deploy.
  console.log("\n💰 Deploying MockERC20 for PerformanceRule...");
  const MockERC20Factory = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20Factory.deploy("DANA Test Token", "DANA", 6);
  await mockToken.waitForDeployment();
  const mockTokenAddress = await mockToken.getAddress();
  console.log(`   MockERC20 (DANA) deployed to: ${mockTokenAddress}`);

  const targetBalance = ethers.parseUnits("1000", 6); // 1000 DANA tokens
  const PerformanceRuleFactory = await ethers.getContractFactory("PerformanceRule");
  const performanceRule = await PerformanceRuleFactory.deploy(mockTokenAddress, targetBalance);
  await performanceRule.waitForDeployment();
  const performanceRuleAddress = await performanceRule.getAddress();
  console.log(`   PerformanceRule (target 1000 DANA) deployed to: ${performanceRuleAddress}`);

  // Create a sample vault using the factory
  console.log("\n🏦 Creating a sample vault...");
  // Note: The createVault function expects IStrategyRule[] but we are passing addresses.
  // The contract expects addresses, but the type in the factory is IStrategyRule[] (which is an address array).
  // We'll pass the addresses as an array of strings.
  const initialRules = [timeLockRuleAddress, priceRuleAddress, performanceRuleAddress];
  const failsafeDuration = 365 * 24 * 60 * 60; // 1 year
  const tx = await factory.createVault(
    deployer.address,           // owner
    mockTokenAddress,           // deposit token (DANA)
    failsafeDuration,           // 1 year failsafe
    initialRules                // initial rule sequence (addresses)
  );
  const receipt = await tx.wait();

  // Extract vault address from event
  const vaultCreatedEvent = receipt?.logs.find(
    (log: any) => log.fragment?.name === "VaultCreated"
  );

  let vaultAddress: string | undefined;
  if (vaultCreatedEvent) {
    vaultAddress = vaultCreatedEvent.args[0];
    console.log(`✅ Sample vault deployed to: ${vaultAddress}`);
  } else {
    console.log("⚠️  Could not find VaultCreated event");
  }

  // Display deployment summary
  console.log("\n🎯 Deployment Summary:");
  console.log(`   StrategyVaultImplementation: ${implementationAddress}`);
  console.log(`   VaultProxyFactory: ${factoryAddress}`);
  console.log(`   Treasury (EOA for now): ${treasury}`);
  console.log(`   Deposit Fee: ${depositFeeBps} bps (${depositFeeBps / 100}%)`);
  console.log(`   Success Fee: ${successFeeBps} bps (${successFeeBps / 100}%)`);
  console.log(`   Sample Rules:`);
  console.log(`     - TimeLockRule: ${timeLockRuleAddress}`);
  console.log(`     - PriceRule: ${priceRuleAddress}`);
  console.log(`     - PerformanceRule: ${performanceRuleAddress}`);
  console.log(`   Sample Vault: ${vaultAddress || "Not created"}`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Network: ${(await ethers.provider.getNetwork()).name}`);

  // Save deployment info
  const deploymentInfo = {
    implementation: implementationAddress,
    factory: factoryAddress,
    treasury: treasury,
    depositFeeBps: depositFeeBps,
    successFeeBps: successFeeBps,
    rules: {
      timeLockRule: timeLockRuleAddress,
      priceRule: priceRuleAddress,
      performanceRule: performanceRuleAddress,
    },
    sampleVault: vaultAddress,
    deployer: deployer.address,
    network: (await ethers.provider.getNetwork()).name,
    timestamp: new Date().toISOString()
  };

  console.log("\n📝 Deployment info:", JSON.stringify(deploymentInfo, null, 2));

  // Instructions for next steps
  console.log("\n📋 Next Steps:");
  console.log("   1. Transfer treasury address to a multi-sig wallet for production.");
  console.log("   2. Deploy and configure registries (RuleRegistry, OracleRegistry, DEXRegistry).");
  console.log("   3. Update frontend constants with new contract addresses.");
  console.log("   4. Test vault deposits, rule execution, and withdrawals.");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
