import { expect, test } from 'bun:test'
import { IZoltar_IZoltar, Zoltar_Zoltar } from '../../solidity/ts/types/contractArtifact'

// Parameter names and Solidity-only type labels do not affect the external ABI.
function externalAbi(value: unknown, depth = 0): unknown {
	if (Array.isArray(value)) return value.map(item => externalAbi(item, depth + 1))
	if (typeof value !== 'object' || value === null) return value
	return Object.fromEntries(
		Object.entries(value)
			.filter(([key]) => key !== 'internalType' && !(depth > 0 && key === 'name'))
			.map(([key, item]) => [key, externalAbi(item, depth + 1)]),
	)
}

test('IZoltar covers every public function, getter, and event of Zoltar', () => {
	const implementation = Zoltar_Zoltar.abi.filter(entry => entry.type !== 'constructor').map(entry => externalAbi(entry))
	expect(IZoltar_IZoltar.abi.map(entry => externalAbi(entry))).toEqual(implementation)
})
