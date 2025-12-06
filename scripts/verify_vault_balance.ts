import { ethers } from "hardhat";
import { formatUnits } from "ethers";
import { MOCK_USDC_FUJI, FACTORY_ADDRESS_FUJI } from "../frontend/src/config/constants";

async function main() {
    console.log("Verifying Vault Balances on Avalanche Fuji...");

    // 1. Connect to Factory
    const factoryAddress = FACTORY_ADDRESS_FUJI;
    const StrategyFactory = await ethers.getContractFactory("StrategyFactory");
    const factory = StrategyFactory.attach(factoryAddress);

    console.log(`Factory Address: ${factoryAddress}`);

    // 2. Get all vaults
    const vaults = await factory.getAllStrategies();
    console.log(`Found ${vaults.length} vaults.`);

    if (vaults.length === 0) {
        console.log("No vaults found.");
        return;
    }

    // 3. Check balance of each vault
    const StrategyVault = await ethers.getContractFactory("StrategyVault");
    const MockERC20 = await ethers.getContractFactory("MockERC20"); // Assuming standard ERC20 interface

    for (let i = 0; i < vaults.length; i++) {
        const vaultAddress = vaults[i];
        const vault = StrategyVault.attach(vaultAddress);

        try {
            // Get Vault Params to find input asset
            const params = await vault.params();
            const name = params.name;
            const inputAsset = params.inputAsset;

            // Check if it's our USDC
            const isUSDC = inputAsset.toLowerCase() === MOCK_USDC_FUJI.toLowerCase();
            const symbol = isUSDC ? "USDC" : "TEST";
            const decimals = isUSDC ? 6 : 18;

            // Get Balance from Vault Contract
            const balance = await vault.getBalance();

            // Get Balance from Token Contract (Double Check)
            const token = MockERC20.attach(inputAsset);
            const tokenBalance = await token.balanceOf(vaultAddress);

            console.log(`\nVault ${i + 1}: ${name} (${vaultAddress})`);
            console.log(`  Input Asset: ${inputAsset} (${symbol})`);
            console.log(`  Vault Reported Balance: ${formatUnits(balance, decimals)} ${symbol}`);
            console.log(`  Token Contract Balance: ${formatUnits(tokenBalance, decimals)} ${symbol}`);

            if (balance > 0n) {
                console.log("  ✅ FUNDS DETECTED!");
            } else {
                console.log("  ❌ No funds detected.");
            }

        } catch (err) {
            console.error(`  Error reading vault ${vaultAddress}:`, err.message);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
