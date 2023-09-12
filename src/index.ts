import "@phala/pink-env";
import { Coders } from "@phala/ethers";


type HexString = `0x${string}`;

// eth abi coder
const uintCoder = new Coders.NumberCoder(32, false, "uint256");
const bytesCoder = new Coders.BytesCoder("bytes");
const addressCoder = new Coders.AddressCoder("address");
const addresArrayCoder = new Coders.ArrayCoder(addressCoder, 10, "address");


//play with chaning this to string and then adding 0x to each address
function encodeReply(reply: [number, number, string [] ]): HexString {
  return Coders.encode([uintCoder, uintCoder, addresArrayCoder], reply) as HexString;
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

function isHexString(str: string): boolean {
  const regex = /^0x[0-9a-f]+$/;
  return regex.test(str.toLowerCase());
}

function stringToHex(str: string): string {
  var hex = "";
  for (var i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16);
  }
  return "0x" + hex;
}

function fetchSnapshotAPI(proposalId: string): any {
  function flattenVoterArray(obj) {
    let flattenVoterArray = new Array();
    const getArray = obj.data.votes;
    for (let i of getArray) {
      flattenVoterArray.push(i.voter);
      //console.log(i.voter);
    }
   // console.log("flattenVoterArray after push:", flattenVoterArray);
    return flattenVoterArray;
  }

  const endpoint = "https://hub.snapshot.org/graphql";
  // console.log("proposalId:", proposalId);

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
      `Fail to read Snapshot api with status code: ${
        response.statusCode
      }, error: ${response.error || response.body}}`
    );
    throw Error.FailedToFetchData;
  }

  let respBody = response.body;
  // console.log("responseBody:", respBody);

  if (typeof respBody !== "string") {
    throw Error.FailedToDecode;
  }

  let parsedData = JSON.parse(respBody);
  // console.log(JSON.stringify(parsedData, null, 2));
  //let parsedString = JSON.stringify(parsedData, null, 2);
  //console.log("parsedData:", parsedData);
  let flattenedData = flattenVoterArray(parsedData);
  //console.log("flattenedData", flattenedData);
  return flattenedData;
}

function parseProfileId(hexx: string): string {
  var hex = hexx.toString();
  if (!isHexString(hex)) {
    throw Error.BadLensProfileId;
  }
  hex = hex.slice(2);
  var str = "";
  for (var i = 0; i < hex.length; i += 2) {
    const ch = String.fromCharCode(parseInt(hex.substring(i, i + 2), 16));
    str += ch;
  }
  return str;
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
export default function main(proposalId: string){
  let requestId, encodedProfileId;
  try {
    [requestId, encodedProfileId] = Coders.decode([uintCoder, bytesCoder], proposalId);
  } catch (error) {
    console.info("Malformed request received");
    return encodeReply([TYPE_ERROR, 0, [error] ]);
  }
  const profileId = parseProfileId(encodedProfileId as string);
  //console.log(`Request received for profile ${profileId}`);


  try {
    let snapRespsonce = fetchSnapshotAPI(profileId);
   // console.log("snapRespsonce:", snapRespsonce);
    //console.log( "response:", [TYPE_RESPONSE, requestId, snapRespsonce])
    return encodeReply([TYPE_RESPONSE, requestId, snapRespsonce]);
  } catch (error) {
    if (error === Error.FailedToFetchData) {
      throw error;
    } else {
      console.log("error:", error);
    }
  }
}

//main("QmPvbwguLfcVryzBRrbY4Pb9bCtxURagdv1XjhtFLf3wHj");