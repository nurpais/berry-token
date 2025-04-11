const { ethers } = require("hardhat");

async function main() {
    const tokenAddress = process.env.TOKEN_ADDRESS;
    const teamAddress = process.env.TEAM_ADDRESS;

    const dex = process.env.DEX_ADDRESS;
    const presale = process.env.PRESALE_ADDRESS;
    const reserve = process.env.RESERVE_ADDRESS;
    const discountFund = process.env.DISCOUNT_FUND_ADDRESS;
    const audit = process.env.AUDIT_ADDRESS;

    if (!tokenAddress || !teamAddress || !dex || !presale || !reserve || !discountFund || !audit) {
        throw new Error("Please fill in all addresses in your .env file");
    }

    const signer = (await ethers.getSigners())[0];
    const berryToken = await ethers.getContractAt("BerryToken", tokenAddress, signer);

    console.log("[1] Setting up team vesting...");
    const vestingTx = await berryToken.setupTeamVesting(teamAddress);
    await vestingTx.wait();
    console.log("✅ Vesting wallet initialized.");

    console.log("[2] Distributing tokens...");
    const distTx = await berryToken.distributeTokens(dex, presale, reserve, discountFund, audit);
    await distTx.wait();
    console.log("✅ Tokens distributed successfully.");
}

main().catch((error) => {
    console.error("❌ Script failed:", error);
    process.exitCode = 1;
});
