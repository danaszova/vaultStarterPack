import { ethers } from "hardhat";

async function main() {
    console.log("Deploying New Mock Token to Avalanche Fuji...");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    // Name, Symbol, Decimals
    const token = await MockERC20.deploy("Dana Test Token", "DANA", 6);

    await token.waitForDeployment();

    const tokenAddress = await token.getAddress();
    console.log("New Mock Token deployed to:", tokenAddress);

    console.log("\nIMPORTANT: Update frontend/src/config/constants.ts with this new address!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
