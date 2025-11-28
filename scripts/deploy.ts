import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying StrategyFactory...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);

  // Deploy StrategyFactory
  const StrategyFactory = await ethers.getContractFactory("StrategyFactory");
  const factory = await StrategyFactory.deploy();
  await factory.waitForDeployment();
  
  const factoryAddress = await factory.getAddress();
  console.log(`✅ StrategyFactory deployed to: ${factoryAddress}`);

  // Example: Deploy a sample strategy
  console.log("\n📋 Deploying sample strategy...");
  
  const strategyParams = {
    inputAsset: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum
    targetAsset: "0xB8c77482e45F1F44dE1745F52C74426C631bDD52", // BNB on Ethereum
    oracle: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", // ETH/USD Chainlink
    triggerCondition: ethers.parseUnits("2000", 8), // $2000 ETH price
    executionAmount: ethers.parseUnits("1000", 6), // 1000 USDC
    lockPeriod: 7 * 24 * 60 * 60, // 7 days
    beneficiary: deployer.address,
    conditionType: true // true = above condition, false = below condition
  };

  const tx = await factory.createStrategy(strategyParams);
  const receipt = await tx.wait();
  
  // Get the deployed strategy address from events
  const strategyCreatedEvent = receipt?.logs.find(
    (log: any) => log.fragment?.name === "StrategyCreated"
  );
  
  if (strategyCreatedEvent) {
    const strategyAddress = strategyCreatedEvent.args[0];
    console.log(`✅ Sample strategy deployed to: ${strategyAddress}`);
  }

  console.log("\n🎯 Deployment Summary:");
  console.log(`   Factory: ${factoryAddress}`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Network: ${(await ethers.provider.getNetwork()).name}`);
  
  // Save deployment info
  const deploymentInfo = {
    factory: factoryAddress,
    deployer: deployer.address,
    network: (await ethers.provider.getNetwork()).name,
    timestamp: new Date().toISOString()
  };
  
  console.log("\n📝 Deployment info:", JSON.stringify(deploymentInfo, null, 2));
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
