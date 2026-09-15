import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createDevToolsSession } from './browserSmoke.mts'
import { getChromiumPath, withChromiumTestLock } from './chromiumPath'

export async function runZoltarWorkflow(baseUrl: string, screenshotDirectory?: string) {
	const chromium = getChromiumPath()
	if (chromium === undefined) throw new Error('Install Chromium or set CHROMIUM_PATH')
	await withChromiumTestLock(async () => {
		const url = `${baseUrl}/?simulate=1&simScenario=deployed#/zoltar`
		const session = await createDevToolsSession(chromium, url, { width: 1440, height: 900 })
		async function evaluate(expression: string): Promise<unknown> {
			const response = await session.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
			if (typeof response !== 'object' || response === null || !('result' in response)) throw new Error('Missing browser evaluation result')
			if ('exceptionDetails' in response) throw new Error(JSON.stringify(response.exceptionDetails))
			const result = response.result
			return typeof result === 'object' && result !== null && 'value' in result ? result.value : undefined
		}
		async function waitFor(expression: string) {
			const deadline = Date.now() + 60000
			while (Date.now() < deadline) {
				if (await evaluate(expression)) return
				await Bun.sleep(100)
			}
			throw new Error(`Browser workflow timed out: ${expression}\n${await evaluate('document.body.innerText')}`)
		}
		async function screenshot(name: string) {
			if (screenshotDirectory === undefined) return
			await evaluate(`Array.from(document.querySelectorAll('button')).filter(e => e.textContent.trim() === 'Dismiss').forEach(e => e.click())`)
			await evaluate('document.fonts.ready')
			await evaluate('window.scrollTo(0, 0)')
			await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
			await Bun.sleep(300)
			const result = await session.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
			if (typeof result !== 'object' || result === null || !('data' in result) || typeof result.data !== 'string') throw new Error('Chromium did not return screenshot data')
			await mkdir(screenshotDirectory, { recursive: true })
			await writeFile(resolve(screenshotDirectory, `zoltar-${name}.png`), Buffer.from(result.data, 'base64'))
		}
		const bodyContains = (text: string) => `document.body.innerText.includes(${JSON.stringify(text)})`
		async function clickText(text: string, prefix = false) {
			const selector = `Array.from(document.querySelectorAll('button,a')).find(e => e.textContent.trim().${prefix ? 'startsWith' : 'includes'}(${JSON.stringify(text)}) && !e.disabled)`
			await waitFor(`Boolean(${selector})`)
			await evaluate(`${selector}.click()`)
		}
		async function setValue(selector: string, value: string) {
			await evaluate(`(() => { const input=document.querySelector(${JSON.stringify(selector)}); if (!input) throw new Error('Input missing'); input.value=${JSON.stringify(value)}; input.dispatchEvent(new Event('input',{bubbles:true})); })()`)
		}
		try {
			await session.send('Runtime.enable')
			await session.send('Page.enable')
			await session.send('Page.navigate', { url })
			await waitFor(bodyContains('No questions'))
			await clickText('Create Question')
			await waitFor(bodyContains('Missing required fields'))
			await setValue('input[placeholder="Will event X happen?"]', 'Did the first proposal pass?')
			await evaluate(`(() => { const end=Array.from(document.querySelectorAll('input[type="datetime-local"]')).at(-1); if (!end) throw new Error('End time missing'); end.value='2024-12-31T12:00'; end.dispatchEvent(new Event('input',{bubbles:true})); })()`)
			await screenshot('question-creation')
			await clickText('Create question')
			await waitFor(bodyContains('Question Created'))
			await clickText('Use for fork')
			await clickText('Approve 450', true)
			await waitFor(`Array.from(document.querySelectorAll('button')).some(e=>e.textContent.trim()==='Fork Universe' && !e.disabled)`)
			await screenshot('forking')
			await clickText('Fork Universe')
			await waitFor(bodyContains('Migrate REP'))
			await setValue('#zoltar-migration-amount', '100')
			await evaluate(`(() => { const outcome=Array.from(document.querySelectorAll('.migration-outcome-select')).find(e=>e.querySelector('.migration-outcome-label')?.textContent.trim()==='Yes'); if (!outcome) throw new Error('Yes outcome missing'); outcome.click(); })()`)
			await clickText('Split REP')
			await waitFor(bodyContains('REP Split'))
			await waitFor(bodyContains('Open universe'))
			// Confirm an actual child token balance is rendered, not just a successful receipt.
			await waitFor(`Array.from(document.querySelectorAll('.migration-outcome-row')).some(e=>e.querySelector('.migration-outcome-label')?.textContent.trim()==='Yes' && e.innerText.includes('100.00 REP') && e.innerText.includes('Open universe'))`)
			await screenshot('migration')
			if (session.issues.length) throw new Error(JSON.stringify(session.issues))
			console.log('Production workflow passed: question creation, approval, fork, child deployment and REP migration')
		} finally {
			await session.close()
		}
	})
}
