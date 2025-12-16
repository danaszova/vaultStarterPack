
import { ethers } from "hardhat";
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

async function main() {
    console.log("Starting TimeLock Rule Reproduction Test...");

    const [owner] = await ethers.getSigners();

    // 1. Deploy Implementation
    const StrategyVaultImplementation = await ethers.getContractFactory("StrategyVaultImplementation");
    const implementation = await StrategyVaultImplementation.deploy();
    await implementation.waitForDeployment();
    console.log("Implementation deployed at:", await implementation.getAddress());

    // 2. Deploy Factory
    const treasury = owner.address;
    const depositFeeBps = 0; // 0%
    const successFeeBps = 0; // 0%

    const VaultProxyFactory = await ethers.getContractFactory("VaultProxyFactory");
    const factory = await VaultProxyFactory.deploy(
        await implementation.getAddress(),
        treasury,
        depositFeeBps,
        successFeeBps
    );
    await factory.waitForDeployment();
    console.log("Factory deployed at:", await factory.getAddress());

    // 3. Deploy Mock Token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Test Token", "TEST", 18);
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    console.log("Mock Token deployed at:", tokenAddress);

    // 4. Create TimeLock Rule
    // We using 60 seconds to clearly demonstrate the "Locked" state.
    const currentTime = await time.latest();
    const delay = 60;
    const unlockTime = currentTime + delay;

    const TimeLockRule = await ethers.getContractFactory("TimeLockRule");
    const rule = await TimeLockRule.deploy(unlockTime);
    await rule.waitForDeployment();
    const ruleAddress = await rule.getAddress();
    console.log(`\nTimeLock Rule deployed at: ${ruleAddress}`);
    console.log(`Current Time: ${currentTime}`);
    console.log(`Unlock Time:  ${unlockTime} (Delta: ${delay}s)`);

    // 5. Create Vault
    // Params:
    // address owner
    // address depositToken
    // uint256 failsafeDuration
    // IStrategyRule[] initialRules

    const ONE_DAY = 86400;

    const tx = await factory.createVault(
        owner.address,
        tokenAddress,
        ONE_DAY,
        [ruleAddress]
    );
    const receipt = await tx.wait();

    // Get Vault address
    const vaultCount = await factory.getVaultCount();
    const vaultAddress = await factory.getVault(vaultCount - 1n);
    console.log("Vault deployed at:", vaultAddress);

    const vault = await ethers.getContractAt("StrategyVaultImplementation", vaultAddress);

    // 6. Check Initial Status
    console.log("\n--- Initial Status ---");
    let status = await vault.getStatus();
    console.log("Is Locked:", status.isLocked);
    console.log("Current Rule Index:", status.currentRuleIndex);

    // Check rule condition directly
    let conditionMet = await vault.checkCurrentRule();
    console.log("Rule Condition Met (Should be false):", conditionMet);

    if (conditionMet) {
        console.error("ERROR: Condition met too early!");
    } else {
        console.log("PASS: Condition correctly not met yet.");
    }

    // 7. Advance Time
    console.log(`\n--- Advancing Time by ${delay + 5} seconds ---`);
    await time.increase(delay + 5);

    // 8. Check Status again
    conditionMet = await vault.checkCurrentRule();
    console.log("Rule Condition Met (Should be true):", conditionMet);

    if (!conditionMet) {
        console.error("ERROR: Condition NOT met after time passed!");
    } else {
        console.log("PASS: Condition met after time pass.");

        // 9. Execute
        console.log("Executing vault...");
        await vault.executeCurrentRule();

        status = await vault.getStatus();
        console.log("Vault executed. Is Locked:", status.isLocked);
        console.log("Completed Successfully:", status.completedSuccessfully);

        if (!status.isLocked && status.completedSuccessfully) {
            console.log("SUCCESS: Vault fully executed and unlocked!");
        } else {
            console.log("FAILURE: Vault state incorrect after execution.");
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
