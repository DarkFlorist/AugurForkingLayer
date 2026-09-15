import { createDeferred } from '../testUtils/deferred.js'
/// <reference types="bun-types" />

import { zeroAddress } from '@zoltar/core-shared/evm/ethereum'
import { installDomTestLifecycle } from '../testUtils/domTestLifecycle.js'
import { describe, expect, test } from 'bun:test'
import { h } from 'preact'
import { act } from 'preact/test-utils'
import { loadWalletState } from '../../app/hooks/loadWalletState.js'
import type { UseOnchainStateDependencies } from '../../app/hooks/useOnchainState.js'
import { useOnchainState } from '../../app/hooks/useOnchainState.js'
import { installActiveEnvironmentForTesting, resetActiveEnvironmentForTesting } from '../../lib/activeEnvironment.js'
import { createLoadController } from '../../lib/loadState.js'
import type { AccountState } from '../../types/app.js'
import { createFakeBackend } from '../testUtils/fakeBackend.js'
import { fireEvent, within } from '../testUtils/queries'
import { renderIntoDocument } from '../testUtils/renderIntoDocument.js'

const fakeOnchainStateDependencies: UseOnchainStateDependencies = {
	getDeploymentSteps: () => [],
	loadDeploymentStatusOracleSnapshot: async () => ({ applicationDeploymentComplete: false, deploymentStatuses: [] }),
}

