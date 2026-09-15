// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.35;

contract RejectingETHReceiver {
	bool public rejectETH = true;
	bool public consumeAllGas;
	bool public reenterOnReceive;
	address public receiveReentryTarget;
	bytes public receiveReentryData;

	function setRejectETH(bool shouldReject) external {
		rejectETH = shouldReject;
	}

	function setConsumeAllGas(bool shouldConsume) external {
		consumeAllGas = shouldConsume;
	}

	function setReceiveReentry(address target, bytes calldata data) external {
		receiveReentryTarget = target;
		receiveReentryData = data;
		reenterOnReceive = true;
	}

	function execute(address target, bytes calldata data) external payable returns (bytes memory result) {
		(bool success, bytes memory returnData) = target.call{value: msg.value}(data);
		if (!success) {
			assembly {
				revert(add(returnData, 32), mload(returnData))
			}
		}
		return returnData;
	}

	receive() external payable {
		if (reenterOnReceive) {
			reenterOnReceive = false;
			(bool success, bytes memory returnData) = receiveReentryTarget.call(receiveReentryData);
			if (!success) {
				assembly {
					revert(add(returnData, 32), mload(returnData))
				}
			}
			return;
		}
		if (consumeAllGas) {
			assembly {
				invalid()
			}
		}
		require(!rejectETH, 'Test receiver rejects ETH');
	}
}
