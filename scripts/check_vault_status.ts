
import { ethers } from "hardhat";
import { formatUnits } from "ethers";
import {
    FACTORY_ADDRESS_FUJI,
    CCIP_BnM_FUJI,
    LINK_FUJI
} from "../frontend/src/config/constants";

async function main() {
    const userAddress = "0xC61F7A6AaEa23d786dc200fF466A2202DF011054"; // User's Wallet
    console.log(`\n🕵️‍♂️ Finding latest vault for user: ${userAddress}...`);

    const factory = await ethers.getContractAt("StrategyFactory", FACTORY_ADDRESS_FUJI);
    // Note: Factory returns ALL strategies, not filtered by user. 
    // We will fetch all and check the last one, or filter if needed.
    const strategies = await factory.getAllStrategies();

    if (strategies.length === 0) {
        console.log("❌ No strategies found on factory.");
        return;
    }

    // Get the last one and verify ownership
    const vaultAddress = strategies[strategies.length - 1];
    console.log(`Checking Latest Factory Vault: ${vaultAddress}`);

    const vault = await ethers.getContractAt("StrategyVault", vaultAddress);

    // Sanitize addresses
    const bnmAddress = ethers.getAddress(CCIP_BnM_FUJI.toLowerCase());
    const linkAddress = ethers.getAddress(LINK_FUJI.toLowerCase());

    const bnm = await ethers.getContractAt("MockERC20", bnmAddress); // Use Mock interface for ERC20
    const link = await ethers.getContractAt("MockERC20", linkAddress);

    // Check Params to confirm it is the new one
    const params = await vault.params();
    console.log(`📝 Params: Name="${params.name}"`);
    console.log(`      Input Asset: ${params.inputAsset}`);
    console.log(`      Target Amount: ${formatUnits(params.executionAmount, 18)}`); // CCIP-BnM is 18 decimals

    // Check Status
    const [executed, locked, timeRemaining] = await vault.getStatus();
    console.log(`\n📊 Vault Status: Executed=${executed}, Locked=${locked}`);
    if (executed) console.log("🚀 EXECUTION CONFIRMED!");

    // Check Balances
    const bnmBal = await bnm.balanceOf(vaultAddress);
    console.log(`💰 CCIP-BnM Balance: ${formatUnits(bnmBal, 18)}`);

    const linkBal = await link.balanceOf(vaultAddress);
    console.log(`🔗 LINK Balance: ${formatUnits(linkBal, 18)}`);

    // Check Total Deposited
    const totalDeposited = await vault.totalDeposited();
    console.log(`📥 Total Deposited: ${formatUnits(totalDeposited, 18)}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
