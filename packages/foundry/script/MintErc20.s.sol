//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Script, console } from "forge-std/Script.sol";
import "../contracts/CPAMM.sol";
import "../contracts/TestnetERC20Token.sol";

contract MintErc20Script is Script {
  function run() external {
    vm.startBroadcast();

    (, address _deployer,) = vm.readCallers();
    console.logString(string.concat("Deployer: ", vm.toString(_deployer)));

    string memory addressesPath = "./deployments/addresses.json";
    string memory addressesJson = vm.readFile(addressesPath);
    address daiAddress = vm.parseJsonAddress(addressesJson, ".dai");
    address wbtcAddress = vm.parseJsonAddress(addressesJson, ".wbtc");

    TestnetERC20Token dai = TestnetERC20Token(daiAddress);
    dai.mint(_deployer, 1000 * (10 ** 18));

    TestnetERC20Token wbtc = TestnetERC20Token(wbtcAddress);
    wbtc.mint(_deployer, 1000 * (10 ** 18));

    vm.stopBroadcast();
  }
}
