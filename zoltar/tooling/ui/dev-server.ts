import * as http from 'node:http'
import * as filesystem from 'node:fs/promises'
import * as path from 'node:path'
import { getUiAppPaths, parseUiAppIdFromProcess, type UiAppId } from './appPaths.mts'

const appId = parseUiAppIdFromProcess('the development server')
const { appRoot: uiRootDirectory, repositoryRoot: repositoryRootDirectory } = getUiAppPaths(appId)
const liveReloadClients = new Set<http.ServerResponse>()

const getServedFilePaths = (requestPath: string) => {
	const urlPath = requestPath.endsWith('/') ? `${requestPath}index.html` : requestPath
	const relativeFilePath = decodeURI(urlPath).replace(/^\/+/, '')
	const candidateRoots = relativeFilePath.startsWith('shared/') ? [repositoryRootDirectory] : [uiRootDirectory, repositoryRootDirectory]

	const candidateFilePaths: string[] = []
	for (const candidateRoot of candidateRoots) {
		const candidateFilePath = path.resolve(candidateRoot, relativeFilePath)
		if (candidateFilePath !== candidateRoot && !candidateFilePath.startsWith(`${candidateRoot}${path.sep}`)) {
			continue
		}
		candidateFilePaths.push(candidateFilePath)
	}

	return candidateFilePaths
}

const sendLiveReloadEvent = (reason: string) => {
	for (const client of liveReloadClients) {
		try {
			client.write(`event: reload\ndata: ${JSON.stringify({ reason })}\n\n`)
		} catch (error) {
			if (!(error instanceof Error && 'code' in error && (error.code === 'ECONNRESET' || error.code === 'EPIPE' || error.code === 'ERR_STREAM_DESTROYED' || error.code === 'ERR_INVALID_STATE'))) throw error
			liveReloadClients.delete(client)
		}
	}
}

const server = http.createServer()
server.on('request', async (request, response) => {
	try {
		const requestUrl = new URL(request.url === undefined ? '/' : request.url, 'http://localhost')
		const requestPath = requestUrl.pathname
		if (requestPath === '/__live-reload') {
			if (request.method === 'GET') {
				response.writeHead(200, {
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
					'Content-Type': 'text/event-stream',
					'X-Accel-Buffering': 'no',
				})
				response.write('retry: 1000\n\n')
				liveReloadClients.add(response)
				request.on('close', () => {
					liveReloadClients.delete(response)
				})
				return
			}
			if (request.method === 'POST') {
				sendLiveReloadEvent(requestUrl.searchParams.get('reason') ?? 'ui update')
				response.writeHead(204)
				response.end()
				return
			}
			response.writeHead(405)
			response.end()
			return
		}
		const candidateFilePaths = getServedFilePaths(requestPath)
		if (candidateFilePaths.length === 0) {
			response.writeHead(403)
			response.end()
			return
		}

		let filePath: string | undefined
		let fileContents: Buffer | undefined
		let lastError: NodeJS.ErrnoException | undefined
		for (const candidateFilePath of candidateFilePaths) {
			try {
				fileContents = await filesystem.readFile(candidateFilePath)
				filePath = candidateFilePath
				break
			} catch (error) {
				if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error
				lastError = error as NodeJS.ErrnoException
			}
		}
		if (filePath === undefined || fileContents === undefined) throw lastError

		const extension = filePath.split('.').pop()
		const mimeType = extension === undefined ? 'text/plain' : mimeTypes[extension]
		if (mimeType !== undefined) {
			response.writeHead(200, { 'Content-Type': mimeType })
		}
		response.write(fileContents)
		response.end()
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			console.log(`404: ${request.url}`)
			response.writeHead(404)
			response.end()
		} else {
			const errorMessage = error instanceof Error ? error.message : String(error)
			console.log(`500: ${request.url}\n${errorMessage}`)
			response.writeHead(500)
			response.end()
		}
	}
})

// Initiate the server on `port` and print a message
const ports: Record<UiAppId, number> = { zoltar: 4153 }
const port = ports[appId]
// Repository files and live reload are intended only for local development.
server.listen(port, '127.0.0.1')
server.on('listening', () => {
	const address = server.address()
	if (address === null) throw new Error('Server address unavailable after listen')
	const resolvedPort = typeof address === 'string' ? port : address.port
	console.log(`Web Server listening at http://localhost:${resolvedPort} ...`)
})

const mimeTypes: Record<string, string> = {
	html: 'text/html',
	css: 'text/css',
	js: 'application/javascript',
	mjs: 'application/javascript',
	json: 'application/json',
	map: 'application/json',
	svg: 'image/svg+xml',
	png: 'image/png',
	ico: 'image/x-icon',
	woff: 'font/woff',
	woff2: 'font/woff2',
	ttf: 'font/ttf',
	wasm: 'application/wasm',
	ts: 'text/plain',
	tsx: 'text/plain',
}
