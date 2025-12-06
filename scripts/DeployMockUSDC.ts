import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Deploying Mock USDC...");

    const [deployer] = await ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    // 6 decimals for USDC
    const usdc = await MockERC20.deploy("Mock USDC", "USDC", 6);
    await usdc.waitForDeployment();

    const usdcAddress = await usdc.getAddress();
    console.log(`✅ Mock USDC deployed to: ${usdcAddress}`);

    // Mint some tokens to the deployer so they can distribute them or use them
    const mintAmount = ethers.parseUnits("1000000", 6);
    await usdc.mint(deployer.address, mintAmount);
    console.log(`💰 Minted 1,000,000 USDC to ${deployer.address}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
