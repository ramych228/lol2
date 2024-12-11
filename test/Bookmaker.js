const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Bookmaker Contract", function () {
  let owner;
  let otherAccount;
  let token;
  let bookmakerContract;
  let eventId;
  let initialFee;

  beforeEach(async function () {
    [owner, otherAccount] = await ethers.getSigners();

    // Deploy a mock ERC20 token
    const Token = await ethers.getContractFactory("ERC20Mock");
    token = await Token.deploy("Test Token", "TST", ethers.utils.parseEther("1000000"));
    await token.deployed();

    // Deploy the bookmaker contract
    const BookmakerContract = await ethers.getContractFactory("Bookmaker");
    bookmakerContract = await BookmakerContract.deploy();
    await bookmakerContract.deployed();

    // Create an event with an initial bookmaker fee
    initialFee = 100; // Example fee
    await bookmakerContract.createEvent(initialFee, token.address);

    // Get the event ID
    eventId = 0;

    // Transfer tokens to other account
    await token.transfer(await otherAccount.getAddress(), ethers.utils.parseEther("1000"));
  });

  describe("Event creation and editing", function () {
    it("Should create an event with correct details", async function () {
      const event = await bookmakerContract.getEvent(eventId);

      expect(event.bookmakerFee.toNumber()).to.equal(initialFee);
      expect(event.owner).to.equal(await owner.getAddress());
      expect(event.finished).to.be.false;
    });

    it("Should allow owner to edit the event's bookmaker fee", async function () {
      const newFee = 200;
      await bookmakerContract.editEvent(eventId, newFee);
      const event = await bookmakerContract.getEvent(eventId);
      expect(event.bookmakerFee.toNumber()).to.equal(newFee);
    });

    it("Should revert if a non-owner tries to edit the event", async function () {
      const newFee = 200;
      await expect(bookmakerContract.connect(otherAccount).editEvent(eventId, newFee)).to.be.revertedWith("You are not the owner of this event");
    });
  });

  describe("Betting", function () {
    it("Should allow users to place bets", async function () {
      const betAmount = ethers.utils.parseEther("10");
      await token.connect(otherAccount).approve(bookmakerContract.address, betAmount);
      
      await bookmakerContract.connect(otherAccount).bet(eventId, true, betAmount);

      const event = await bookmakerContract.getEvent(eventId);
      expect(event.trueAmount).to.equal(betAmount);
    });

    it("Should revert if betting on a finished event", async function () {
      await bookmakerContract.finishEvent(eventId, true);
      
      const betAmount = ethers.utils.parseEther("10");
      await token.connect(otherAccount).approve(bookmakerContract.address, betAmount);
      
      await expect(bookmakerContract.connect(otherAccount).bet(eventId, true, betAmount)).to.be.revertedWith("Event is finished");
    });

    it("Should correctly track bets by users", async function () {
      const betAmount = ethers.utils.parseEther("10");
      await token.connect(otherAccount).approve(bookmakerContract.address, betAmount);
      
      await bookmakerContract.connect(otherAccount).bet(eventId, true, betAmount);

      const bet = await bookmakerContract.bets(eventId, await otherAccount.getAddress());
      expect(bet.amount).to.equal(betAmount);
      expect(bet.isTrue).to.be.true;
    });
  });

  describe("Event finishing and withdrawing", function () {
    it("Should allow owner to finish an event", async function () {
      const winner = true;
      await bookmakerContract.finishEvent(eventId, winner);
      const event = await bookmakerContract.getEvent(eventId);
      expect(event.finished).to.be.true;
      expect(event.winner).to.equal(winner);
    });

    it("Should allow winner to withdraw funds", async function () {
      const betAmount = ethers.utils.parseEther("10");
      await token.connect(otherAccount).approve(bookmakerContract.address, betAmount);
      await bookmakerContract.connect(otherAccount).bet(eventId, true, betAmount);
      await bookmakerContract.finishEvent(eventId, true);
      

      const event = await bookmakerContract.getEvent(eventId);
      expect(event.trueAmount).to.equal(betAmount);
    });

    it("Should revert if a non-winner tries to withdraw", async function () {
      const betAmount = ethers.utils.parseEther("10");
      await token.connect(otherAccount).approve(bookmakerContract.address, betAmount);
      await bookmakerContract.connect(otherAccount).bet(eventId, true, betAmount);
      await bookmakerContract.finishEvent(eventId, false);
      
      await expect(bookmakerContract.connect(otherAccount).withdraw(eventId)).to.be.revertedWith("You are not the winner");
    });

    it("Should allow bookmaker to withdraw fee", async function () {
      await bookmakerContract.finishEvent(eventId, true);
      
      const initialBalance = await token.balanceOf(await owner.getAddress());
      await bookmakerContract.withdrawBookmaker(eventId);
      const finalBalance = await token.balanceOf(await owner.getAddress());

      const event = await bookmakerContract.getEvent(eventId);
      expect(finalBalance.sub(initialBalance)).to.equal(event.bookmakerFee * (event.trueAmount + event.falseAmount));
    });
  });
});
