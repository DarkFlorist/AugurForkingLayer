import { withReadTimeout } from '../../lib/promise.js'
import type { Address } from '@zoltar/core-shared/evm/ethereum'
import { getErrorMessage, hasErrorCode, hasErrorMessage } from '../../lib/errors.js'
import type { AccountState } from '../../types/app.js'

type LoadWalletStateParameters = {
	chainIdPromise: Promise<string> | undefined
	connectedAddress: Address | undefined
	ethBalanceAttoEthPromise: Promise<bigint> | undefined
	fallbackChainId?: string
	getAccountState: () => AccountState
	isCurrent: () => boolean
	setAccountState: (state: AccountState) => void
	setEthBalanceErrorMessage?: (message: string | undefined) => void
	setErrorMessage: (message: string | undefined) => void
	trackLoad: <TResult>(work: () => Promise<TResult>) => Promise<TResult>
}

export async function loadWalletState({ chainIdPromise, connectedAddress, ethBalanceAttoEthPromise, fallbackChainId, getAccountState, isCurrent, setAccountState, setErrorMessage, setEthBalanceErrorMessage, trackLoad }: LoadWalletStateParameters) {
	if (connectedAddress === undefined || chainIdPromise === undefined || ethBalanceAttoEthPromise === undefined) return
	const resolvedFallbackChainId = fallbackChainId ?? '0x1'
	const ethBalanceAttoEthError = setEthBalanceErrorMessage ?? setErrorMessage

	void trackLoad(async () => {
		try {
			const chainId = await withReadTimeout(chainIdPromise)
			if (!isCurrent()) return
			setAccountState({ ...getAccountState(), chainId })
		} catch (error) {
			if (!hasErrorCode(error) && !hasErrorMessage(error)) throw error
			if (!isCurrent()) return
			setAccountState({ ...getAccountState(), chainId: resolvedFallbackChainId })
		}
	})

	void trackLoad(async () => {
		try {
			const ethBalanceAttoEth = await withReadTimeout(ethBalanceAttoEthPromise)
			if (!isCurrent()) return
			setAccountState({ ...getAccountState(), ethBalanceAttoEth })
		} catch (error) {
			if (!isCurrent()) return
			setAccountState({ ...getAccountState(), ethBalanceAttoEth: undefined })
			ethBalanceAttoEthError(getErrorMessage(error, setEthBalanceErrorMessage === undefined ? 'Failed to refresh wallet balances' : 'Failed to refresh ETH balance'))
		}
	})
}
