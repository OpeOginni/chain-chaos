import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";

describe("ChainChaos", function () {
  async function deployChainChaosFixture() {
    const [owner, player1, player2, player3, player4] = await hre.ethers.getSigners();

    // Deploy mock USDC token
    const MockUSDC = await hre.ethers.getContractFactory("MockERC20");
    const usdc = await MockUSDC.deploy("USD Coin", "USDC", 6);
    
    // Deploy ChainChaos contract
    const ChainChaos = await hre.ethers.getContractFactory("ChainChaos");
    const chainChaos = await ChainChaos.deploy(usdc.target);

    // Mint USDC to test accounts
    const usdcAmount = hre.ethers.parseUnits("1000", 6);
    await usdc.mint(player1.address, usdcAmount);
    await usdc.mint(player2.address, usdcAmount);
    await usdc.mint(player3.address, usdcAmount);
    await usdc.mint(player4.address, usdcAmount);

    // Approve ChainChaos to spend USDC
    await usdc.connect(player1).approve(chainChaos.target, usdcAmount);
    await usdc.connect(player2).approve(chainChaos.target, usdcAmount);
    await usdc.connect(player3).approve(chainChaos.target, usdcAmount);
    await usdc.connect(player4).approve(chainChaos.target, usdcAmount);

    return { chainChaos, usdc, owner, player1, player2, player3, player4 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { chainChaos, owner } = await loadFixture(deployChainChaosFixture);
      expect(await chainChaos.owner()).to.equal(owner.address);
    });

    it("Should set the right USDC token", async function () {
      const { chainChaos, usdc } = await loadFixture(deployChainChaosFixture);
      expect(await chainChaos.usdcToken()).to.equal(usdc.target);
    });

    it("Should start with nextBetId = 1", async function () {
      const { chainChaos } = await loadFixture(deployChainChaosFixture);
      expect(await chainChaos.nextBetId()).to.equal(1);
    });

    it("Should have no active bets initially", async function () {
      const { chainChaos } = await loadFixture(deployChainChaosFixture);
      const activeBets = await chainChaos.getActiveBets();
      expect(activeBets.length).to.equal(0);
    });
  });

  describe("Bet Creation", function () {
    it("Should allow owner to create a native currency bet", async function () {
      const { chainChaos, owner } = await loadFixture(deployChainChaosFixture);
      
      const category = "block_height";
      const description = "Next block height will be";
      const currencyType = 0; // NATIVE
      const betAmount = hre.ethers.parseEther("0.1");

      await expect(
        chainChaos.connect(owner).createBet(category, description, currencyType, betAmount)
      ).to.emit(chainChaos, "BetCreated")
        .withArgs(1, category, description, currencyType, betAmount);

      expect(await chainChaos.nextBetId()).to.equal(2);
    });

    it("Should allow owner to create a USDC bet", async function () {
      const { chainChaos, owner } = await loadFixture(deployChainChaosFixture);
      
      const category = "gas_price";
      const description = "Average gas price will be";
      const currencyType = 1; // USDC
      const betAmount = hre.ethers.parseUnits("10", 6);

      await expect(
        chainChaos.connect(owner).createBet(category, description, currencyType, betAmount)
      ).to.emit(chainChaos, "BetCreated")
        .withArgs(1, category, description, currencyType, betAmount);
    });

    it("Should not allow non-owner to create bet", async function () {
      const { chainChaos, player1 } = await loadFixture(deployChainChaosFixture);
      
      await expect(
        chainChaos.connect(player1).createBet("test", "test", 0, hre.ethers.parseEther("0.1"))
      ).to.be.revertedWithCustomError(chainChaos, "OwnableUnauthorizedAccount");
    });

    it("Should reject bet with zero amount", async function () {
      const { chainChaos, owner } = await loadFixture(deployChainChaosFixture);
      
      await expect(
        chainChaos.connect(owner).createBet("test", "test", 0, 0)
      ).to.be.revertedWithCustomError(chainChaos, "InvalidBetAmount");
    });

    it("Should add bet to active bets", async function () {
      const { chainChaos, owner } = await loadFixture(deployChainChaosFixture);
      
      await chainChaos.connect(owner).createBet("test", "test", 0, hre.ethers.parseEther("0.1"));
      
      const activeBets = await chainChaos.getActiveBets();
      expect(activeBets.length).to.equal(1);
      expect(activeBets[0]).to.equal(1);
    });
  });

  describe("Betting", function () {
    describe("Native Currency Betting", function () {
      it("Should allow placing bets with native currency", async function () {
        const { chainChaos, owner, player1 } = await loadFixture(deployChainChaosFixture);
        
        const betAmount = hre.ethers.parseEther("0.1");
        await chainChaos.connect(owner).createBet("test", "test", 0, betAmount);
        
        const guess = 1000;

        await expect(
          chainChaos.connect(player1).placeBetNative(1, guess, { value: betAmount })
        ).to.emit(chainChaos, "PlayerBetPlaced")
          .withArgs(1, player1.address, guess);
      });

      it("Should reject bets with wrong amount", async function () {
        const { chainChaos, owner, player1 } = await loadFixture(deployChainChaosFixture);
        
        const betAmount = hre.ethers.parseEther("0.1");
        await chainChaos.connect(owner).createBet("test", "test", 0, betAmount);
        
        const wrongAmount = hre.ethers.parseEther("0.05");
        const guess = 1000;

        await expect(
          chainChaos.connect(player1).placeBetNative(1, guess, { value: wrongAmount })
        ).to.be.revertedWithCustomError(chainChaos, "InvalidBetAmount");
      });

      it("Should reject native bets on USDC bet", async function () {
        const { chainChaos, owner, player1 } = await loadFixture(deployChainChaosFixture);
        
        const betAmount = hre.ethers.parseUnits("10", 6);
        await chainChaos.connect(owner).createBet("test", "test", 1, betAmount); // USDC bet
        
        await expect(
          chainChaos.connect(player1).placeBetNative(1, 1000, { value: hre.ethers.parseEther("0.1") })
        ).to.be.revertedWithCustomError(chainChaos, "WrongCurrency");
      });

      it("Should reject bets on non-active bet", async function () {
        const { chainChaos, owner, player1 } = await loadFixture(deployChainChaosFixture);
        
        const betAmount = hre.ethers.parseEther("0.1");
        await chainChaos.connect(owner).createBet("test", "test", 0, betAmount);
        await chainChaos.connect(player1).placeBetNative(1, 1000, { value: betAmount });
        
        // Settle the bet
        await chainChaos.connect(owner).settleBet(1, 1000);
        
        // Try to bet on settled bet
        await expect(
          chainChaos.connect(player1).placeBetNative(1, 1000, { value: betAmount })
        ).to.be.revertedWithCustomError(chainChaos, "BetNotActive");
      });

      it("Should update bet pot correctly", async function () {
        const { chainChaos, owner, player1, player2 } = await loadFixture(deployChainChaosFixture);
        
        const betAmount = hre.ethers.parseEther("0.1");
        await chainChaos.connect(owner).createBet("test", "test", 0, betAmount);

        await chainChaos.connect(player1).placeBetNative(1, 1000, { value: betAmount });
        await chainChaos.connect(player2).placeBetNative(1, 2000, { value: betAmount });

        const totalPot = await chainChaos.getBetPot(1);
        expect(totalPot).to.equal(betAmount * 2n);
      });

      it("Should reject duplicate bets from same player", async function () {
        const { chainChaos, owner, player1 } = await loadFixture(deployChainChaosFixture);
        
        const betAmount = hre.ethers.parseEther("0.1");
        await chainChaos.connect(owner).createBet("test", "test", 0, betAmount);
        
        // First bet should succeed
        await chainChaos.connect(player1).placeBetNative(1, 1000, { value: betAmount });
        
        // Second bet from same player should fail
        await expect(
          chainChaos.connect(player1).placeBetNative(1, 1500, { value: betAmount })
        ).to.be.revertedWithCustomError(chainChaos, "PlayerAlreadyBet");
      });
    });

    describe("USDC Betting", function () {
      it("Should allow placing bets with USDC", async function () {
        const { chainChaos, owner, player1 } = await loadFixture(deployChainChaosFixture);
        
        const betAmount = hre.ethers.parseUnits("10", 6);
        await chainChaos.connect(owner).createBet("test", "test", 1, betAmount);
        
        const guess = 1000;

        await expect(
          chainChaos.connect(player1).placeBetUSDC(1, guess)
        ).to.emit(chainChaos, "PlayerBetPlaced")
          .withArgs(1, player1.address, guess);
      });

      it("Should reject USDC bets on native bet", async function () {
        const { chainChaos, owner, player1 } = await loadFixture(deployChainChaosFixture);
        
        const betAmount = hre.ethers.parseEther("0.1");
        await chainChaos.connect(owner).createBet("test", "test", 0, betAmount); // Native bet
        
        await expect(
          chainChaos.connect(player1).placeBetUSDC(1, 1000)
        ).to.be.revertedWithCustomError(chainChaos, "WrongCurrency");
      });

      it("Should reject bets without sufficient allowance", async function () {
        const { chainChaos, usdc, owner, player1 } = await loadFixture(deployChainChaosFixture);
        
        const betAmount = hre.ethers.parseUnits("10", 6);
        await chainChaos.connect(owner).createBet("test", "test", 1, betAmount);
        
        // Reset allowance to 0
        await usdc.connect(player1).approve(chainChaos.target, 0);

        await expect(
          chainChaos.connect(player1).placeBetUSDC(1, 1000)
        ).to.be.revertedWithCustomError(chainChaos, "InsufficientUSDCAllowance");
      });

      it("Should update bet pot correctly", async function () {
        const { chainChaos, owner, player1, player2 } = await loadFixture(deployChainChaosFixture);
        
        const betAmount = hre.ethers.parseUnits("10", 6);
        await chainChaos.connect(owner).createBet("test", "test", 1, betAmount);

        await chainChaos.connect(player1).placeBetUSDC(1, 1000);
        await chainChaos.connect(player2).placeBetUSDC(1, 2000);

        const totalPot = await chainChaos.getBetPot(1);
        expect(totalPot).to.equal(betAmount * 2n);
      });

      it("Should reject duplicate bets from same player", async function () {
        const { chainChaos, owner, player1 } = await loadFixture(deployChainChaosFixture);
        
        const betAmount = hre.ethers.parseUnits("10", 6);
        await chainChaos.connect(owner).createBet("test", "test", 1, betAmount);
        
        // First bet should succeed
        await chainChaos.connect(player1).placeBetUSDC(1, 1000);
        
        // Second bet from same player should fail
        await expect(
          chainChaos.connect(player1).placeBetUSDC(1, 1500)
        ).to.be.revertedWithCustomError(chainChaos, "PlayerAlreadyBet");
      });
    });
  });

  describe("Bet Settlement", function () {
    it("Should allow owner to settle bets", async function () {
      const { chainChaos, owner, player1, player2 } = await loadFixture(deployChainChaosFixture);
      
      const betAmount = hre.ethers.parseEther("0.1");
      await chainChaos.connect(owner).createBet("test", "test", 0, betAmount);
      await chainChaos.connect(player1).placeBetNative(1, 1000, { value: betAmount });
      await chainChaos.connect(player2).placeBetNative(1, 1500, { value: betAmount });
      
      const actualValue = 1200;
      // |1000 - 1200| = 200, |1500 - 1200| = 300, so player1 (index 0) wins
      
      await expect(
        chainChaos.connect(owner).settleBet(1, actualValue)
      ).to.emit(chainChaos, "BetSettled")
        .withArgs(1, actualValue, [0], false); // player1 wins
    });

    it("Should not allow non-owner to settle", async function () {
      const { chainChaos, owner, player1 } = await loadFixture(deployChainChaosFixture);
      
      const betAmount = hre.ethers.parseEther("0.1");
      await chainChaos.connect(owner).createBet("test", "test", 0, betAmount);
      await chainChaos.connect(player1).placeBetNative(1, 1000, { value: betAmount });
      
      await expect(
        chainChaos.connect(player1).settleBet(1, 1000)
      ).to.be.revertedWithCustomError(chainChaos, "OwnableUnauthorizedAccount");
    });

    it("Should handle ties correctly", async function () {
      const { chainChaos, owner, player1, player2 } = await loadFixture(deployChainChaosFixture);
      
      const betAmount = hre.ethers.parseEther("0.1");
      await chainChaos.connect(owner).createBet("test", "test", 0, betAmount);
      await chainChaos.connect(player1).placeBetNative(1, 1000, { value: betAmount });
      await chainChaos.connect(player2).placeBetNative(1, 1000, { value: betAmount }); // Same guess
      
      await expect(
        chainChaos.connect(owner).settleBet(1, 1000)
      ).to.emit(chainChaos, "BetSettled")
        .withArgs(1, 1000, [0, 1], false); // Both players win
    });

    it("Should move bet to settled bets", async function () {
      const { chainChaos, owner, player1 } = await loadFixture(deployChainChaosFixture);
      
      const betAmount = hre.ethers.parseEther("0.1");
      await chainChaos.connect(owner).createBet("test", "test", 0, betAmount);
      await chainChaos.connect(player1).placeBetNative(1, 1000, { value: betAmount });
      
      // Before settlement
      expect((await chainChaos.getActiveBets()).length).to.equal(1);
      expect((await chainChaos.getSettledBets()).length).to.equal(0);
      
      await chainChaos.connect(owner).settleBet(1, 1000);
      
      // After settlement
      expect((await chainChaos.getActiveBets()).length).to.equal(0);
      expect((await chainChaos.getSettledBets()).length).to.equal(1);
    });

    it("Should handle multiple winners with equal distribution", async function () {
      const { chainChaos, owner, player1, player2, player3 } = await loadFixture(deployChainChaosFixture);
      
      const betAmount = hre.ethers.parseEther("0.1");
      await chainChaos.connect(owner).createBet("test", "test", 0, betAmount);
      
      // Player1 and Player2 both guess 1000 (will win)
      await chainChaos.connect(player1).placeBetNative(1, 1000, { value: betAmount });
      await chainChaos.connect(player2).placeBetNative(1, 1000, { value: betAmount });
      await chainChaos.connect(player3).placeBetNative(1, 1500, { value: betAmount }); // Will lose
      
      await chainChaos.connect(owner).settleBet(1, 1000);
      
      // Both winners should get equal share: (Total pot - 5% fee) / 2
      const totalPot = betAmount * 3n;
      const remainingPot = totalPot - (totalPot * 5n) / 100n;
      const expectedPrize = remainingPot / 2n;
      
      await expect(
        chainChaos.connect(player1).claimPrize(1)
      ).to.emit(chainChaos, "PrizeClaimed")
        .withArgs(1, player1.address, expectedPrize);
        
      await expect(
        chainChaos.connect(player2).claimPrize(1)
      ).to.emit(chainChaos, "PrizeClaimed")
        .withArgs(1, player2.address, expectedPrize);
    });
  });

  describe("Bet Cancellation", function () {
    it("Should allow owner to cancel bets", async function () {
      const { chainChaos, owner, player1 } = await loadFixture(deployChainChaosFixture);
      
      const betAmount = hre.ethers.parseEther("0.1");
      await chainChaos.connect(owner).createBet("test", "test", 0, betAmount);
      await chainChaos.connect(player1).placeBetNative(1, 1000, { value: betAmount });
      
      await expect(
        chainChaos.connect(owner).cancelBet(1)
      ).to.emit(chainChaos, "BetCancelled")
        .withArgs(1);
    });

    it("Should not allow non-owner to cancel", async function () {
      const { chainChaos, owner, player1 } = await loadFixture(deployChainChaosFixture);
      
      const betAmount = hre.ethers.parseEther("0.1");
      await chainChaos.connect(owner).createBet("test", "test", 0, betAmount);
      
      await expect(
        chainChaos.connect(player1).cancelBet(1)
      ).to.be.revertedWithCustomError(chainChaos, "OwnableUnauthorizedAccount");
    });
  });

  describe("Prize Claiming", function () {
    it("Should allow winners to claim prizes", async function () {
      const { chainChaos, owner, player1, player2 } = await loadFixture(deployChainChaosFixture);
      
      const betAmount = hre.ethers.parseEther("0.1");
      await chainChaos.connect(owner).createBet("test", "test", 0, betAmount);
      await chainChaos.connect(player1).placeBetNative(1, 1000, { value: betAmount });
      await chainChaos.connect(player2).placeBetNative(1, 1500, { value: betAmount });
      
      await chainChaos.connect(owner).settleBet(1, 1200); // player1 wins
      
      // Calculate expected prize (95% of total pot since 5% owner fee)
      const totalPot = betAmount * 2n;
      const expectedPrize = totalPot * 95n / 100n;
      
      await expect(
        chainChaos.connect(player1).claimPrize(1)
      ).to.emit(chainChaos, "PrizeClaimed")
        .withArgs(1, player1.address, expectedPrize);
    });

    it("Should allow refund claims for cancelled bets", async function () {
      const { chainChaos, owner, player1 } = await loadFixture(deployChainChaosFixture);
      
      const betAmount = hre.ethers.parseEther("0.1");
      await chainChaos.connect(owner).createBet("test", "test", 0, betAmount);
      await chainChaos.connect(player1).placeBetNative(1, 1000, { value: betAmount });
      
      await chainChaos.connect(owner).cancelBet(1);
      
      await expect(
        chainChaos.connect(player1).claimPrize(1)
      ).to.emit(chainChaos, "Refunded")
        .withArgs(1, player1.address, betAmount);
    });

    it("Should not allow claiming from non-settled bets", async function () {
      const { chainChaos, owner, player1 } = await loadFixture(deployChainChaosFixture);
      
      const betAmount = hre.ethers.parseEther("0.1");
      await chainChaos.connect(owner).createBet("test", "test", 0, betAmount);
      await chainChaos.connect(player1).placeBetNative(1, 1000, { value: betAmount });
      
      await expect(
        chainChaos.connect(player1).claimPrize(1)
      ).to.be.revertedWithCustomError(chainChaos, "BetNotSettled");
    });

    it("Should handle USDC prize claims", async function () {
      const { chainChaos, owner, player1, player2 } = await loadFixture(deployChainChaosFixture);
      
      const betAmount = hre.ethers.parseUnits("10", 6);
      await chainChaos.connect(owner).createBet("test", "test", 1, betAmount);
      await chainChaos.connect(player1).placeBetUSDC(1, 1000);
      await chainChaos.connect(player2).placeBetUSDC(1, 1500);
      
      await chainChaos.connect(owner).settleBet(1, 1200); // player1 wins
      
      const totalPot = betAmount * 2n;
      const expectedPrize = totalPot * 95n / 100n;
      
      await expect(
        chainChaos.connect(player1).claimPrize(1)
      ).to.emit(chainChaos, "PrizeClaimed")
        .withArgs(1, player1.address, expectedPrize);
    });
  });

  describe("View Functions", function () {
    it("Should return correct bet info", async function () {
      const { chainChaos, owner } = await loadFixture(deployChainChaosFixture);
      
      const category = "block_height";
      const description = "Next block height";
      const currencyType = 0; // NATIVE
      const betAmount = hre.ethers.parseEther("0.1");
      
      await chainChaos.connect(owner).createBet(category, description, currencyType, betAmount);
      
      const betInfo = await chainChaos.getBetInfo(1);
      expect(betInfo.id).to.equal(1);
      expect(betInfo.category).to.equal(category);
      expect(betInfo.description).to.equal(description);
      expect(betInfo.currencyType).to.equal(currencyType);
      expect(betInfo.betAmount).to.equal(betAmount);
      expect(betInfo.status).to.equal(0); // ACTIVE
    });

    it("Should return correct player bet info", async function () {
      const { chainChaos, owner, player1 } = await loadFixture(deployChainChaosFixture);
      
      const betAmount = hre.ethers.parseEther("0.1");
      await chainChaos.connect(owner).createBet("test", "test", 0, betAmount);
      
      const guess = 1000;
      await chainChaos.connect(player1).placeBetNative(1, guess, { value: betAmount });
      
      const playerBet = await chainChaos.getPlayerBet(1, 0);
      expect(playerBet.player).to.equal(player1.address);
      expect(playerBet.guess).to.equal(guess);
      expect(playerBet.claimed).to.be.false;
    });

    it("Should return correct winner indices", async function () {
      const { chainChaos, owner, player1, player2 } = await loadFixture(deployChainChaosFixture);
      
      const betAmount = hre.ethers.parseEther("0.1");
      await chainChaos.connect(owner).createBet("test", "test", 0, betAmount);
      await chainChaos.connect(player1).placeBetNative(1, 1000, { value: betAmount });
      await chainChaos.connect(player2).placeBetNative(1, 1500, { value: betAmount });
      
      await chainChaos.connect(owner).settleBet(1, 1200); // player1 wins
      
      const winnerIndices = await chainChaos.getBetWinnerIndices(1);
      expect(winnerIndices).to.deep.equal([0n]); // player1 at index 0
    });
  });
}); 