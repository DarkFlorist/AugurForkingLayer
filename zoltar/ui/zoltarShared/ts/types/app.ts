import type { QuestionType } from '@zoltar/ui-core-shared/types/contracts.js'

export type { AccountState, TransactionLifecycleParameters, WriteOperationContext } from '@zoltar/ui-core-shared/types/app.js'

export type Route = 'deploy' | 'zoltar' | 'not-found'

export type QuestionFormState = {
	answerUnit: string
	categoricalOutcomes: string[]
	description: string
	scalarIncrement: string
	scalarMax: string
	scalarMin: string
	title: string
	endTime: string
	questionType: QuestionType
	startTime: string
}

export type ZoltarMigrationFormState = {
	amount: string
	outcomeIndexes: string
}
