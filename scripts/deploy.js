const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("🚀 Deploying contract from:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "BNB");

  const BerryToken = await ethers.getContractFactory("BerryToken");
  const token = await BerryToken.deploy(deployer.address);
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log("✅ BerryToken deployed at:", tokenAddress);

  const deployedData = {
    contract: "BerryToken",
    network: hre.network.name,
    address: tokenAddress,
    deployedBy: deployer.address,
    timestamp: new Date().toISOString(),
  };

  const outputDir = path.resolve(__dirname, "../deployed");
  const outputFile = path.join(outputDir, "BerryToken.json");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  fs.writeFileSync(outputFile, JSON.stringify(deployedData, null, 2));
  console.log("📁 Saved to:", outputFile);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
