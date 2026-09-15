import { resolve } from 'node:path'
import { repositoryRoot } from '../repo/root.mts'

const result = await Bun.build({
	entrypoints: [resolve(repositoryRoot, 'tooling/contracts/deploy-testnet.mts')],
	target: 'bun',
	plugins: [
		{
			name: 'ui-source',
			setup(build) {
				build.onResolve({ filter: /^@zoltar\/ui-/ }, async ({ path }) => {
					const packages = { '@zoltar/ui-core-shared/': 'coreShared', '@zoltar/ui-zoltar-shared/': 'zoltarShared' }
					for (const [prefix, directory] of Object.entries(packages)) {
						if (!path.startsWith(prefix)) continue
						const stem = resolve(repositoryRoot, 'ui', directory, 'ts', path.slice(prefix.length).replace(/\.js$/, ''))
						for (const extension of ['.ts', '.tsx']) if (await Bun.file(stem + extension).exists()) return { path: stem + extension }
					}
					throw new Error(`Unknown UI import: ${path}`)
				})
			},
		},
	],
})
if (!result.success) throw new Error(result.logs.map(log => log.message).join('\n'))
const artifact = result.outputs[0]
if (artifact === undefined) throw new Error('Deployment bundle was not generated')
const { mkdtemp, rm } = await import('node:fs/promises')
const { tmpdir } = await import('node:os')
const temporary = await mkdtemp(resolve(tmpdir(), 'zoltar-deploy-'))
try {
	const entrypoint = resolve(temporary, 'deploy.mjs')
	await Bun.write(entrypoint, artifact)
	const child = Bun.spawn([process.execPath, entrypoint, ...process.argv.slice(2)], { stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' })
	process.exitCode = await child.exited
} finally {
	await rm(temporary, { recursive: true, force: true })
}
