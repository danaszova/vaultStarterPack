
import { ethers } from "hardhat";
import { CCIP_BnM_FUJI, LINK_FUJI } from "../frontend/src/config/constants";

async function main() {
    console.log("Checking addresses on Fuji...");
    console.log(`CCIP-BnM: ${CCIP_BnM_FUJI}`);
    console.log(`LINK: ${LINK_FUJI}`);

    const provider = ethers.provider;

    const codeBnM = await provider.getCode(CCIP_BnM_FUJI);
    console.log(`Code size at CCIP-BnM: ${codeBnM.length}`);

    const codeLink = await provider.getCode(LINK_FUJI);
    console.log(`Code size at LINK: ${codeLink.length}`);

    if (codeBnM === "0x") console.log("❌ NO CODE at CCIP-BnM address!");
    if (codeLink === "0x") console.log("❌ NO CODE at LINK address!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
