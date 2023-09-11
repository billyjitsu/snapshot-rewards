import { expect } from "chai";
import { type Contract, type Event } from "ethers";
import { ethers } from "hardhat";
import { execSync } from "child_process";

async function waitForResponse(consumer: Contract, event: Event) {
  const [, data] = event.args!;
  console.log ("data:", data);
  // Run Phat Function
  const result = execSync(`phat-fn run --json dist/index.js -a ${data}`).toString();
  console.log("result:", result);
  const json = JSON.parse(result);
  console.log("json:", json);
  const action = ethers.utils.hexlify(ethers.utils.concat([
    new Uint8Array([0]),
    json.output,
  ]));
  console.log("action:", action)
  // Make a response
  const tx = await consumer.rollupU256CondEq(
    // cond
    [],
    [],
    // updates
    [],
    [],
    // actions
    [action],
  );
  const receipt = await tx.wait();
  return receipt.events;
}

describe("TestLensApiConsumerContract", function () {
  it("Push and receive message", async function () {
    // Deploy the contract
    const [deployer] = await ethers.getSigners();
    const TestLensApiConsumerContract = await ethers.getContractFactory("TestLensApiConsumerContract");
    const consumer = await TestLensApiConsumerContract.deploy(deployer.address);

    // Make a request
    // const profileId = "0x01";
    const snapshotProposalId = "QmPvbwguLfcVryzBRrbY4Pb9bCtxURagdv1XjhtFLf3wHj";
    const tx = await consumer.request(snapshotProposalId);
    // console.log("request sent");
    const receipt = await tx.wait();
    const reqEvents = receipt.events;
    expect(reqEvents![0]).to.have.property("event", "MessageQueued");
    console.log("reqEvents passed");
    // console.log("reqEvents:", reqEvents![0]);
  
    // Wait for Phat Function response
    const respEvents = await waitForResponse(consumer, reqEvents![0])
    console.log("response received");
    // Check response data
    expect(respEvents[0]).to.have.property("event", "ResponseReceived");
    const [reqId, pair, value] = respEvents[0].args;
    expect(ethers.BigNumber.isBigNumber(reqId)).to.be.true;
    expect(pair).to.equal(snapshotProposalId);
    expect(ethers.BigNumber.isBigNumber(value)).to.be.true;
  });
});
