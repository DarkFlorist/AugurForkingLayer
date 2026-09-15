import type { MarketType, ReportingOutcomeKey } from '@zoltar/ui-core-shared/types/contracts.js'

export type { AccountState, TransactionLifecycleParameters, WriteOperationContext, WriteOperationsParameters } from '@zoltar/ui-core-shared/types/app.js'

export type Route = 'deploy' | 'zoltar' | 'not-found'

export type MarketFormState = {
	answerUnit: string
	categoricalOutcomes: string[]
	description: string
	scalarIncrement: string
	scalarMax: string
	scalarMin: string
	title: string
	endTime: string
	marketType: MarketType
	startTime: string
}

export type ReportingWithdrawDepositIndexesByOutcome = {
	invalid: bigint[]
	yes: bigint[]
	no: bigint[]
}

export type ReportingFormState = {
	reportAmount: string
	securityPoolAddress: string
	selectedOutcome: ReportingOutcomeKey | undefined
	selectedWithdrawDepositIndexesByOutcome: ReportingWithdrawDepositIndexesByOutcome
}

export type ZoltarMigrationFormState = {
	amount: string
	outcomeIndexes: string
}
