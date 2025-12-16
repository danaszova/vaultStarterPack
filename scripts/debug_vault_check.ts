import { ethers } from "hardhat";

async function main() {
    const vaultAddress = "0x3B256582eafc43446e867D588826C671D0f86594";
    console.log(`Debugging Vault: ${vaultAddress}`);

    // Get the vault contract instance
    const Vault = await ethers.getContractFactory("StrategyVaultImplementation");
    const vault = Vault.attach(vaultAddress);

    try {
        // 1. Check Status
        console.log("Fetching status...");
        const status = await vault.getStatus();
        console.log("Status:", status);

        // Deconstruct status
        // struct VaultResult { bool isLocked; uint256 currentRuleIndex; uint256 failsafeTime; address currentToken; bool completed; }
        // Or it returns a tuple: [isLocked, currentRuleIndex, ... ]
        const isLocked = status[0];
        const currentRuleIndex = status[1];
        console.log(`isLocked: ${isLocked}`);
        console.log(`currentRuleIndex: ${currentRuleIndex}`);

        // 2. Get Rules
        console.log("Fetching rules...");
        const rules = await vault.getRules();
        console.log("Rules:", rules);

        if (rules.length === 0) {
            console.log("WARNING: No rules found.");
        } else {
            const currentRuleAddr = rules[Number(currentRuleIndex)];
            console.log(`Current Rule Address: ${currentRuleAddr}`);

            // 3. Check Rule Contract directly
            if (currentRuleAddr) {
                console.log("Checking Rule Contract...");
                const TimeLock = await ethers.getContractAt("TimeLockRule", currentRuleAddr);
                try {
                    const desc = await TimeLock.getDescription();
                    console.log(`Rule Description: "${desc}"`);
                    const unlockTime = await TimeLock.unlockTime();
                    console.log(`Rule UnlockTime: ${unlockTime.toString()}`);

                    const now = Math.floor(Date.now() / 1000);
                    console.log(`Current Time: ${now}`);
                    console.log(`Time remaining: ${Number(unlockTime) - now} seconds`);

                    // 4. Check condition on Rule directly
                    const canUnlock = await TimeLock.check(vaultAddress);
                    console.log(`Rule.check(vault): ${canUnlock}`);

                } catch (e) {
                    console.error("Error interacting with Rule Contract:", e);
                }
            }
        }

        // 5. Call checkCurrentRule on Vault
        console.log("Calling vault.checkCurrentRule()...");
        try {
            const result = await vault.checkCurrentRule();
            console.log(`checkCurrentRule result: ${result}`);
        } catch (e) {
            console.error("checkCurrentRule FAILED:", e);
        }

    } catch (error) {
        console.error("Error connecting to vault:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
