import { ethers } from "hardhat";
import { MOCK_USDC_FUJI } from "../frontend/src/config/constants";

async function main() {
    console.log("Testing Mint Functionality on Avalanche Fuji...");

    const tokenAddress = MOCK_USDC_FUJI;
    console.log(`Token Address: ${tokenAddress}`);

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = MockERC20.attach(tokenAddress);

    const [signer] = await ethers.getSigners();
    console.log(`Minting to: ${signer.address}`);

    try {
        // Check balance before
        const balanceBefore = await token.balanceOf(signer.address);
        console.log(`Balance Before: ${balanceBefore.toString()}`);

        // Try to mint
        console.log("Attempting to mint 1000 tokens...");
        const tx = await token.mint(signer.address, ethers.parseUnits("1000", 6)); // USDC is 6 decimals
        console.log(`Transaction sent: ${tx.hash}`);

        await tx.wait();
        console.log("Transaction confirmed!");

        // Check balance after
        const balanceAfter = await token.balanceOf(signer.address);
        console.log(`Balance After: ${balanceAfter.toString()}`);

        if (balanceAfter > balanceBefore) {
            console.log("✅ Minting SUCCESSFUL!");
        } else {
            console.log("❌ Minting FAILED (Balance did not increase)");
        }

    } catch (error) {
        console.error("❌ Minting FAILED with error:");
        console.error(error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
