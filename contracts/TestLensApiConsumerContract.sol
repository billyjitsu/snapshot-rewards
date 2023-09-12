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
    event ResponseReceived(uint reqId, string pair, address [] voters);
    event ErrorReceived(uint reqId, string pair, address [] voters);
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
        (uint respType, uint id, address[] memory voters) = abi.decode(
            action,
            (uint, uint, address[])
        );
        console.log("voters recieved:", voters.length);
        if (respType == TYPE_RESPONSE) {
            emit ResponseReceived(id, requests[id], voters);
            delete requests[id];
            //CALL FUNCTION HERE VOTERS
            distributeTokens(voters);
        } else if (respType == TYPE_ERROR) {
            emit ErrorReceived(id, requests[id], voters);
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
