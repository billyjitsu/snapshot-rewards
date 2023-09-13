# Snapshot Rewards

## Table of Contents

- [Overview](#overview)
- [Features](#features)


## Overview

This project leverages the power of the phat functions on Phala network to reward active users on Snapshot.org with on chain rewards.

The owner can set a any ERC-20 token (can even be modified to mint NFTS) to be distributed equally amongst all the addresses that participated in the specific snapshot.

This project consists of a Solidity smart contract (`TestLensApiConsumerContract`) and a JavaScript file for phat functions requests integration. The project aims to interact with ERC20 tokens and handle API requests to fetch voter information from the Snapshot API. It also includes a modified test suite to validate the functionalities.

### TestLensApiConsumerContract

This Solidity smart contract is designed to:

- Setting the choice of token of choice to distribute "setToken"
- Distributes ERC20 tokens among specified addresses in a trustless manner.
- Log various events such as deposits, distributions, and API responses.

### Phat Phunction Integration

This Phat Function file (index.ts) is responsible for:

- Encoding and decoding data for interaction with the smart contract.
- Fetching voter information from the Snapshot API based on a given proposal ID.
- Parsing profile IDs and handling errors.
- Utilizing pink.HTTP requests to build the Phat Function

## Features

- **Token Management**: Allows the owner to set an ERC20 token for transactions.
- **Deposits**: Users can deposit tokens into the contract.
- **API Requests**: Users can make API requests to fetch voter information from the Snapshot API.
- **Token Distribution**: Distributes tokens to a list of addresses based on the voter information fetched.
- **Event Logging**: Logs events for API responses, errors, deposits, and distributions.
