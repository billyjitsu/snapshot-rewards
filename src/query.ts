import { GraphQLClient, gql } from "graphql-request";

async function fetchVotes() {
  function flattenVoterArray(obj) {
    if (!obj.votes) {
      return [];
    }

    return obj.votes.map((vote) => vote.voter);
  }

  const endpoint = "https://hub.snapshot.org/graphql";
  const client = new GraphQLClient(endpoint);

  const query = gql`
    query {
      votes(
        first: 10
        skip: 0
        where: { proposal: "QmPvbwguLfcVryzBRrbY4Pb9bCtxURagdv1XjhtFLf3wHj" }
        orderBy: "created"
        orderDirection: desc
      ) {
        voter
      }
    }
  `;

  try {
    const data = await client.request(query);
    console.log(data);
    let flattenData = flattenVoterArray(data);
    console.log(flattenData);
    //  return flattenData;
  } catch (error) {
    console.error("Error:", error.response.errors);
  }
}

fetchVotes();

export default fetchVotes;
