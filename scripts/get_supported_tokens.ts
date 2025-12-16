
import { ethers } from "hardhat";
import { ROUTER_FUJI, CHAIN_SELECTOR_SEPOLIA } from "../frontend/src/config/constants";

async function main() {
    console.log("Querying Router for supported tokens...");
    console.log(`Router: ${ROUTER_FUJI}`);
    console.log(`Dest Chain: ${CHAIN_SELECTOR_SEPOLIA}`);

    // Minimal ABI for getSupportedTokens
    const abi = [
        "function getSupportedTokens(uint64 chainSelector) external view returns (address[] memory)"
    ];

    const router = await ethers.getContractAt(abi, ROUTER_FUJI);

    try {
        const tokens = await router.getSupportedTokens(CHAIN_SELECTOR_SEPOLIA);
        console.log(`\nFound ${tokens.length} supported tokens:`);

        const provider = ethers.provider;

        for (const t of tokens) {
            const symbol = await (await ethers.getContractAt("MockERC20", t)).symbol().catch(() => "???");
            const code = await provider.getCode(t);
            console.log(`- ${t} (${symbol}) [Code Size: ${code.length}]`);
        }
    } catch (e) {
        console.error("Error calling getSupportedTokens:", e);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
