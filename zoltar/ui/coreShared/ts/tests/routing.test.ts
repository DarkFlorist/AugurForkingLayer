/// <reference types="bun-types" />

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { buildRouteHref, createRouting, ensureRouteHash, getCurrentRoute, getCurrentRouteHash, getRouteHash, getRouteHashSearch, getTopLevelRouteSearch, installRouting, parseRouteHash } from '../navigation/routing.js'
import { installDomEnvironment } from './testUtils/domEnvironment.js'
import { installTestRouting } from './testUtils/testRouting.js'

const DEPLOY_ROUTE = '#/deploy'
const EXAMPLE_ROUTE = '#/example'
const SECURITY_POOLS_ROUTE = '#/security-pools'
const ZOLTAR_ROUTE = '#/zoltar'

describe('routing', () => {
	let cleanup: (() => void) | undefined

	beforeEach(() => {
		installTestRouting()
		cleanup = installDomEnvironment('http://localhost/#/zoltar?zoltarView=create&simulate=1').cleanup
	})

	afterEach(() => {
		cleanup?.()
		cleanup = undefined
	})

	test('reads route and route-backed params from the hash fragment', () => {
		expect(getCurrentRoute()).toBe('zoltar')
		expect(getCurrentRouteHash()).toBe(ZOLTAR_ROUTE)
		expect(getRouteHashSearch()).toBe('?zoltarView=create&simulate=1')
		expect(buildRouteHref(ZOLTAR_ROUTE, '?zoltarView=questions')).toBe('#/zoltar?zoltarView=questions')
	})

	test('resolves route defaults and unknown routes', () => {
		window.location.hash = ''
		expect(getCurrentRoute()).toBe('zoltar')
		expect(getCurrentRouteHash()).toBe(ZOLTAR_ROUTE)
		expect(getRouteHashSearch('')).toBe('')

		window.location.hash = '#/does-not-exist?simulate=1'
		expect(getCurrentRoute()).toBe('not-found')
	})

	test('resolves parameterized routes with a configured matcher', () => {
		installRouting({
			defaultRoute: 'questions',
			routes: [
				{ hash: '#/questions', name: 'questions' },
				{
					match: routeHash => {
						const match = /^#\/question\/(\d+)$/.exec(routeHash)
						return match === null ? undefined : `question/${match[1]}`
					},
				},
			],
		})
		window.location.hash = '#/question/42'

		expect(getCurrentRoute()).toBe('question/42')
		window.location.hash = '#/question'
		expect(getCurrentRoute()).toBe('not-found')
	})

	test('normalizes route hashes and resolves configured aliases through a typed router', () => {
		const routing = createRouting({
			defaultRoute: 'questions',
			routes: [
				{ aliases: ['#/developer'], hash: '#/questions', name: 'questions' },
				{ hash: '#/portfolio', name: 'portfolio' },
			] as const,
		})
		expect(parseRouteHash('#/questions?simulate=1')).toEqual({ routeHash: '#/questions', search: '?simulate=1' })
		expect(routing.resolve('questions?simulate=1')).toBe('questions')
		expect(routing.resolve('#/developer?simulate=1')).toBe('questions')
		expect(routing.getHash('portfolio')).toBe('#/portfolio')
	})

	test('ensureRouteHash seeds default hash when blank', () => {
		window.location.hash = ''
		ensureRouteHash()
		expect(window.location.hash).toBe(ZOLTAR_ROUTE)
	})

	test('resolves known and non-query route hash helpers', () => {
		expect(getCurrentRouteHash()).toBe(ZOLTAR_ROUTE)
		window.location.hash = SECURITY_POOLS_ROUTE
		expect(getCurrentRoute()).toBe('security-pools')
		expect(getCurrentRouteHash()).toBe(SECURITY_POOLS_ROUTE)
		expect(getRouteHashSearch()).toBe('')
	})

	test('returns canonical route hashes for known routes', () => {
		expect(DEPLOY_ROUTE).toBe('#/deploy')
		expect(EXAMPLE_ROUTE).toBe('#/example')
		expect(getRouteHash('deploy')).toBe(DEPLOY_ROUTE)
		expect(getRouteHash('security-pools')).toBe(SECURITY_POOLS_ROUTE)
		expect(getRouteHash('example')).toBe(EXAMPLE_ROUTE)
		expect(getRouteHash('zoltar')).toBe(ZOLTAR_ROUTE)
	})

	test('preserves custom RPC configuration across top-level routes', () => {
		expect(getTopLevelRouteSearch('deploy', '?rpcUrl=https%3A%2F%2Frpc.example&zoltarView=create')).toBe('?rpcUrl=https%3A%2F%2Frpc.example')
	})
})
