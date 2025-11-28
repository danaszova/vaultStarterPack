import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Starting Cross-Chain Execution (Fuji -> Sepolia)...");

    const [deployer] = await ethers.getSigners();
    console.log(`Executing with account: ${deployer.address}`);
    const network = await ethers.provider.getNetwork();
    console.log(`Connected to chain ID: ${network.chainId}`);

    // Configuration
    const FACTORY_ADDRESS = "0x0b9E18564582CD3e491B9FCeED03fF57E8F226B3"; // Fuji (New)
    const HUB_ADDRESS = "0x3ff7faad7417130c60b7422de712ead9a7c2e3b5"; // Sepolia
    const ROUTER_FUJI = "0xf694e193200268f9a4868e4aa017a0118c9a8177";
    const LINK_FUJI = "0x0b9d5d9136855f6fec3c0993fee6e9ce8a297846";
    const CCIP_BNM_FUJI = "0xd21341536c5c5d4a6ca33e1a355a5211f636f94f"; // Supported test token
    const CHAIN_SELECTOR_SEPOLIA = "16015286601757825753";

    // 1. Get Contracts
    const factory = await ethers.getContractAt("StrategyFactory", FACTORY_ADDRESS);
    const link = await ethers.getContractAt("MockERC20", LINK_FUJI);

    // Check LINK existence
    const linkCode = await ethers.provider.getCode(LINK_FUJI);
    if (linkCode === "0x") {
        throw new Error(`No LINK contract found at ${LINK_FUJI} on chain ${network.chainId}`);
    }

    // Deploy Mock Input Asset (since BnM might be flaky or empty)
    console.log("\n📦 Deploying Mock Input Asset...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Test Token", "TEST", 18);
    await mockToken.waitForDeployment();
    const mockTokenAddress = await mockToken.getAddress();
    console.log(`   Mock Token deployed to: ${mockTokenAddress}`);

    // 2. Create Strategy
    console.log("\n📝 Creating Strategy...");
    const strategyParams = {
        inputAsset: mockTokenAddress,
        targetAsset: mockTokenAddress,
        oracle: deployer.address, // Mock
        triggerCondition: Math.floor(Date.now() / 1000) - 3600, // Past time
        executionAmount: 0, // 0 for data-only message
        lockPeriod: 600, // 10 minutes
        beneficiary: deployer.address,
        conditionType: true,
        router: ROUTER_FUJI,
        hub: HUB_ADDRESS,
        destinationChainSelector: CHAIN_SELECTOR_SEPOLIA,
        linkToken: LINK_FUJI
    };

    const tx = await factory.createStrategy(strategyParams);
    const receipt = await tx.wait();
    // Find StrategyCreated event
    // Note: The event might be in a different log index depending on internal calls
    // We'll verify the strategy count and get the latest one
    const count = await factory.getStrategyCount();
    const strategyAddress = await factory.getStrategy(count - 1n);
    console.log(`✅ Strategy deployed to: ${strategyAddress}`);

    const strategy = await ethers.getContractAt("StrategyVault", strategyAddress);

    // 3. Fund Strategy
    console.log("\n💰 Funding Strategy...");

    // Fund with Mock Token
    // const approveTx = await mockToken.approve(strategyAddress, ethers.parseUnits("10", 18));
    // await approveTx.wait();
    // const depositTx = await strategy.deposit(ethers.parseUnits("10", 18));
    // await depositTx.wait();
    // console.log("✅ Deposited 10 TEST");

    // Fund with LINK
    try {
        const linkBalance = await link.balanceOf(deployer.address);
        console.log(`   Deployer LINK Balance: ${ethers.formatUnits(linkBalance, 18)}`);

        if (linkBalance < ethers.parseUnits("2", 18)) {
            throw new Error("Insufficient LINK tokens. Please use the Chainlink faucet: https://faucets.chain.link/fuji");
        }

        const linkTx = await link.transfer(strategyAddress, ethers.parseUnits("2", 18));
        await linkTx.wait();
        console.log("✅ Funded Strategy with 2 LINK");
    } catch (e: any) {
        console.error(`❌ Failed to fund LINK: ${e.message}`);
        return;
    }

    // 4. Execute
    console.log("\n🚀 Executing Strategy...");

    // Debug State
    const deposited = await strategy.totalDeposited();
    const params = await strategy.params();
    console.log(`   Total Deposited: ${ethers.formatUnits(deposited, 18)}`);
    console.log(`   Execution Amount: ${ethers.formatUnits(params.executionAmount, 18)}`);
    console.log(`   Input Asset: ${params.inputAsset}`);
    console.log(`   Mock Token: ${mockTokenAddress}`);

    try {
        const execTx = await strategy.executeStrategy();
        console.log(`   Transaction sent: ${execTx.hash}`);
        await execTx.wait();
        console.log("✅ Strategy Executed! CCIP Message sent.");
        console.log(`   Check status on CCIP Explorer: https://ccip.chain.link/address/${strategyAddress}`);
    } catch (e: any) {
        console.error(`❌ Execution failed: ${e.message}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
