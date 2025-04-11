// test/VestingWallet.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VestingWallet (via BerryToken)", function () {
    let berryToken;
    let team;
    let vestingWallet;

    beforeEach(async function () {
        const [owner, _user1, _user2, _team] = await ethers.getSigners();
        team = _team;

        const BerryToken = await ethers.getContractFactory("BerryToken");
        berryToken = await BerryToken.deploy(owner.address);

        await berryToken.setupTeamVesting(team.address);
        await berryToken.distributeTokens(
            _user1.address, // dex
            _user2.address, // presale
            _user2.address, // reserve
            _user2.address, // discount
            _user2.address, // audit
        );

        const vestingAddress = await berryToken.teamVesting();
        vestingWallet = await ethers.getContractAt("VestingWallet", vestingAddress);
    });

    it("should have 0 releasable tokens before cliff", async function () {
        const releasable = await vestingWallet["releasable(address)"](berryToken.getAddress());
        expect(releasable).to.equal(0);
    });

    it("should unlock some tokens after cliff (6 months)", async function () {
        await ethers.provider.send("evm_increaseTime", [181 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine");

        const releasable = await vestingWallet["releasable(address)"](berryToken.getAddress());
        expect(releasable).to.be.gt(0);
    });

    it("should release tokens to team after cliff", async function () {
        await ethers.provider.send("evm_increaseTime", [181 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine");

        const balanceBefore = await berryToken.balanceOf(team.address);
        await vestingWallet["release(address)"](berryToken.getAddress());
        const balanceAfter = await berryToken.balanceOf(team.address);
        expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should unlock full amount after 18 months", async function () {
        await ethers.provider.send("evm_increaseTime", [545 * 24 * 60 * 60]); // 6 + 12 months
        await ethers.provider.send("evm_mine");

        const releasable = await vestingWallet["releasable(address)"](berryToken.getAddress());
        const teamAmount = await berryToken.TEAM_AMOUNT();
        console.log(teamAmount);
        expect(releasable).to.equal(teamAmount);
    });
});
