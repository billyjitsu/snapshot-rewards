import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { type Contract, type Event } from "ethers";
import { ethers } from "hardhat";
import { execSync } from "child_process";

async function waitForResponse(consumer: Contract, event: Event) {
  const [, data] = event.args!;
  console.log("data:", data);
  // Run Phat Function
  const result = execSync(
    `phat-fn run --json dist/index.js -a ${data}`
  ).toString();
  //console.log("result:", result);
  const json = JSON.parse(result);
  console.log("json:", json);
  const action = ethers.utils.hexlify(
    ethers.utils.concat([new Uint8Array([0]), json.output])
  );
 console.log("action:", action);
 console.log("made it to tx");
  // Make a response
  const tx = await consumer.rollupU256CondEq(
    // cond
    [],
    [],
    // updates
    [],
    [],
    // actions
    [action]
  );
  console.log("made through tx")
  const receipt = await tx.wait();
  return receipt.events;
}

describe("Initialize", function () {
  async function beforeEachFunction() {

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, thirdAccount] = await ethers.getSigners();

    const TestLensApiConsumerContract = await ethers.getContractFactory(
      "TestLensApiConsumerContract"
    );
    const consumer = await TestLensApiConsumerContract.deploy(owner.address);

    const MockToken = await ethers.getContractFactory("Code");
    const mockToken = await MockToken.deploy();

    return { consumer, mockToken, owner, otherAccount, thirdAccount };
  }

  describe("Deployment", function () {
    xit("Should set the right owner", async function () {
      const { consumer, owner } = await loadFixture(beforeEachFunction);
     // console.log("owner: ", owner.address);

      expect(await consumer.owner()).to.equal(owner.address);
    });
  });

  describe("Deposit Vote", function () {
    xit("Let me Set Token", async function () {
      const { consumer, mockToken, otherAccount, owner, thirdAccount } = await loadFixture(
        beforeEachFunction
      );
      await mockToken.mint();
      //console.log("Balance of owner:", await mockToken.balanceOf(owner.address));
      await consumer.setToken(mockToken.address);

      await mockToken.approve(consumer.address, ethers.utils.parseEther("10"));
      await consumer.depositTokens(ethers.utils.parseEther("10"));

      expect(await mockToken.balanceOf(consumer.address)).to.equal(ethers.utils.parseEther("10"));
      // await expect(consumer.connect(otherAccount).depositVote(true, {value: ethers.utils.parseEther("1")})).to.be.rejectedWith();
    });
  });

  /*    */
  describe("TestLensApiConsumerContract", function () {
    it("Push and receive message", async function () {
      // Deploy the contract
      // const [deployer] = await ethers.getSigners();
      // const TestLensApiConsumerContract = await ethers.getContractFactory("TestLensApiConsumerContract");
      // const consumer = await TestLensApiConsumerContract.deploy(deployer.address);

      const { consumer, mockToken, otherAccount, owner, thirdAccount } = await loadFixture(
        beforeEachFunction
      );

      ////////// 1. Set Token //////////
      await mockToken.mint();
      //console.log("Balance of owner:", await mockToken.balanceOf(owner.address));
      await consumer.setToken(mockToken.address);

      await mockToken.approve(consumer.address, ethers.utils.parseEther("10"));
      await consumer.depositTokens(ethers.utils.parseEther("10"));


      // Make a request
      // const profileId = "0x01";
      const snapshotProposalId =
        "QmPvbwguLfcVryzBRrbY4Pb9bCtxURagdv1XjhtFLf3wHj";
      const tx = await consumer.request(snapshotProposalId);
      // console.log("request sent");
      const receipt = await tx.wait();
      const reqEvents = receipt.events;
      expect(reqEvents![0]).to.have.property("event", "MessageQueued");
      console.log("reqEvents passed");
      //console.log("reqEvents:", reqEvents![0]);

      // Wait for Phat Function response
      const respEvents = await waitForResponse(consumer, reqEvents![0]);
      console.log("response received");
      console.log("respEvents:", respEvents);

      // Check response data
      expect(respEvents[0]).to.have.property("event", "ResponseReceived");
      const [reqId, pair, value, value1] = respEvents[0].args;
      console.log("reqId:", reqId);
      console.log("pair:", pair);
      console.log("value:", value);
      console.log("value1:", value1);

      expect(ethers.BigNumber.isBigNumber(reqId)).to.be.true;
      expect(pair).to.equal(snapshotProposalId);
     // expect(ethers.BigNumber.isBigNumber(value)).to.be.true;
     expect(await mockToken.balanceOf('0x96176C25803Ce4cF046aa74895646D8514Ea1611')).to.equal(ethers.utils.parseEther("2"));
    });
  });

  describe("Distribute Tokens", function () {
    xit("Let me Set Token", async function () {
      const { consumer, mockToken, otherAccount, owner, thirdAccount } = await loadFixture(
        beforeEachFunction
      );
      await mockToken.mint();
      await consumer.setToken(mockToken.address);

      await mockToken.approve(consumer.address, ethers.utils.parseEther("10"));
      await consumer.depositTokens(ethers.utils.parseEther("10"));
      //Currently set to public for testing 
      expect(await mockToken.balanceOf(consumer.address)).to.equal(ethers.utils.parseEther("10"));
      await consumer.distributeTokens([otherAccount.address, thirdAccount.address]);
      expect(await mockToken.balanceOf(otherAccount.address)).to.equal(ethers.utils.parseEther("5"));
      expect(await mockToken.balanceOf(thirdAccount.address)).to.equal(ethers.utils.parseEther("5"));
    });
  });

});
