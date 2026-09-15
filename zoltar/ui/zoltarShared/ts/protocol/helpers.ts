import { encodeAbiParameters, getAddress, keccak256, type Address } from '@zoltar/core-shared/evm/ethereum'
import type { MarketType, QuestionData } from '@zoltar/ui-core-shared/types/contracts.js'

export type UniverseTuple = readonly [bigint, bigint, bigint, Address, bigint]
type DeployedChildUniverseTuple = {
	forkQuestionId: bigint
	forkTime: bigint
	forkingOutcomeIndex: bigint
	parentUniverseId: bigint
	reputationToken: Address
}

export function bigintToAddress(value: bigint): Address {
	return getAddress(`0x${value.toString(16).padStart(40, '0')}`)
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

export function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every(item => typeof item === 'string')
}

export function getProtocolPageOffset(pageIndex: number, pageSize: number) {
	if (!Number.isSafeInteger(pageIndex) || pageIndex < 0) throw new Error('Page index must be a non-negative integer within the safe range')
	if (!Number.isSafeInteger(pageSize) || pageSize <= 0) throw new Error('Page size must be a positive integer within the safe range')
	return BigInt(pageIndex) * BigInt(pageSize)
}

function isUniverseTuple(value: unknown): value is UniverseTuple {
	return Array.isArray(value) && value.length === 5 && typeof value[0] === 'bigint' && typeof value[1] === 'bigint' && typeof value[2] === 'bigint' && typeof value[3] === 'string' && typeof value[4] === 'bigint'
}

export function requireUniverseTupleArray(value: unknown, context: string): UniverseTuple[] {
	if (Array.isArray(value) && value.every(isUniverseTuple)) return value
	throw new Error(`Unexpected ${context} response`)
}

function isDeployedChildUniverseTuple(value: unknown): value is DeployedChildUniverseTuple {
	return isObjectRecord(value) && typeof value['forkQuestionId'] === 'bigint' && typeof value['forkTime'] === 'bigint' && typeof value['forkingOutcomeIndex'] === 'bigint' && typeof value['parentUniverseId'] === 'bigint' && typeof value['reputationToken'] === 'string'
}

export function requireDeployedChildUniverseTupleArray(value: unknown, context: string): DeployedChildUniverseTuple[] {
	if (Array.isArray(value) && value.every(isDeployedChildUniverseTuple)) return value
	throw new Error(`Unexpected ${context} response`)
}

export function getQuestionId(questionData: QuestionData, outcomeOptions: readonly string[]) {
	return BigInt(
		keccak256(
			encodeAbiParameters(
				[
					{
						type: 'tuple',
						components: [
							{ name: 'title', type: 'string' },
							{ name: 'description', type: 'string' },
							{ name: 'startTime', type: 'uint256' },
							{ name: 'endTime', type: 'uint256' },
							{ name: 'numTicks', type: 'uint120' },
							{ name: 'displayValueMin', type: 'int256' },
							{ name: 'displayValueMax', type: 'int256' },
							{ name: 'answerUnit', type: 'string' },
						],
					},
					{ type: 'string[]' },
				],
				[questionData, outcomeOptions],
			),
		),
	)
}

export function getQuestionIdHex(questionId: bigint) {
	return `0x${questionId.toString(16)}`
}

export function getMarketType(questionData: QuestionData, outcomeLabels: string[]): MarketType {
	if (outcomeLabels.length === 0 && questionData.numTicks > 0n) return 'scalar'
	if (outcomeLabels.length === 2 && outcomeLabels[0] === 'Yes' && outcomeLabels[1] === 'No') return 'binary'
	return 'categorical'
}
