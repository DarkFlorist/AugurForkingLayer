import { installRouting, resetRoutingForTesting } from '../../navigation/routing.js'

const DEFAULT_TEST_ROUTES = [
	{ hash: '#/deploy', name: 'deploy' },
	{ hash: '#/zoltar', name: 'zoltar' },
	{ hash: '#/security-pools', name: 'security-pools', queryParameters: new Set(['questionId', 'securityPool', 'securityPoolAddress', 'securityPoolQuestionId', 'securityPoolsView', 'selectedPoolView']) },
	{ hash: '#/example', name: 'example', queryParameters: new Set(['exampleItemId', 'exampleView']) },
] as const

export function installTestRouting() {
	installRouting({ defaultRoute: 'zoltar', routes: DEFAULT_TEST_ROUTES })
	return () => resetRoutingForTesting()
}
