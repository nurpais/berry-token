const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BerryToken", function () {
    let owner, user1, user2;
    let berryToken;

    beforeEach(async function () {
        [owner, user1, user2, team, dex, presale, reserve, discountFund, audit] =
            await ethers.getSigners();

        const BerryToken = await ethers.getContractFactory("BerryToken");
        berryToken = await BerryToken.deploy(owner.address);
        await berryToken.waitForDeployment();

        // Always initialize vesting before distributing
        await berryToken.setupTeamVesting(team.address);
        const vestingAddress = await berryToken.teamVesting();
        expect(vestingAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("should deploy and mint total supply to the contract itself", async function () {
        const totalSupply = await berryToken.totalSupply();
        expect(await berryToken.balanceOf(berryToken.target)).to.equal(totalSupply);
    });

    it("should distribute tokens correctly", async function () {
        await berryToken.distributeTokens(
            dex.address,
            presale.address,
            reserve.address,
            discountFund.address,
            audit.address,
        );

        expect(await berryToken.balanceOf(dex.address)).to.equal(ethers.parseUnits("35200000", 18));
        expect(await berryToken.balanceOf(presale.address)).to.equal(
            ethers.parseUnits("8800000", 18),
        );
        expect(await berryToken.balanceOf(reserve.address)).to.equal(
            ethers.parseUnits("13200000", 18),
        );
        expect(await berryToken.balanceOf(discountFund.address)).to.equal(
            ethers.parseUnits("17600000", 18),
        );
        expect(await berryToken.balanceOf(audit.address)).to.equal(
            ethers.parseUnits("4400000", 18),
        );
    });

    it("should allow burning tokens", async function () {
        await berryToken.distributeTokens(
            dex.address,
            presale.address,
            reserve.address,
            discountFund.address,
            audit.address,
        );

        await berryToken.connect(dex).transfer(user1.address, ethers.parseEther("100"));
        await berryToken.connect(user1).burn(ethers.parseEther("10"));
        const balance = await berryToken.balanceOf(user1.address);
        expect(balance).to.equal(ethers.parseEther("90"));
    });

    it("should pause/unpause transfers", async function () {
        await berryToken.distributeTokens(
            dex.address,
            presale.address,
            reserve.address,
            discountFund.address,
            audit.address,
        );

        await berryToken.connect(dex).transfer(user1.address, ethers.parseEther("50"));
        await berryToken.pause();

        await expect(
            berryToken.connect(user1).transfer(user2.address, ethers.parseEther("10")),
        ).to.be.revertedWithCustomError(berryToken, "TokenPaused");
        await berryToken.unpause();
        await berryToken.connect(user1).transfer(user2.address, ethers.parseEther("10"));
    });

    it("should block transfers for blacklisted addresses", async function () {
        await berryToken.distributeTokens(
            dex.address,
            presale.address,
            reserve.address,
            discountFund.address,
            audit.address,
        );

        await berryToken.connect(presale).transfer(user1.address, ethers.parseEther("50"));
        await berryToken.blacklistAddress(user1.address, true);
        await expect(
            berryToken.connect(user1).transfer(user2.address, ethers.parseEther("10")),
        ).to.be.revertedWithCustomError(berryToken, "AddressAlreadyBlacklisted");
    });

    it("should distribute tokens correctly", async function () {
        await berryToken.distributeTokens(
            dex.address,
            presale.address,
            reserve.address,
            discountFund.address,
            audit.address,
        );

        expect(await berryToken.balanceOf(dex.address)).to.equal(ethers.parseUnits("35200000", 18));
        expect(await berryToken.balanceOf(presale.address)).to.equal(
            ethers.parseUnits("8800000", 18),
        );
        expect(await berryToken.balanceOf(reserve.address)).to.equal(
            ethers.parseUnits("13200000", 18),
        );
        expect(await berryToken.balanceOf(discountFund.address)).to.equal(
            ethers.parseUnits("17600000", 18),
        );
        expect(await berryToken.balanceOf(audit.address)).to.equal(
            ethers.parseUnits("4400000", 18),
        );
    });

    it("should initialize team vesting wallet with correct parameters", async function () {
        const vestingAddress = await berryToken.teamVesting();
        expect(vestingAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("should renounce ownership correctly", async function () {
        await berryToken.distributeTokens(
            dex.address,
            presale.address,
            reserve.address,
            discountFund.address,
            audit.address,
        );
        expect(await berryToken.owner()).to.equal(owner.address);
        await berryToken.renounceManagement();

        expect(await berryToken.owner()).to.equal(ethers.ZeroAddress);

        await expect(berryToken.connect(user1).renounceManagement()).to.be.revertedWithCustomError(
            berryToken,
            "OwnableUnauthorizedAccount",
        );

        await berryToken.connect(dex).transfer(user1.address, 100);
        expect(await berryToken.balanceOf(user1.address)).to.equal(100);
    });
});
