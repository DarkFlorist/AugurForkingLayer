import { useSignal } from '@preact/signals'
import { useEffect, useRef } from 'preact/hooks'
import type { Address, Hash } from '@zoltar/core-shared/evm/ethereum'
import { createQuestion as createQuestionTransaction } from '../../../protocol/zoltar.js'
import { createWalletWriteClient } from '@zoltar/ui-core-shared/wallet/clients.js'
import { createErrorActionFeedback, createPendingActionFeedback, createSuccessActionFeedback, createWarningActionFeedback } from '@zoltar/ui-core-shared/transactions/actionFeedback.js'
import type { ActionFeedback } from '@zoltar/ui-core-shared/transactions/actionFeedback.js'
import { createQuestionCreationSuccessPresentation, createQuestionCreationTransactionIntent, createQuestionCreationWarningPresentation } from '../../zoltarTransactionPresentations.js'
import { refreshWalletStateOnly } from '@zoltar/ui-core-shared/lib/refreshState.js'
import { runWriteAction } from '@zoltar/ui-core-shared/transactions/writeAction.js'
import { createQuestionParameters } from '../lib/questionCreation.js'
import { hasDeployedStep } from '@zoltar/ui-core-shared/lib/deploymentStatus.js'
import { getDefaultQuestionFormState } from '../lib/questionForm.js'
import { getBrowserStorage } from '@zoltar/ui-core-shared/lib/browserStorage.js'
import type { QuestionFormState, TransactionLifecycleParameters, WriteOperationContext } from '../../../types/app.js'
import type { DeploymentStatus, QuestionCreationResult } from '@zoltar/ui-core-shared/types/contracts.js'
import type { CreateWriteClientCallbacks } from '@zoltar/ui-core-shared/wallet/chainBackend.js'
import { useZoltarOperations } from '../../universes/hooks/useZoltarOperations.js'

type UseQuestionCreationParameters = TransactionLifecycleParameters &
	WriteOperationContext & {
		activeUniverseId: bigint
		activeZoltarView: 'create' | 'fork' | 'migrate' | 'questions'
		autoLoadInitialData: boolean
		deploymentStatuses: DeploymentStatus[]
		environmentRefreshKey: number
	}

export type UseQuestionCreationDependencies = {
	createQuestion: (accountAddress: Address, callbacks: CreateWriteClientCallbacks, parameters: ReturnType<typeof createQuestionParameters>) => Promise<QuestionCreationResult & { hash: Hash }>
}

const defaultUseQuestionCreationDependencies: UseQuestionCreationDependencies = {
	createQuestion: async (accountAddress, callbacks, parameters) => {
		const result = await createQuestionTransaction(createWalletWriteClient(accountAddress, callbacks), parameters)
		return { ...result, hash: result.createQuestionHash }
	},
}

const QUESTION_DRAFT_STORAGE_PREFIX = 'zoltar.questionDraft'

type KeyedValue<T> = {
	storageKey: string | undefined
	value: T
}

function getQuestionDraftStorageKey(accountAddress: Address | undefined) {
	const ownerKey = accountAddress === undefined ? 'anonymous' : accountAddress.toLowerCase()
	return `${QUESTION_DRAFT_STORAGE_PREFIX}:${ownerKey}`
}

function getQuestionDraftStorage() {
	return getBrowserStorage('sessionStorage')
}

function isQuestionFormState(value: unknown): value is QuestionFormState {
	if (typeof value !== 'object' || value === null) return false
	if (!('answerUnit' in value) || typeof value.answerUnit !== 'string') return false
	if (!('categoricalOutcomes' in value) || !Array.isArray(value.categoricalOutcomes) || !value.categoricalOutcomes.every(outcome => typeof outcome === 'string')) return false
	if (!('description' in value) || typeof value.description !== 'string') return false
	if (!('endTime' in value) || typeof value.endTime !== 'string') return false
	if (!('questionType' in value) || (value.questionType !== 'binary' && value.questionType !== 'categorical' && value.questionType !== 'scalar')) return false
	if (!('scalarIncrement' in value) || typeof value.scalarIncrement !== 'string') return false
	if (!('scalarMax' in value) || typeof value.scalarMax !== 'string') return false
	if (!('scalarMin' in value) || typeof value.scalarMin !== 'string') return false
	if (!('startTime' in value) || typeof value.startTime !== 'string') return false
	if (!('title' in value) || typeof value.title !== 'string') return false
	return true
}

function readStoredQuestionDraft(storageKey: string | undefined) {
	if (storageKey === undefined) return undefined
	try {
		const storedValue = getQuestionDraftStorage()?.getItem(storageKey)
		if (storedValue === null || storedValue === undefined) return undefined
		const parsedValue: unknown = JSON.parse(storedValue)
		return isQuestionFormState(parsedValue) ? parsedValue : undefined
	} catch (error) {
		if (!(error instanceof SyntaxError) && !(error instanceof DOMException)) throw error
		return undefined
	}
}

