import type { Address, Hash } from '@zoltar/core-shared/evm/ethereum'
import type { ReputationTokenMetadata } from './reputation.js'
import type { WriteClient as ClientsWriteClient } from '../wallet/clients.js'
export type { ReadClient, WriteClient } from '../wallet/clients.js'

type ZoltarDeploymentStepId = 'proxyDeployer' | 'deploymentStatusOracle' | 'weth' | 'reputationToken' | 'multicall3' | 'zoltarQuestionData' | 'zoltar'

export type DeploymentStepId = ZoltarDeploymentStepId | 'securityPoolForker' | 'securityPoolOperationsDelegate' | 'escalationGameClaimDelegate' | 'escalationGameFactory' | 'securityPoolFactory'
export type QuestionType = 'binary' | 'categorical' | 'scalar'

export type QuestionData = {
	title: string
	description: string
	startTime: bigint
	endTime: bigint
	numTicks: bigint
	displayValueMin: bigint
	displayValueMax: bigint
	answerUnit: string
}

export type ZoltarChildUniverseSummary = {
	exists: boolean
	forkTime: bigint
	outcomeIndex: bigint
	outcomeLabel: string
	parentUniverseId: bigint
	reputationToken: Address
	universeId: bigint
} & ReputationTokenMetadata

export type ZoltarUniverseSummary = {
	childUniverses: ZoltarChildUniverseSummary[]
	forkBurnDivisor?: bigint
	forkThresholdAttoRep: bigint
	forkQuestionDetails: QuestionDetails | undefined
	forkTime: bigint
	forkingOutcomeIndex: bigint
	hasForked: boolean
	parentUniverseId: bigint
	reputationToken: Address
	totalTheoreticalSupplyAttoRep: bigint
	universeId: bigint
	zoltarAddress?: Address
} & ReputationTokenMetadata

export type DeploymentStep = {
	id: DeploymentStepId
	label: string
	address: Address
	dependencies: DeploymentStepId[]
	deploy: (client: ClientsWriteClient) => Promise<Hash>
	expectedRuntimeCodeHash?: Hash
	trustedSimulationCodePresence?: true
}

export type DeploymentStatus = DeploymentStep & {
	deployed: boolean
}

export type DeploymentStatusSnapshot = {
	applicationDeploymentComplete: boolean
	deploymentStatuses: DeploymentStatus[]
}

type ActionResult = { hash: Hash }

export type QuestionCreationResult = {
	questionId: string
	createQuestionHash: Hash
	questionType: QuestionType
}

export type ZoltarForkActionResult = ActionResult & {
	action: 'approveForkRep' | 'forkZoltar'
	questionId: string
	universeId: bigint
}

export type ZoltarChildUniverseActionResult = ActionResult & {
	action: 'createChildUniverse'
	outcomeIndex: bigint
	universeId: bigint
}

export type ZoltarMigrationActionResult = ActionResult & {
	action: 'addRepToMigrationBalance' | 'splitMigrationRep'
	amountAttoRep: bigint
	outcomeIndexes: bigint[]
	universeId: bigint
}

export type QuestionDetails = QuestionData & {
	createdAt: bigint
	exists: boolean
	questionType: QuestionType
	outcomeLabels: string[]
	questionId: string
}

export type QuestionDetailsPage = {
	pageIndex: number
	pageSize: number
	questionCount: bigint
	questions: QuestionDetails[]
}
