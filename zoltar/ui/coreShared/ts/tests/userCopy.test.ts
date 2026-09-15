/// <reference types='bun-types' />

import { describe, expect, test } from 'bun:test'
import { getMetricPlaceholderPresentation, getReportPresentation, getUniversePresentation, getWalletPresentation } from '../lib/userCopy.js'

void describe('user copy helpers', () => {
	void test('maps universe and report lookup states semantically', () => {
		expect(getUniversePresentation('missing')?.key).toBe('not_found')
		expect(getReportPresentation({ kind: 'question', state: 'unknown' })).toBeUndefined()
		expect(getReportPresentation({ kind: 'question', state: 'missing' })?.detail).toBe('No question matches this ID. Try another question ID.')
		expect(getReportPresentation({ kind: 'report', state: 'missing' })?.detail).toBe('No report matches this ID. Try another report ID.')
		expect(getReportPresentation({ kind: 'question', state: 'loading' })).toEqual({
			detail: 'retrieving…',
			detailIsLoading: true,
			key: 'loading',
		})
	})

	void test('maps wallet and placeholder states semantically', () => {
		expect(getWalletPresentation({ accountAddress: undefined, hasInjectedWallet: true, isOnActiveAppChain: true })?.key).toBe('wallet_disconnected')
		expect(getWalletPresentation({ accountAddress: '0x0000000000000000000000000000000000000001', hasInjectedWallet: true, isOnActiveAppChain: false })?.key).toBe('wrong_network')
		expect(getMetricPlaceholderPresentation(undefined)?.placeholder).toBe('—')
	})

	void test('keeps disconnected wallet guidance concise', () => {
		expect(getWalletPresentation({ accountAddress: undefined, hasWallet: false, isOnActiveAppChain: true })?.detail).toBe('Install or enable a wallet to continue.')
		expect(getWalletPresentation({ accountAddress: undefined, hasInjectedWallet: true, isOnActiveAppChain: true })?.detail).toBe('Connect wallet to continue.')
	})

	void test('covers metric placeholders and loading copy paths', () => {
		expect(getMetricPlaceholderPresentation(undefined, { loading: true })?.key).toBe('loading')
		expect(getMetricPlaceholderPresentation(undefined, { loading: true })).toEqual({
			badgeLabel: 'Loading',
			badgeTone: 'pending',
			key: 'loading',
			placeholder: 'Loading…',
		})
		expect(getMetricPlaceholderPresentation('value')).toBeUndefined()
		expect(getMetricPlaceholderPresentation(undefined)).toEqual({
			key: 'unavailable',
			placeholder: '—',
		})
	})

	void test('maps wallet branch states with non-increasing permission checks', () => {
		expect(getWalletPresentation({ accountAddress: undefined, hasWallet: false })?.key).toBe('wallet_disconnected')
		expect(getWalletPresentation({ accountAddress: '0x000000000000000000000000000000000000dEaD', hasInjectedWallet: true, isSupportedChain: false })?.key).toBe('wrong_network')
		expect(getWalletPresentation({ accountAddress: '0x000000000000000000000000000000000000dEaD', hasInjectedWallet: true, isSupportedChain: false, isOnActiveAppChain: true })?.detail).toBe('Switch to Sepolia.')
	})
})
