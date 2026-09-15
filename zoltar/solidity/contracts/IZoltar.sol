// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.35;

import { ReputationToken } from './ReputationToken.sol';
import { IExternalGenesisReputationToken } from './IExternalGenesisReputationToken.sol';
import { ZoltarQuestionData } from './ZoltarQuestionData.sol';

/// @notice Public interface for questions, universe forks, and REP migration.
interface IZoltar {
	struct Universe {
		uint256 forkTime;
		uint256 forkQuestionId;
		uint256 forkingOutcomeIndex;
		ReputationToken reputationToken;
		uint248 parentUniverseId;
	}

	event UniverseForked(address indexed forker, uint248 indexed universeId, uint256 indexed questionId, uint256 forkTime, uint256 forkThresholdAttoRep, uint256 migrationRepBalanceAttoRep, uint256 universeTheoreticalSupplyAttoRep);
	event DeployChild(address deployer, uint248 indexed universeId, uint256 indexed outcomeIndex, uint248 indexed childUniverseId, ReputationToken childReputationToken, uint256 childUniverseTheoreticalSupplyAttoRep);
	event MigrationRepAdded(address indexed migrator, uint248 indexed universeId, uint256 amountAttoRep, uint256 migrationRepBalanceAttoRep, uint256 universeTheoreticalSupplyAttoRep);
	event MigrationRepSplit(address indexed migrator, address recipient, uint248 indexed universeId, uint256 outcomeIndex, uint248 indexed childUniverseId, uint256 amountAttoRep, uint256 childMigrationRepAmountAttoRep);
	event UniverseInitialized(uint248 indexed universeId, uint256 forkTime, uint256 forkQuestionId, uint256 forkingOutcomeIndex, ReputationToken reputationToken, uint248 indexed parentUniverseId, uint256 universeTheoreticalSupplyAttoRep);
	event RepBurned(address indexed burner, uint248 indexed universeId, uint256 amountAttoRep, uint256 universeTheoreticalSupplyAttoRep);
	event ChildReputationTokenInitialized(uint248 indexed universeId, ReputationToken indexed reputationToken, uint256 indexed repNumber);

	function universes(uint248 universeId) external view returns (uint256 forkTime, uint256 forkQuestionId, uint256 forkingOutcomeIndex, ReputationToken reputationToken, uint248 parentUniverseId);
	function childReputationTokenCount() external view returns (uint256);
	function forkThresholdDivisor() external view returns (uint256);
	function forkBurnDivisor() external view returns (uint256);
	function genesisReputationToken() external view returns (IExternalGenesisReputationToken);
	function zoltarQuestionData() external view returns (ZoltarQuestionData);

	function getForkTime(uint248 universeId) external view returns (uint256);

	function forkQuestionMatches(uint248 universeId, uint256 questionId) external view returns (bool);

	function getRepToken(uint248 universeId) external view returns (ReputationToken);

	function getForkThresholdAttoRep(uint248 universeId) external view returns (uint256);

	function getNonDecisionThresholdAttoRep(uint248 universeId) external view returns (uint256);

	function getUniverseTheoreticalSupplyAttoRep(uint248 universeId) external view returns (uint256);

	function forkUniverse(uint248 universeId, uint256 questionId) external;

	function burnRep(uint248 universeId, uint256 amountAttoRep) external;

	function getChildUniverseId(uint248 universeId, uint256 outcomeIndex) external pure returns (uint248);

	function deployChild(uint248 universeId, uint256 outcomeIndex) external;

	function getDeployedChildUniverses(uint248 universeId, uint256 startIndex, uint256 count)
		external
		view
		returns (uint256[] memory outcomeIndexes, uint248[] memory childUniverseIds, Universe[] memory childUniverses);

	function addRepToMigrationBalance(uint248 universeId, uint256 amountAttoRep) external;

	function splitMigrationRep(uint248 universeId, uint256 amountAttoRep, uint256[] memory outcomeIndexes) external;

	function prepareAndSplitMigrationRep(uint248 universeId, uint256 amountAttoRep, uint256[] memory outcomeIndexes, uint256 preparationAttoRep) external;

	function getChildMigrationRepAmountsAttoRep(address migrator, uint248 universeId, uint248[] calldata childUniverseIds) external view returns (uint256[] memory amountsAttoRep);

	function getMigrationRepBalanceAttoRep(address migrator, uint248 universeId) external view returns (uint256 migrationRepBalanceAttoRep);
}
