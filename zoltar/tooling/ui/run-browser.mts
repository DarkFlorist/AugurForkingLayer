import { resolve, sep } from 'node:path'
import { runBrowserSmoke } from './browserSmoke.mts'

const root = resolve(import.meta.dir, '../../ui/zoltar/dist')
const server = Bun.serve({
	hostname: '127.0.0.1',
	port: 0,
	async fetch(request) {
		const url = new URL(request.url)
		const filePath = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname))
		if (!filePath.startsWith(root + sep)) return new Response('Forbidden', { status: 403 })
		const file = Bun.file(filePath)
		return (await file.exists()) ? new Response(file) : new Response('Not found', { status: 404 })
	},
})
try {
	const baseUrl = `http://127.0.0.1:${server.port}`
	if (process.argv.includes('--workflow')) {
		const { runZoltarWorkflow } = await import('./zoltarWorkflow.mts')
		await runZoltarWorkflow(baseUrl)
	} else {
		const screenshots = process.argv.includes('--screenshots')
		for (const viewport of screenshots ? ['1440x1000', '390x1200'] : ['1440x900', '390x844']) {
			process.env['UI_VIEWPORT'] = viewport
			if (screenshots) process.env['UI_SCREENSHOT_PATH'] = resolve(import.meta.dir, '../../../docs/images', viewport.startsWith('1440x') ? 'zoltar-desktop.png' : 'zoltar-mobile.png')
			process.env['UI_SIMULATION_SCENARIO'] = screenshots ? 'two-questions' : 'deployed'
			if (screenshots) process.env['UI_BROWSER_READY_TEXT'] = 'Did the first proposal pass?'
			process.env['UI_BROWSER_ROUTE'] = '#/zoltar'
			await runBrowserSmoke('zoltar', baseUrl)
		}
	}
} finally {
	await server.stop(true)
}