void describe('loadWalletState', () => {
	void test('resolves after scheduling wallet loads and applies updates as each load completes', async () => {
		const chainIdDeferred = createDeferred<string>()
		const ethBalanceAttoEthDeferred = createDeferred<bigint>()
		const scheduledLoads: Promise<unknown>[] = []
		let accountState: AccountState = {
			address: zeroAddress,
			chainId: undefined,
			ethBalanceAttoEth: undefined,
		}
		let errorMessage: string | undefined = undefined
		let resolved = false
		const loadPromise = loadWalletState({
			chainIdPromise: chainIdDeferred.promise,
			connectedAddress: zeroAddress,
			ethBalanceAttoEthPromise: ethBalanceAttoEthDeferred.promise,
			getAccountState: () => accountState,
			isCurrent: () => true,
			setAccountState: state => {
				accountState = state
			},
			setErrorMessage: message => {
				errorMessage = message
			},
			trackLoad: async work => {
				const scheduledLoad = work()
				scheduledLoads.push(scheduledLoad)
				return await scheduledLoad
			},
		}).then(() => {
			resolved = true
		})

		expect(resolved).toBe(false)
		await loadPromise
		expect(resolved).toBe(true)

		chainIdDeferred.resolve('0x1')
		await (scheduledLoads[0] ?? Promise.reject(new Error('Expected chain ID load promise')))
		expect(accountState.chainId).toBe('0x1')

		ethBalanceAttoEthDeferred.resolve(123n)
		await (scheduledLoads[1] ?? Promise.reject(new Error('Expected ETH balance load promise')))
		expect(accountState.ethBalanceAttoEth).toBe(123n)

		expect(errorMessage).toBe(undefined)
		expect(accountState.address).toBe(zeroAddress)
		expect(accountState.chainId).toBe('0x1')
		expect(accountState.ethBalanceAttoEth).toBe(123n)
	})

	void test('keeps tracked loading active until each scheduled wallet load settles', async () => {
		const chainIdDeferred = createDeferred<string>()
		const ethBalanceAttoEthDeferred = createDeferred<bigint>()
		const controller = createLoadController()
		const trackedLoads: Promise<unknown>[] = []
		let accountState: AccountState = {
			address: zeroAddress,
			chainId: undefined,
			ethBalanceAttoEth: undefined,
		}

		await loadWalletState({
			chainIdPromise: chainIdDeferred.promise,
			connectedAddress: zeroAddress,
			ethBalanceAttoEthPromise: ethBalanceAttoEthDeferred.promise,
			getAccountState: () => accountState,
			isCurrent: () => true,
			setAccountState: state => {
				accountState = state
			},
			setErrorMessage: () => undefined,
			trackLoad: async work => {
				const trackedLoad = controller.track(work)
				trackedLoads.push(trackedLoad)
				return await trackedLoad
			},
		})

		expect(controller.isLoading.value).toBe(true)

		chainIdDeferred.resolve('0x1')
		await (trackedLoads[0] ?? Promise.reject(new Error('Expected tracked chain ID load promise')))
		expect(controller.isLoading.value).toBe(true)

		ethBalanceAttoEthDeferred.resolve(123n)
		await (trackedLoads[1] ?? Promise.reject(new Error('Expected tracked ETH balance load promise')))
		expect(controller.isLoading.value).toBe(false)
		expect(accountState.chainId).toBe('0x1')
		expect(accountState.ethBalanceAttoEth).toBe(123n)
	})

	void test('does not mutate balances when no wallet is connected', async () => {
		let accountState: AccountState = {
			address: undefined,
			chainId: '0x1',
			ethBalanceAttoEth: 123n,
		}

		await loadWalletState({
			chainIdPromise: undefined,
			connectedAddress: undefined,
			ethBalanceAttoEthPromise: undefined,
			getAccountState: () => accountState,
			isCurrent: () => true,
			setAccountState: state => {
				accountState = state
			},
			setErrorMessage: () => undefined,
			trackLoad: async work => await work(),
		})

		expect(accountState.ethBalanceAttoEth).toBe(123n)
	})

	void test('skips state updates when refresh callbacks are stale', async () => {
		const chainIdDeferred = createDeferred<string>()
		const ethBalanceAttoEthDeferred = createDeferred<bigint>()
		const trackedLoads: Promise<unknown>[] = []
		let accountState: AccountState = {
			address: zeroAddress,
			chainId: '0xfeed',
			ethBalanceAttoEth: 123n,
		}
		let errorMessage: string | undefined = undefined
		let setAccountStateCalls = 0
		let isCurrentCalls = 0
		const isCurrent = () => {
			isCurrentCalls += 1
			return false
		}

		const loadPromise = loadWalletState({
			chainIdPromise: chainIdDeferred.promise,
			connectedAddress: zeroAddress,
			ethBalanceAttoEthPromise: ethBalanceAttoEthDeferred.promise,
			getAccountState: () => accountState,
			isCurrent,
			setAccountState: state => {
				setAccountStateCalls += 1
				accountState = state
			},
			setErrorMessage: message => {
				errorMessage = message
			},
			trackLoad: async work => {
				const trackedLoad = work()
				trackedLoads.push(trackedLoad)
				return await trackedLoad
			},
		})

		chainIdDeferred.resolve('0x123')
		ethBalanceAttoEthDeferred.resolve(111n)
		await Promise.all(trackedLoads)
		await loadPromise

		expect(isCurrentCalls).toBe(2)
		expect(setAccountStateCalls).toBe(0)
		expect(errorMessage).toBeUndefined()
		expect(accountState).toMatchObject({
			address: zeroAddress,
			chainId: '0xfeed',
			ethBalanceAttoEth: 123n,
		})
	})

	void test('skips error updates when wallet state callbacks are stale', async () => {
		const chainIdDeferred = createDeferred<string>()
		const ethBalanceAttoEthDeferred = createDeferred<bigint>()
		const trackedLoads: Promise<unknown>[] = []
		let accountState: AccountState = {
			address: zeroAddress,
			chainId: '0xfeed',
			ethBalanceAttoEth: 123n,
		}
		let errorMessage: string | undefined = undefined
		let isCurrentCalls = 0
		const isCurrent = () => {
			isCurrentCalls += 1
			return false
		}

		const loadPromise = loadWalletState({
			chainIdPromise: chainIdDeferred.promise,
			connectedAddress: zeroAddress,
			ethBalanceAttoEthPromise: ethBalanceAttoEthDeferred.promise,
			getAccountState: () => accountState,
			isCurrent,
			setAccountState: state => {
				accountState = state
			},
			setErrorMessage: message => {
				errorMessage = message
			},
			trackLoad: async work => {
				const trackedLoad = work()
				trackedLoads.push(trackedLoad)
				return await trackedLoad
			},
		})

		chainIdDeferred.resolve('0x123')
		ethBalanceAttoEthDeferred.reject(new Error('eth rpc failed'))

		await Promise.all(trackedLoads)
		await loadPromise

		expect(isCurrentCalls).toBe(2)
		expect(errorMessage).toBeUndefined()
		expect(accountState).toMatchObject({
			address: zeroAddress,
			chainId: '0xfeed',
			ethBalanceAttoEth: 123n,
		})
	})

	void test('uses fallback chain ID if chain-id refresh fails', async () => {
		const chainIdDeferred = createDeferred<string>()
		const ethBalanceAttoEthDeferred = createDeferred<bigint>()
		const trackedLoads: Promise<unknown>[] = []
		let accountState: AccountState = {
			address: zeroAddress,
			chainId: '0xfeed',
			ethBalanceAttoEth: undefined,
		}
		let errorMessage: string | undefined = undefined
		const loadPromise = loadWalletState({
			chainIdPromise: chainIdDeferred.promise,
			connectedAddress: zeroAddress,
			ethBalanceAttoEthPromise: ethBalanceAttoEthDeferred.promise,
			fallbackChainId: '0x123',
			getAccountState: () => accountState,
			isCurrent: () => true,
			setAccountState: state => {
				accountState = state
			},
			setErrorMessage: message => {
				errorMessage = message
			},
			trackLoad: async work => {
				const trackedLoad = work()
				trackedLoads.push(trackedLoad)
				return await trackedLoad
			},
		})

		chainIdDeferred.reject(new Error('chain id RPC failed'))
		await trackedLoads[0]
		ethBalanceAttoEthDeferred.resolve(500n)
		await Promise.all(trackedLoads.slice(1))

		await loadPromise

		expect(errorMessage).toBeUndefined()
		expect(accountState.chainId).toBe('0x123')
		expect(accountState.ethBalanceAttoEth).toBe(500n)
	})

	void test('rethrows unsupported chain-id refresh failures', async () => {
		const chainIdDeferred = createDeferred<string>()
		const ethBalanceAttoEthDeferred = createDeferred<bigint>()
		const trackedLoads: Promise<unknown>[] = []
		let accountState: AccountState = {
			address: zeroAddress,
			chainId: undefined,
			ethBalanceAttoEth: undefined,
		}

		await loadWalletState({
			chainIdPromise: chainIdDeferred.promise,
			connectedAddress: zeroAddress,
			ethBalanceAttoEthPromise: ethBalanceAttoEthDeferred.promise,
			getAccountState: () => accountState,
			isCurrent: () => true,
			setAccountState: state => {
				accountState = state
			},
			setErrorMessage: () => undefined,
			trackLoad: async work => {
				const trackedLoad = work().catch(error => error as never)
				trackedLoads.push(trackedLoad)
				return await trackedLoad
			},
		})

		chainIdDeferred.reject(7)
		expect(await (trackedLoads[0] ?? Promise.reject(new Error('Expected tracked chain ID load promise')))).toBe(7)

		ethBalanceAttoEthDeferred.resolve(500n)
		await (trackedLoads[1] ?? Promise.reject(new Error('Expected tracked ETH balance load promise')))

		expect(accountState.chainId).toBeUndefined()
		expect(accountState.ethBalanceAttoEth).toBe(500n)
	})

	void test('maps ETH balance load failures into refresh errors', async () => {
		const chainIdDeferred = createDeferred<string>()
		const ethBalanceAttoEthDeferred = createDeferred<bigint>()
		const trackedLoads: Promise<unknown>[] = []
		let accountState: AccountState = {
			address: zeroAddress,
			chainId: undefined,
			ethBalanceAttoEth: undefined,
		}
		let errorMessage: string | undefined = undefined
		const loadPromise = loadWalletState({
			chainIdPromise: chainIdDeferred.promise,
			connectedAddress: zeroAddress,
			ethBalanceAttoEthPromise: ethBalanceAttoEthDeferred.promise,
			getAccountState: () => accountState,
			isCurrent: () => true,
			setAccountState: state => {
				accountState = state
			},
			setErrorMessage: message => {
				errorMessage = message
			},
			trackLoad: async work => {
				const trackedLoad = work()
				trackedLoads.push(trackedLoad)
				return await trackedLoad
			},
		})

		chainIdDeferred.resolve('0x123')
		await trackedLoads[0]
		ethBalanceAttoEthDeferred.reject(new Error('eth rpc failed'))
		await trackedLoads[1]

		await loadPromise

		expect(errorMessage ?? '').toBe('Failed to refresh wallet balances. Reason: eth rpc failed')
		expect(accountState.chainId).toBe('0x123')
		expect(accountState.ethBalanceAttoEth).toBeUndefined()
	})
})

