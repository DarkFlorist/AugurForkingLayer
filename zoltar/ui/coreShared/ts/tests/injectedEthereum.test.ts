import { describe, expect, test } from 'bun:test'
import { switchInjectedChain, type InjectedEthereum } from '../wallet/injectedEthereum.js'

test('rejects a mainnet switch before requesting the wallet and permits Sepolia', async () => {
	const calls: unknown[] = []
	const provider: InjectedEthereum = {
		request: async parameters => {
			calls.push(parameters)
			return undefined
		},
	}
	await expect(switchInjectedChain(provider, '0x01')).rejects.toThrow('Ethereum mainnet is disabled.')
	expect(calls).toEqual([])
	await switchInjectedChain(provider, '0xaa36a7')
	expect(calls).toEqual([{ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] }])
})

describe('injected wallet context events', () => {})
