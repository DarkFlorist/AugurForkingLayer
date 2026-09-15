import { withReadTimeout } from '../lib/promise.js'
import { assertNetworkEnabled } from './networkAvailability.js'
import type { Address, EIP1193Provider } from '@zoltar/core-shared/evm/ethereum'
import { tryParseAddressInput } from '../forms/inputs.js'

type EthereumEventHandler = (...args: unknown[]) => void

type InjectedEthereumEventSource = {
	on?: (eventName: string, handler: EthereumEventHandler) => void
	removeListener?: (eventName: string, handler: EthereumEventHandler) => void
}

export type InjectedEthereum = EIP1193Provider & InjectedEthereumEventSource

export function normalizeInjectedAccount(value: unknown): Address | undefined {
	return typeof value === 'string' ? tryParseAddressInput(value) : undefined
}

const readOnlyRpcMethods = new Set([
	'eth_accounts',
	'eth_chainId',
	'eth_blockNumber',
	'eth_call',
	'eth_estimateGas',
	'eth_getBalance',
	'eth_getCode',
	'eth_getStorageAt',
	'eth_getBlockByNumber',
	'eth_getBlockByHash',
	'eth_getTransactionByHash',
	'eth_getTransactionReceipt',
	'eth_getTransactionCount',
	'eth_getLogs',
	'eth_gasPrice',
	'eth_maxPriorityFeePerGas',
	'eth_feeHistory',
	'net_version',
])

export function requestWalletRpc(provider: InjectedEthereum, parameters: Parameters<InjectedEthereum['request']>[0]) {
	const response = provider.request(parameters)
	return readOnlyRpcMethods.has(parameters.method) ? withReadTimeout(response) : response
}

export async function readInjectedAccounts(provider: InjectedEthereum, method: 'eth_accounts' | 'eth_requestAccounts' = 'eth_accounts') {
	const result = await requestWalletRpc(provider, { method, params: [] })
	if (!Array.isArray(result)) return []
	return result.map(normalizeInjectedAccount).filter((account): account is Address => account !== undefined)
}

export function parseInjectedChainId(result: unknown) {
	if (typeof result !== 'string' || !/^0x[0-9a-fA-F]+$/.test(result)) throw new Error('Wallet returned an invalid chain ID.')
	return result
}

export async function switchInjectedChain(provider: InjectedEthereum, chainId: string) {
	if (!/^0x[0-9a-fA-F]+$/.test(chainId)) throw new Error('Requested wallet chain ID is invalid')
	assertNetworkEnabled(chainId)
	await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] })
}

declare global {
	interface Window {
		ethereum?: InjectedEthereum
	}
}

export function getInjectedEthereum(): InjectedEthereum | undefined {
	if (typeof window === 'undefined') return undefined
	return window.ethereum
}
