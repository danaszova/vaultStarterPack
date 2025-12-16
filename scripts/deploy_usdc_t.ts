import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Deploying USDC_T Test Token...");

    const [deployer] = await ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    // 6 decimals for USDC_T (same as USDC)
    const usdc_t = await MockERC20.deploy("USDC Test Token", "USDC_T", 6);
    await usdc_t.waitForDeployment();

    const usdc_tAddress = await usdc_t.getAddress();
    console.log(`✅ USDC_T deployed to: ${usdc_tAddress}`);

    // Mint some tokens to the deployer for initial distribution
    const mintAmount = ethers.parseUnits("1000000", 6);
    await usdc_t.mint(deployer.address, mintAmount);
    console.log(`💰 Minted 1,000,000 USDC_T to ${deployer.address}`);

    console.log("\n📋 IMPORTANT: Update frontend/src/config/constants.ts with:");
    console.log(`USDC_T_ADDRESS: "${usdc_tAddress}"`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
