/// <reference types="bun-types" />

import { describe, expect, test } from 'bun:test'
import { getAddress, zeroAddress } from '@zoltar/core-shared/evm/ethereum'
import { getGenesisReputationTokenAddress } from '@zoltar/ui-zoltar-shared/protocol/activeProtocolAddresses.js'
import { bigintToAddress, getQuestionType, getProtocolPageOffset, getQuestionId, getQuestionIdHex, isStringArray, requireUniverseTupleArray } from '@zoltar/ui-zoltar-shared/protocol/helpers.js'

const questionData = {
	title: 'Test question',
	description: 'Deterministic test question',
	startTime: 1n,
	endTime: 2n,
	numTicks: 0n,
	displayValueMin: 0n,
	displayValueMax: 10n,
	answerUnit: '',
}

describe('contracts helpers', () => {
	test('bigintToAddress pads and normalizes address values', () => {
		expect(bigintToAddress(0n)).toBe(zeroAddress)
		expect(bigintToAddress(1n)).toBe(getAddress('0x0000000000000000000000000000000000000001'))
	})

	test('array type guards cover positives and negatives', () => {
		expect(isStringArray(['Yes', 'No'])).toBe(true)
		expect(isStringArray([1, 2, 3] as unknown[])).toBe(false)
	})

	test('protocol pagination preserves exact offsets and rejects unsafe numeric inputs', () => {
		expect(getProtocolPageOffset(Number.MAX_SAFE_INTEGER, 3)).toBe(BigInt(Number.MAX_SAFE_INTEGER) * 3n)
		expect(() => getProtocolPageOffset(Number.MAX_SAFE_INTEGER + 1, 1)).toThrow('Page index must be a non-negative integer within the safe range')
		expect(() => getProtocolPageOffset(0, Number.MAX_SAFE_INTEGER + 1)).toThrow('Page size must be a positive integer within the safe range')
	})

	test('tuple validators require exact tuple structure and throw with unexpected responses', () => {
		const validUniverseSummary: Array<[bigint, bigint, bigint, `0x${string}`, bigint]> = [[1n, 2n, 3n, getAddress('0x00000000000000000000000000000000000000a1'), 4n]]
		expect(requireUniverseTupleArray(validUniverseSummary, 'universe summary')).toEqual(validUniverseSummary)
		expect(() => requireUniverseTupleArray([[1n, 2n, 3n, getAddress('0x00000000000000000000000000000000000000b2'), 4n, 5n] as never], 'universe summary')).toThrow('Unexpected universe summary response')
	})

	test('question id helpers are deterministic and convert values consistently', () => {
		const outcomes = ['Yes', 'No']
		const idA = getQuestionId(questionData, outcomes)
		const idB = getQuestionId(questionData, outcomes)
		const idDifferent = getQuestionId({ ...questionData, answerUnit: 'USD' }, outcomes)

		expect(idA).toBe(idB)
		expect(idDifferent).not.toBe(idA)
		expect(getQuestionIdHex(idA)).toBe(`0x${idA.toString(16)}`)
	})

	test('question utilities cover binary and categorical paths', () => {
		expect(getQuestionType({ ...questionData, numTicks: 100n }, [])).toBe('scalar')
		expect(getQuestionType(questionData, ['Yes', 'No'])).toBe('binary')
		expect(getQuestionType(questionData, ['A', 'B', 'C'])).toBe('categorical')
	})

	test('getGenesisReputationTokenAddress is wired through helper defaults', () => {
		expect(getGenesisReputationTokenAddress).toBeInstanceOf(Function)
		const parsed = getGenesisReputationTokenAddress()
		expect(parsed.startsWith('0x')).toBe(true)
		expect(parsed.length).toBe(42)
	})
})