function readQuestionDraft(storageKey: string | undefined) {
	return readStoredQuestionDraft(storageKey) ?? getDefaultQuestionFormState()
}

function writeQuestionDraft(storageKey: string | undefined, form: QuestionFormState) {
	if (storageKey === undefined) return false
	try {
		const storage = getQuestionDraftStorage()
		if (storage === undefined) return false
		storage.setItem(storageKey, JSON.stringify(form))
		return true
	} catch (error) {
		if (!(error instanceof DOMException)) throw error
		// Draft persistence is progressive enhancement; the form remains usable without storage.
		return false
	}
}

function clearQuestionDraft(storageKey: string | undefined) {
	if (storageKey === undefined) return
	try {
		getQuestionDraftStorage()?.removeItem(storageKey)
	} catch (error) {
		if (!(error instanceof DOMException)) throw error
		// Draft persistence is progressive enhancement; the form remains usable without storage.
	}
}

function clearQuestionDraftIfUnchanged(storageKey: string | undefined, submittedForm: QuestionFormState) {
	const storedForm = readStoredQuestionDraft(storageKey)
	if (storedForm !== undefined && JSON.stringify(storedForm) === JSON.stringify(submittedForm)) clearQuestionDraft(storageKey)
}

function getValueForStorageKey<T>(keyedValue: KeyedValue<T> | undefined, storageKey: string | undefined) {
	if (keyedValue === undefined || keyedValue.storageKey !== storageKey) return undefined
	return keyedValue.value
}

