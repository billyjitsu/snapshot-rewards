// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Code is ERC20, Ownable {
    constructor() ERC20("Code", "CODE") {}

    function mint() public{
        _mint(msg.sender, 100e18);
    }
}