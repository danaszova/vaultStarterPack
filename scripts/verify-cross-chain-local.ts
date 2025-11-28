import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Starting Cross-Chain Logic Verification (Local)...");

    const [deployer, user] = await ethers.getSigners();

    // 1. Deploy Mocks
    console.log("\n📦 Deploying Mocks...");
    const MockCCIPRouter = await ethers.getContractFactory("MockCCIPRouter");
    const router = await MockCCIPRouter.deploy();
    await router.waitForDeployment();
    const routerAddress = await router.getAddress();
    console.log(`✅ MockRouter deployed to: ${routerAddress}`);

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const linkToken = await MockERC20.deploy("Chainlink", "LINK", 18);
    await linkToken.waitForDeployment();
    const linkAddress = await linkToken.getAddress();
    console.log(`✅ MockLINK deployed to: ${linkAddress}`);

    const usdcToken = await MockERC20.deploy("USDC", "USDC", 6);
    await usdcToken.waitForDeployment();
    const usdcAddress = await usdcToken.getAddress();
    console.log(`✅ MockUSDC deployed to: ${usdcAddress}`);

    // 2. Deploy Hub (on 'Sepolia')
    console.log("\n📡 Deploying LegacyVaultHub...");
    const LegacyVaultHub = await ethers.getContractFactory("LegacyVaultHub");
    const hub = await LegacyVaultHub.deploy(routerAddress);
    await hub.waitForDeployment();
    const hubAddress = await hub.getAddress();
    console.log(`✅ LegacyVaultHub deployed to: ${hubAddress}`);

    // 3. Deploy Spoke (on 'Fuji')
    console.log("\n🏭 Deploying StrategyFactory...");
    const StrategyFactory = await ethers.getContractFactory("StrategyFactory");
    const factory = await StrategyFactory.deploy();
    await factory.waitForDeployment();

    console.log("📝 Creating Strategy...");
    const strategyParams = {
        inputAsset: usdcAddress,
        targetAsset: usdcAddress, // Using same for mock
        oracle: deployer.address, // Mock oracle
        triggerCondition: Math.floor(Date.now() / 1000) - 3600, // Past time (condition met)
        executionAmount: ethers.parseUnits("100", 18),
        lockPeriod: 3600,
        beneficiary: user.address,
        conditionType: true,
        router: routerAddress,
        hub: hubAddress,
        destinationChainSelector: "16015286601757825753",
        linkToken: linkAddress
    };

    const tx = await factory.createStrategy(strategyParams);
    const receipt = await tx.wait();
    const strategyAddress = receipt.logs.find((l: any) => l.fragment?.name === "StrategyCreated")?.args[0];
    console.log(`✅ Strategy deployed to: ${strategyAddress}`);

    // 4. Setup & Execute
    console.log("\n⚙️ Setting up execution...");
    const StrategyVault = await ethers.getContractFactory("StrategyVault");
    const strategy = StrategyVault.attach(strategyAddress);

    // Mint USDC to user and approve strategy
    await (usdcToken as any).mint(user.address, ethers.parseUnits("1000", 18));
    await (usdcToken as any).connect(user).approve(strategyAddress, ethers.parseUnits("1000", 18));

    // Deposit
    await (strategy as any).connect(user).deposit(ethers.parseUnits("100", 18));
    console.log("✅ Deposited 100 USDC");

    // Fund Strategy with LINK (for fees)
    await (linkToken as any).mint(strategyAddress, ethers.parseUnits("10", 18));
    console.log("✅ Funded Strategy with LINK");

    // Execute
    console.log("🚀 Executing Strategy...");
    const execTx = await (strategy as any).executeStrategy();
    const execReceipt = await execTx.wait();

    // Check for CCIP Send event from Router
    const sentEvent = await router.queryFilter(router.filters.MessageSent(), execReceipt.blockNumber, execReceipt.blockNumber);
    if (sentEvent.length > 0) {
        console.log("✅ CCIP Message Sent!");
        console.log(`   Message ID: ${(sentEvent[0] as any).args[1]}`);
    } else {
        console.error("❌ CCIP Message NOT Sent");
    }

    console.log("\n🎉 Verification Complete!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
