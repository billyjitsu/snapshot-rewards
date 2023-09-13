// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./PhatRollupAnchor.sol";
import "hardhat/console.sol";

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract TestLensApiConsumerContract is PhatRollupAnchor, Ownable {
    event ResponseReceived(uint reqId, string pair, address voter1, address voter2, address voter3, address voter4, address voter5);
    event ErrorReceived(uint reqId, string pair, address voter);
    event Deposited(address indexed user, uint256 amount);
    event Distributed(address indexed user, uint256 totalAmount);

    IERC20 public token;  // ERC20 token contract
    uint constant TYPE_RESPONSE = 0;
    uint constant TYPE_ERROR = 2;

    mapping (string => address) public walletRegistry;
    mapping(uint => string) requests;
    uint nextRequest = 1;


    constructor(address phatAttestor) {
        _grantRole(PhatRollupAnchor.ATTESTOR_ROLE, phatAttestor);
    }

    function setAttestor(address phatAttestor) public {
        _grantRole(PhatRollupAnchor.ATTESTOR_ROLE, phatAttestor);
    }

    function request(string calldata profileId) public {
        // assemble the request
        uint id = nextRequest;
        requests[id] = profileId;
        _pushMessage(abi.encode(id, profileId));
        nextRequest += 1;
    }

    // For test
    function malformedRequest(bytes calldata malformedData) public {
        uint id = nextRequest;
        requests[id] = "malformed_req";
        _pushMessage(malformedData);
        nextRequest += 1;
    }

    function _onMessageReceived(bytes calldata action) internal override {
        //require(action.length == 32 * 3, "cannot parse action");
        console.logBytes(action);
        (uint respType, uint id, address voter1, address voter2, address voter3, address voter4, address voter5) = abi.decode(
            action,
            (uint, uint, address, address, address, address, address)
        );
        console.log("voters recieved:", voter1);
        console.log("voters recieved:", voter2);
        console.log("voters recieved:", voter3);
        console.log("voters recieved:", voter4);
        console.log("voters recieved:", voter5);

        // Create a local array to hold the voter addresses
        address[] memory voters = new address[](5);
        voters[0] = voter1;
        voters[1] = voter2;
        voters[2] = voter3;
        voters[3] = voter4;
        voters[4] = voter5;

        if (respType == TYPE_RESPONSE) {
            emit ResponseReceived(id, requests[id], voter1, voter2, voter3, voter4, voter5);
            delete requests[id];
            //CALL FUNCTION HERE VOTERS
            console.log("distribute tokens");
            distributeTokens(voters);
        } else if (respType == TYPE_ERROR) {
            emit ErrorReceived(id, requests[id], voter1);
            delete requests[id];
        }
    }

    function setToken(address tokenAddress) external onlyOwner {
        token = IERC20(tokenAddress);
    }

    function registerWallet(string calldata profileId, address walletAddress) external {
        walletRegistry[profileId] = walletAddress;
    }

    // Deposit tokens into this contract
    function depositTokens(uint256 amount) external {
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit Deposited(msg.sender, amount);
    }

    // Distribute tokens to the list of addresses
     function distributeTokens(address[] memory recipients) public {
        console.log("Inside Distribute Tokens", recipients[0]);
        uint256 totalAmount = token.balanceOf(address(this));
        uint256 numOfRecipients = recipients.length;

        require(numOfRecipients > 0, "No recipients provided");
        uint256 amountPerRecipient = totalAmount / numOfRecipients;
        require(amountPerRecipient > 0, "Amount per recipient is zero");

        for (uint i = 0; i < numOfRecipients; i++) {
            require(token.transfer(recipients[i], amountPerRecipient), "Transfer failed");
        }
        emit Distributed(msg.sender, totalAmount);
    }

    //
    function getAddress(string memory key) public view returns (address) {
        return walletRegistry[key];
    }

}