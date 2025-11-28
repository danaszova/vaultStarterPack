import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Starting Cross-Chain Deployment...");

    const [deployer] = await ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);
    const network = (await ethers.provider.getNetwork()).name;
    console.log(`Network: ${network}`);

    // Router addresses (Chainlink CCIP v1.2.0)
    // Note: These should be verified for the specific networks
    const ROUTER_SEPOLIA = "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59";
    const ROUTER_FUJI = "0xF694E193200268f9a4868e4Aa017a0118C9a8177";
    const LINK_FUJI = "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846";
    const CHAIN_SELECTOR_SEPOLIA = "16015286601757825753";

    if (network === "sepolia") {
        // Deploy Hub on Sepolia
        console.log("\n📡 Deploying LegacyVaultHub on Sepolia...");
        const LegacyVaultHub = await ethers.getContractFactory("LegacyVaultHub");
        const hub = await LegacyVaultHub.deploy(ROUTER_SEPOLIA);
        await hub.waitForDeployment();
        console.log(`✅ LegacyVaultHub deployed to: ${await hub.getAddress()}`);

        // Deploy HODLLock
        console.log("\n🔐 Deploying HODLLock...");
        const HODLLock = await ethers.getContractFactory("HODLLock");
        const hodlLock = await HODLLock.deploy(deployer.address);
        await hodlLock.waitForDeployment();
        console.log(`✅ HODLLock deployed to: ${await hodlLock.getAddress()}`);

        // Wire up Hub and HODLLock
        console.log("\n🔗 Wiring up contracts...");
        await hub.setHodlLock(await hodlLock.getAddress());
        console.log("✅ Hub: setHodlLock called");

        // Transfer ownership of HODLLock to Hub
        await hodlLock.transferOwnership(await hub.getAddress());
        console.log("✅ HODLLock: Ownership transferred to Hub");
    }
    else if (network === "avalancheFuji") {
        // Deploy Factory on Fuji
        console.log("\n🏭 Deploying StrategyFactory on Fuji...");
        const StrategyFactory = await ethers.getContractFactory("StrategyFactory");
        const factory = await StrategyFactory.deploy();
        await factory.waitForDeployment();
        console.log(`✅ StrategyFactory deployed to: ${await factory.getAddress()}`);

        // Note: To deploy a functional strategy, we need the Hub address from Sepolia.
        // For this script, we'll just deploy the factory.
        // Actual strategy creation requires a separate step or hardcoded hub address.
    }
    else {
        console.log("⚠️ Please run this script on 'sepolia' or 'avalancheFuji'");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
