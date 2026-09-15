import { getAddress, isAddress, type Address } from '@zoltar/core-shared/evm/ethereum'
import { tryParseBigIntInput } from './integerInput.js'

export function tryParseAddressInput(value: string): Address | undefined {
	const trimmed = value.trim()
	if (trimmed === '' || !isAddress(trimmed)) return undefined
	return getAddress(trimmed)
}

function parseListInput<T>(value: string, label: string, parseItem: (entry: string, index: number) => T): T[] {
	const values = value
		.split(',')
		.map(entry => entry.trim())
		.filter(entry => entry !== '')
	if (values.length === 0) throw new Error(`${label} is required`)
	return values.map(parseItem)
}

function getListEntries(value: string) {
	return value
		.split(',')
		.map(entry => entry.trim())
		.filter(entry => entry !== '')
}

export function parseBigIntListInput(value: string, label: string) {
	return parseListInput(value, label, (entry, index) => {
		const parsed = tryParseBigIntInput(entry)
		if (parsed === undefined) throw new Error(`${label} #${index + 1} must be a whole number`)
		return parsed
	})
}

export function tryParseBigIntListInput(value: string) {
	const entries = getListEntries(value)
	if (entries.length === 0) return undefined
	const parsedEntries: bigint[] = []
	for (const entry of entries) {
		const parsed = tryParseBigIntInput(entry)
		if (parsed === undefined) return undefined
		parsedEntries.push(parsed)
	}
	return parsedEntries
}