export function useQuestionCreation(
	{ accountAddress, activeUniverseId, activeZoltarView, autoLoadInitialData, deploymentStatuses, environmentRefreshKey, onTransactionFailed, onTransactionFinished, onTransactionPresented, onTransactionPrepared, onTransactionRequested, onTransactionSubmitted, refreshState }: UseQuestionCreationParameters,
	dependencies: UseQuestionCreationDependencies = defaultUseQuestionCreationDependencies,
) {
	const zoltar = useZoltarOperations({ accountAddress, activeUniverseId, activeZoltarView, autoLoadInitialData, deploymentStatuses, environmentRefreshKey, onTransactionFailed, onTransactionFinished, onTransactionPresented, onTransactionPrepared, onTransactionRequested, onTransactionSubmitted, refreshState })
	const questionDraftStorageKey = getQuestionDraftStorageKey(accountAddress)
	const questionActionScopeKey = `${questionDraftStorageKey}:${environmentRefreshKey}`
	const currentQuestionActionScopeKeyRef = useRef(questionActionScopeKey)
	currentQuestionActionScopeKeyRef.current = questionActionScopeKey
	const anonymousQuestionDraftStorageKey = getQuestionDraftStorageKey(undefined)
	const questionFormState = useSignal<{ form: QuestionFormState; storageKey: string | undefined }>({ form: readQuestionDraft(questionDraftStorageKey), storageKey: questionDraftStorageKey })
	const questionCreatingScopes = useSignal<ReadonlySet<string>>(new Set())
	const questionSubmissionScopesRef = useRef(new Set<string>())
	const questionResult = useSignal<KeyedValue<QuestionCreationResult> | undefined>(undefined)
	const questionError = useSignal<KeyedValue<string | undefined> | undefined>(undefined)
	const questionFeedback = useSignal<KeyedValue<ActionFeedback<'createQuestion'>> | undefined>(undefined)
	const getQuestionFormForCurrentOwner = () => {
		const keyedForm = questionFormState.value
		if (keyedForm.storageKey === questionDraftStorageKey) return keyedForm.form
		const storedOwnerDraft = readStoredQuestionDraft(questionDraftStorageKey)
		if (storedOwnerDraft !== undefined) return storedOwnerDraft
		if (accountAddress !== undefined && keyedForm.storageKey === anonymousQuestionDraftStorageKey) return keyedForm.form
		return getDefaultQuestionFormState()
	}
	const getQuestionForm = () => getQuestionFormForCurrentOwner()
	useEffect(() => {
		if (questionFormState.value.storageKey === questionDraftStorageKey) return
		const previousStorageKey = questionFormState.value.storageKey
		const storedOwnerDraft = readStoredQuestionDraft(questionDraftStorageKey)
		const nextForm = storedOwnerDraft ?? getQuestionFormForCurrentOwner()
		const persistedOwnerDraft = storedOwnerDraft !== undefined || writeQuestionDraft(questionDraftStorageKey, nextForm)
		questionFormState.value = { form: nextForm, storageKey: questionDraftStorageKey }
		if (accountAddress !== undefined && previousStorageKey === anonymousQuestionDraftStorageKey && storedOwnerDraft === undefined && persistedOwnerDraft) {
			clearQuestionDraft(anonymousQuestionDraftStorageKey)
		}
	}, [accountAddress, questionDraftStorageKey])
	const setQuestionForm = (updater: (current: QuestionFormState) => QuestionFormState) => {
		const nextForm = updater(getQuestionForm())
		writeQuestionDraft(questionDraftStorageKey, nextForm)
		questionFormState.value = { form: nextForm, storageKey: questionDraftStorageKey }
	}

	const createQuestion = async () => {
		if (questionSubmissionScopesRef.current.has(questionActionScopeKey)) {
			questionError.value = { storageKey: questionActionScopeKey, value: 'Question creation already in progress' }
			return
		}
		const submittedQuestionDraftStorageKey = questionDraftStorageKey
		const submittedQuestionActionScopeKey = questionActionScopeKey
		const isCurrentQuestionActionScope = () => currentQuestionActionScopeKeyRef.current === submittedQuestionActionScopeKey
		const submittedQuestionForm = getQuestionForm()
		const transactionContext = {
			questionType: submittedQuestionForm.questionType,
			title: submittedQuestionForm.title,
		}
		questionSubmissionScopesRef.current.add(submittedQuestionActionScopeKey)
		questionResult.value = undefined
		questionFeedback.value = { storageKey: submittedQuestionActionScopeKey, value: createPendingActionFeedback('createQuestion', 'Creating question') }
		try {
			await runWriteAction(
				{
					accountAddress,
					missingWalletMessage: 'Connect a wallet before creating a question',
					onRefreshError: (message, hash) => {
						questionFeedback.value = { storageKey: submittedQuestionActionScopeKey, value: createWarningActionFeedback('createQuestion', 'Question created', message, hash) }
						const result = getValueForStorageKey(questionResult.value, submittedQuestionActionScopeKey)
						if (result !== undefined && isCurrentQuestionActionScope()) onTransactionPresented(createQuestionCreationWarningPresentation(result, message, transactionContext))
					},
					onTransactionRequested: () => {
						const accepted = onTransactionRequested(createQuestionCreationTransactionIntent(transactionContext))
						if (accepted === false) return false
						questionCreatingScopes.value = new Set([...questionCreatingScopes.value, submittedQuestionActionScopeKey])
						return accepted
					},
					onTransactionFinished: () => {
						const nextCreatingScopes = new Set(questionCreatingScopes.value)
						nextCreatingScopes.delete(submittedQuestionActionScopeKey)
						questionCreatingScopes.value = nextCreatingScopes
						onTransactionFinished()
					},
					onTransactionFailed: message => {
						if (isCurrentQuestionActionScope()) onTransactionFailed?.(message)
					},
					onWriteError: message => {
						questionFeedback.value = { storageKey: submittedQuestionActionScopeKey, value: createErrorActionFeedback('createQuestion', 'Question creation failed', message) }
						questionError.value = { storageKey: submittedQuestionActionScopeKey, value: message }
					},
					refreshState: async () => {
						if (!isCurrentQuestionActionScope()) return
						await refreshWalletStateOnly(refreshState)
						await zoltar.loadZoltarQuestions()
					},
					setErrorMessage: message => {
						questionError.value = { storageKey: submittedQuestionActionScopeKey, value: message }
					},
				},
				async walletAddress => {
					if (!hasDeployedStep(deploymentStatuses, 'zoltarQuestionData')) throw new Error('Deploy ZoltarQuestionData before creating a question')
					return await dependencies.createQuestion(
						walletAddress,
						{
							onTransactionPrepared: preview => {
								if (isCurrentQuestionActionScope()) onTransactionPrepared?.(preview)
							},
							onTransactionSubmitted: hash => {
								if (isCurrentQuestionActionScope()) onTransactionSubmitted(hash)
							},
						},
						createQuestionParameters(submittedQuestionForm),
					)
				},
				'Failed to create question',
				result => {
					clearQuestionDraftIfUnchanged(submittedQuestionDraftStorageKey, submittedQuestionForm)
					questionResult.value = { storageKey: submittedQuestionActionScopeKey, value: result }
					questionFeedback.value = { storageKey: submittedQuestionActionScopeKey, value: createSuccessActionFeedback('createQuestion', 'Question created', result.hash) }
					if (isCurrentQuestionActionScope()) {
						onTransactionPresented(createQuestionCreationSuccessPresentation(result, transactionContext))
						zoltar.setZoltarForkQuestionId(result.questionId)
					}
				},
			)
		} finally {
			questionSubmissionScopesRef.current.delete(submittedQuestionActionScopeKey)
		}
	}

	const resetQuestion = () => {
		clearQuestionDraft(questionDraftStorageKey)
		questionFormState.value = { form: getDefaultQuestionFormState(), storageKey: questionDraftStorageKey }
		questionError.value = undefined
		questionResult.value = undefined
	}

	return {
		...zoltar,
		createQuestion,
		questionFeedback: getValueForStorageKey(questionFeedback.value, questionActionScopeKey),
		questionCreating: questionCreatingScopes.value.has(questionActionScopeKey),
		questionError: getValueForStorageKey(questionError.value, questionActionScopeKey),
		questionForm: getQuestionForm(),
		questionResult: getValueForStorageKey(questionResult.value, questionActionScopeKey),
		resetQuestion,
		setQuestionForm,
	}
}
