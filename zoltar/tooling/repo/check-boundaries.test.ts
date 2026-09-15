import { expect, test } from 'bun:test'
import { checkImportBoundary } from './check-boundaries.mts'

test('rejects sibling and excluded-product imports while allowing local packages', () => {
	expect(checkImportBoundary('/repo/zoltar/ui/app.ts', '../../other/app', '/repo/zoltar')).toContain('escapes')
	expect(checkImportBoundary('/repo/zoltar/ui/app.ts', '@zoltar/statoblast-shared/math', '/repo/zoltar')).toContain('excluded')
	expect(checkImportBoundary('/repo/zoltar/ui/app.ts', '@zoltar/ui-trading/x', '/repo/zoltar')).toContain('excluded')
	expect(checkImportBoundary('/repo/zoltar/solidity/contracts/Zoltar.sol', './test/Mock.sol', '/repo/zoltar')).toContain('production contract')
	expect(checkImportBoundary('/repo/zoltar/ui/app.ts', '../shared/math', '/repo/zoltar')).toBeUndefined()
	expect(checkImportBoundary('/repo/zoltar/ui/app.ts', '@zoltar/zoltar-shared/math', '/repo/zoltar')).toBeUndefined()
})
