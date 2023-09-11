import "@phala/pink-env";
import { Coders } from "@phala/ethers";
// import fetchVotes  from "./query";

type HexString = `0x${string}`

// eth abi coder
const uintCoder = new Coders.NumberCoder(32, false, "uint256");
const bytesCoder = new Coders.BytesCoder("bytes");

function encodeReply(reply: [number, number, number]): HexString {
  return Coders.encode([uintCoder, uintCoder, uintCoder], reply) as HexString;
}

// Defined in TestLensOracle.sol
const TYPE_RESPONSE = 0;
const TYPE_ERROR = 2;

enum Error {
  BadLensProfileId = "BadLensProfileId",
  FailedToFetchData = "FailedToFetchData",
  FailedToDecode = "FailedToDecode",
  MalformedRequest = "MalformedRequest",
}

function errorToCode(error: Error): number {
  switch (error) {
    case Error.BadLensProfileId:
      return 1;
    case Error.FailedToFetchData:
      return 2;
    case Error.FailedToDecode:
      return 3;
    case Error.MalformedRequest:
      return 4;
    default:
      return 0;
  }
}

// function isHexString(str: string): boolean {
//   const regex = /^0x[0-9a-f]+$/;
//   return regex.test(str.toLowerCase());
// }

function stringToHex(str: string): string {
  var hex = "";
  for (var i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16);
  }
  return "0x" + hex;
}



function fetchSnapshotAPI(proposalId: string): any {
  function flattenVoterArray(obj) {
    if (!obj.votes) {
      return [];
    }
    return obj.votes.map((vote) => vote.voter);
  }

  const endpoint = "https://hub.snapshot.org/graphql";
  console.log("proposalId:", proposalId);

  let headers = {
    "Content-Type": "application/json",
    "User-Agent": "phat-contract",
  };

  let query = JSON.stringify({
    query: ` query {
      votes(
        first: 10
        skip: 0
        where: { proposal: \"${proposalId}\" }
        orderBy: "created"
        orderDirection: desc
      ) 
      {
        voter
      }
    }`,
  });

  // console.log("query before the Hex:", query);

  let body = stringToHex(query); 

  // console.log("body after hex:", body);

  let response = pink.batchHttpRequest(
    [
      {
        url: endpoint,
        method: "POST",
        headers,
        body,
        returnTextBody: true,
      },
    ],
    10000
  )[0];

  if (response.statusCode !== 200) {
    console.log(
      `Fail to read Snapshot api with status code: ${response.statusCode}, error: ${
        response.error || response.body
      }}`
    );
    throw Error.FailedToFetchData;
  }

  let respBody = response.body;
  console.log("responseBody:", respBody);

  if (typeof respBody !== "string") {
    throw Error.FailedToDecode;
  }

  // let parsedData = JSON.parse(respBody);
  // console.log("parsedData:", parsedData);
  let flattenedData = flattenVoterArray(respBody);
  console.log("flattenedData", flattenedData);
  return flattenedData;
}

//
// Here is what you need to implemented for Phat Function, you can customize your logic with
// JavaScript here.
//
// The function will be called with two parameters:
//
// - request: The raw payload from the contract call `request` (check the `request` function in TestLensApiConsumerConract.sol).
//            In this example, it's a tuple of two elements: [requestId, profileId]
// - settings: The custom settings you set with the `config_core` function of the Action Offchain Rollup Phat Contract. In
//            this example, it just a simple text of the lens api url prefix.
//
// Your returns value MUST be a hex string, and it will send to your contract directly. Check the `_onMessageReceived` function in
// TestLensApiConsumerContract.sol for more details. We suggest a tuple of three elements: [successOrNotFlag, requestId, data] as
// the return value.
//
export default async function main(proposalId: string) {
  try{
    let snapRespsonce = fetchSnapshotAPI(proposalId);
  // await fetchSnapshotAPI();
  } catch (error) {
    if (error === Error.FailedToFetchData) {
      throw error;
    } else {
      console.log("error:", error);
    }
  }

}

//main("QmPvbwguLfcVryzBRrbY4Pb9bCtxURagdv1XjhtFLf3wHj");