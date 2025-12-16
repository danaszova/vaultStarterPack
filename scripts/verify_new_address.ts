
import { ethers } from "hardhat";

async function main() {
    // New Candidate: 0xD213414c62d55aB87C2e94715A03C9E42F8E90e4
    // NOTE: Lowercased: 0xd213414c62d55ab87c2e94715a03c9e42f8e90e4
    const newAddress = "0xd213414c62d55ab87c2e94715a03c9e42f8e90e4";

    console.log(`Checking New Address: ${newAddress}`);
    const provider = ethers.provider;
    const code = await provider.getCode(newAddress);

    console.log(`Code size: ${code.length}`);
    if (code === "0x") console.log("❌ NO CODE");
    else console.log("✅ CODE EXISTS! Valid Token Address.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