void describe('useOnchainState', () => {
	let cleanupRenderedComponent: (() => Promise<void>) | undefined

	function OnchainStateHarness() {
		const { connectWallet, errorMessage } = useOnchainState({}, fakeOnchainStateDependencies)

		return h('div', {}, [
			h(
				'button',
				{
					onClick: () => {
						void connectWallet()
					},
					type: 'button',
				},
				'Connect wallet',
			),
			h('output', { 'aria-label': 'Error message' }, errorMessage ?? ''),
		])
	}

	installDomTestLifecycle({
		afterTest: async () => {
			await cleanupRenderedComponent?.()
			cleanupRenderedComponent = undefined
			resetActiveEnvironmentForTesting()
		},
	})

	void test('surfaces an explicit error when connect wallet is clicked without a wallet installed', async () => {
		installActiveEnvironmentForTesting({
			...createFakeBackend({ hasWallet: false }),
			isBootstrapped: false,
		})

		const renderedComponent = await renderIntoDocument(h(OnchainStateHarness, {}))
		cleanupRenderedComponent = renderedComponent.cleanup

		const documentQueries = within(document.body)
		const connectButton = documentQueries.getByRole('button', { name: 'Connect wallet' })

		await act(() => {
			fireEvent.click(connectButton)
		})

		expect(documentQueries.getByLabelText('Error message').textContent).toBe('No wallet detected. Install or enable a wallet to continue.')
	})
})
