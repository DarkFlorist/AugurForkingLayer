import { WORKER_BANNER } from './workerBanner.mts'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as process from 'node:process'
import { normalizeBundlerPath, resolveBundlerSpecifierPath } from './bundlerPaths.mts'
import { parseUiAppIdFromProcess, getUiAppPaths, type UiAppPaths } from './appPaths.mts'
import { createTevmBufferImportPlugin } from './tevmBufferImport.mts'

const appId = parseUiAppIdFromProcess('the production build')
const paths = getUiAppPaths(appId)

// Bun records source paths relative to the current working directory in bundle
// comments and source maps. Normalize it so root and package scripts produce
// byte-identical deployable artifacts.
process.chdir(paths.appRoot)

const APP_TITLES: Record<string, string> = {
	zoltar: 'Zoltar',
}

function createBrowserVendorAliasPlugin() {
	const aliasEntries: Array<[RegExp, string]> = [
		[/^pino$/, resolveBundlerSpecifierPath('pino/browser.js')],
		[/^@tevm\/memory-client$/, resolveBundlerSpecifierPath('@tevm/memory-client')],
		[/^@tevm\/common$/, resolveBundlerSpecifierPath('@tevm/common')],
	]
	type BrowserVendorBuild = {
		onResolve(options: { filter: RegExp }, callback: (args: { path: string }) => { path: string }): void
	}

	return {
		name: 'browser-vendor-alias',
		setup(build: BrowserVendorBuild) {
			for (const [filter, resolvedPath] of aliasEntries) {
				build.onResolve({ filter }, () => ({ path: resolvedPath }))
			}
		},
	}
}

async function copyStaticAsset(sourcePath: string, destinationPath: string) {
	await fs.mkdir(path.dirname(destinationPath), { recursive: true })
	const sourceFile = Bun.file(sourcePath)
	if (!(await sourceFile.exists())) {
		throw new Error(`Missing static asset: ${sourcePath}`)
	}
	await Bun.write(destinationPath, await sourceFile.arrayBuffer())
}

function assertBuildSucceeded(label: string, result: { success: boolean; logs: Array<unknown> }) {
	if (result.success) return
	const messages = result.logs.map(log => (typeof log === 'object' && log !== null && 'message' in log ? String(log.message) : String(log))).join('\n')
	throw new Error(`${label} failed for ${appId}\n${messages}`)
}

async function writeProductionIndexHtml(paths: UiAppPaths) {
	const templatePath = path.join(import.meta.dir, 'index.production.html')
	let html = await fs.readFile(templatePath, 'utf8')
	const appTitle = APP_TITLES[appId]
	if (appTitle === undefined) throw new Error(`No production title recorded for ${appId}`)
	html = html.replace('<html lang="en">', `<html lang="en" data-product="${appId}">`)
	html = html.replace('Zoltar', appTitle)
	await fs.mkdir(paths.appDistRoot, { recursive: true })
	await fs.writeFile(path.join(paths.appDistRoot, 'index.html'), html)
}

async function buildProductionApp(paths: UiAppPaths) {
	const result = await Bun.build({
		entrypoints: [normalizeBundlerPath(paths.appEntrypoint)],
		naming: {
			entry: 'app.js',
			chunk: 'chunks/[name]-[hash].js',
		},
		outdir: paths.appDistAssetsRoot,
		plugins: [createBrowserVendorAliasPlugin()],
		target: 'browser',
		sourcemap: 'linked',
	})
	assertBuildSucceeded('Production application bundle', result)
}

async function buildProductionWorker(paths: UiAppPaths) {
	const result = await Bun.build({
		banner: WORKER_BANNER,
		entrypoints: [normalizeBundlerPath(paths.workerEntrypoint)],
		naming: { entry: 'tevmWorker.worker.js' },
		outdir: paths.appDistAssetsRoot,
		plugins: [createBrowserVendorAliasPlugin(), createTevmBufferImportPlugin()],
		target: 'browser',
		sourcemap: 'linked',
	})
	assertBuildSucceeded('Production worker bundle', result)
}

export async function buildProductionBundle() {
	await fs.rm(paths.appDistRoot, { recursive: true, force: true })
	await fs.mkdir(paths.appDistAssetsRoot, { recursive: true })

	await Promise.all([
		buildProductionApp(paths),
		buildProductionWorker(paths),
		writeProductionIndexHtml(paths),
		copyStaticAsset(path.join(paths.coreSharedCssRoot, 'index.css'), path.join(paths.appDistRoot, 'css', 'index.css')),
		copyStaticAsset(path.join(paths.coreSharedCssRoot, 'tokens.css'), path.join(paths.appDistRoot, 'css', 'tokens.css')),
		...['base.css', 'protocol-surfaces.css', 'application-surfaces.css', 'controls-and-responsive.css', 'visual-foundation.css', 'protocol-apps.css'].map(stylesheet => copyStaticAsset(path.join(paths.coreSharedCssRoot, stylesheet), path.join(paths.appDistRoot, 'css', stylesheet))),
		copyStaticAsset(paths.faviconSvg, path.join(paths.appDistRoot, 'favicon.svg')),
	])
}

buildProductionBundle().catch(error => {
	console.error(error)
	process.exit(1)
})
