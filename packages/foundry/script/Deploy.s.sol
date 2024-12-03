//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Script, console } from "forge-std/Script.sol";
import "../contracts/CPAMM.sol";
import "../contracts/TestnetERC20Token.sol";

contract DeployScript is Script {
  function run() external {
    vm.startBroadcast();

    (, address _deployer,) = vm.readCallers();
    console.logString(string.concat("Deployer: ", vm.toString(_deployer)));

    TestnetERC20Token dai = new TestnetERC20Token("DAI", "DAI", 18);
    console.logString(
      string.concat("DAI deployed at: ", vm.toString(address(dai)))
    );

    TestnetERC20Token wbtc = new TestnetERC20Token("WBTC", "WBTC", 18);
    console.logString(
      string.concat("WBTC deployed at: ", vm.toString(address(wbtc)))
    );

    CPAMM cPAMM = new CPAMM(address(dai), address(wbtc));
    console.logString(
      string.concat("CPAMM deployed at: ", vm.toString(address(cPAMM)))
    );

    vm.serializeAddress("deployments", "dai", address(dai));
    vm.serializeAddress("deployments", "wbtc", address(wbtc));
    string memory output =
      vm.serializeAddress("deployments", "cpamm", address(cPAMM));

    vm.writeJson(output, "./deployments/addresses.json");
    vm.stopBroadcast();
  }
}
