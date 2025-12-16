
import { ethers } from "hardhat";

async function main() {
    const vaultAddress = "0x2242A5ED53D2CD6C6F08Cc70fEd351E6478b876c";
    console.log(`\n🧪 Simulating Execution for: ${vaultAddress}...`);

    const vault = await ethers.getContractAt("StrategyVault", vaultAddress);

    // We assume the environment has a signer (from PRIVATE_KEY)
    // If not, we can just use a provider only for staticCall? 
    // Usually staticCall needs a connected runner.
    const [signer] = await ethers.getSigners();
    console.log(`   Caller: ${signer.address}`);

    try {
        console.log("   Attempting staticCall to executeStrategy()...");
        // In Ethers v6, use staticCall
        await vault.connect(signer).getFunction("executeStrategy").staticCall();
        console.log("\n✅ Simulation SUCCESS! The transaction SHOULD succeed.");
        console.log("   The issue might be user gas settings or RPC lag.");
    } catch (e: any) {
        console.log("\n❌ Simulation FAILED. Revert reason:");
        console.log(e.message);

        if (e.data) {
            console.log("   Data:", e.data);
            // Decode custom errors if possible
            // StrategyVault has no custom errors, but CCIP Router might.
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
