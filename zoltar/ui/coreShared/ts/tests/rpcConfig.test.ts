/// <reference types="bun-types" />

import { describe, expect, test } from 'bun:test'
import { resolveConfiguredRpcConfig } from '../wallet/rpcConfig.js'

describe('rpc config', () => {
	test('accepts https and local loopback http RPC overrides', () => {
		expect(
			resolveConfiguredRpcConfig({
				location: {
					search: '?rpcUrl=https://query.example/path',
				},
			}),
		).toEqual({ source: 'url', url: 'https://query.example/path' })

		expect(
			resolveConfiguredRpcConfig({
				location: {
					search: '?rpcUrl=http://localhost:8545',
				},
			}),
		).toEqual({ source: 'url', url: 'http://localhost:8545' })

		expect(
			resolveConfiguredRpcConfig({
				location: {
					search: '?rpcUrl=http://127.0.0.1:8545',
				},
			}),
		).toEqual({ source: 'url', url: 'http://127.0.0.1:8545' })

		expect(
			resolveConfiguredRpcConfig({
				location: {
					search: '?rpcUrl=http://127.0.0.2:8545',
				},
			}),
		).toEqual({ source: 'url', url: 'http://127.0.0.2:8545' })

		expect(
			resolveConfiguredRpcConfig({
				location: {
					search: '?rpcUrl=http://[::1]:8545',
				},
			}),
		).toEqual({ source: 'url', url: 'http://[::1]:8545' })
	})

	test('rejects remote http URL overrides and keeps the fallback RPC', () => {
		expect(
			resolveConfiguredRpcConfig({
				fallbackRpcUrl: 'https://fallback.example',
				location: {
					search: '?rpcUrl=http://query.example',
				},
				storage: {
					getItem: () => 'https://storage.example',
				},
			}),
		).toEqual({
			rejectedOverride: {
				reason: 'RPC URL must use https:// unless it points to local loopback.',
				source: 'url',
				url: 'http://query.example',
			},
			source: 'default',
			url: 'https://fallback.example',
		})
	})

	test('rejects invalid localStorage overrides and keeps the fallback RPC', () => {
		expect(
			resolveConfiguredRpcConfig({
				fallbackRpcUrl: 'https://fallback.example',
				location: {
					search: '',
				},
				storage: {
					getItem: () => 'not-a-url',
				},
			}),
		).toEqual({
			rejectedOverride: {
				reason: 'RPC URL must be an absolute https:// URL, or http:// for local loopback.',
				source: 'localStorage',
				url: 'not-a-url',
			},
			source: 'default',
			url: 'https://fallback.example',
		})
	})

	test('returns the source for configured RPC URLs', () => {
		expect(
			resolveConfiguredRpcConfig({
				location: {
					hash: '#/browse?rpcUrl=https://hash.example',
				},
			}),
		).toEqual({ source: 'url', url: 'https://hash.example' })

		expect(
			resolveConfiguredRpcConfig({
				location: {
					search: '',
				},
				storage: {
					getItem: () => 'https://storage.example',
				},
			}),
		).toEqual({ source: 'localStorage', url: 'https://storage.example' })
	})
})
