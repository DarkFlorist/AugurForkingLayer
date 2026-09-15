import * as commonCopy from '@zoltar/ui-core-shared/copy/common.js'
import * as questionCopy from '../../../copy/question.js'
import { useEffect, useMemo, useState } from 'preact/hooks'
import type { Address } from '@zoltar/core-shared/evm/ethereum'
import { EnumDropdown, type EnumDropdownOption } from '@zoltar/ui-core-shared/components/EnumDropdown.js'
import { EntityCard } from '@zoltar/ui-core-shared/components/EntityCard.js'
import { ErrorNotice } from '@zoltar/ui-core-shared/components/ErrorNotice.js'
import { FormInput } from '@zoltar/ui-core-shared/components/FormInput.js'
import { OutcomeChipRow } from '@zoltar/ui-core-shared/components/OutcomeChipRow.js'
import { Question, getQuestionTitle } from '@zoltar/ui-core-shared/components/Question.js'
import { SectionBlock } from '@zoltar/ui-core-shared/components/SectionBlock.js'
import { TransactionActionButton } from '@zoltar/ui-core-shared/components/TransactionActionButton.js'
import { TransactionHashLink } from '@zoltar/ui-core-shared/components/TransactionHashLink.js'
import { TimestampValue } from '@zoltar/ui-core-shared/components/TimestampValue.js'
import { WarningSurface } from '@zoltar/ui-core-shared/components/WarningSurface.js'
import { MetricField } from '@zoltar/ui-core-shared/components/MetricField.js'
import { assertNever } from '@zoltar/ui-core-shared/lib/assert.js'
import { getQuestionCreationOutcomeLabels, hasQuestionEndTimePassed, validateQuestionForm } from '../lib/questionCreation.js'
import { useChainTimestamp } from '@zoltar/ui-core-shared/wallet/chainTimestamp.js'
import { appendInvalidOutcomeLabelIfMissing, isInvalidOutcomeLabel } from '@zoltar/ui-core-shared/lib/outcomeLabels.js'
import { clampScalarTickIndex, parseScalarFormInputs } from '@zoltar/ui-core-shared/lib/scalarOutcome.js'
import { getQuestionTypeLabel } from '@zoltar/ui-core-shared/lib/questionType.js'
import type { QuestionFormState } from '../../../types/app.js'
import type { QuestionCreationResult, QuestionDetails } from '@zoltar/ui-core-shared/types/contracts.js'
import { ScalarCreatePreview, type ScalarCreatePreviewDetails } from './ScalarCreatePreview.js'
import { getWrongNetworkReason } from '@zoltar/ui-core-shared/wallet/network.js'
import { tryParseTimestampInput } from '@zoltar/ui-core-shared/forms/formInputs.js'
import type { ComponentChildren } from 'preact'

const QUESTION_TYPE_OPTIONS: EnumDropdownOption<QuestionFormState['questionType']>[] = [
	{ value: 'binary', label: questionCopy.binary },
	{ value: 'categorical', label: questionCopy.categorical },
	{ value: 'scalar', label: questionCopy.scalar },
]
type QuestionFormFieldName = keyof ReturnType<typeof validateQuestionForm>['fieldErrors']
type QuestionCreateSectionProps = {
	allowedQuestionTypes?: readonly QuestionFormState['questionType'][]
	accountAddress: Address | undefined
	canUseForFork: boolean
	formDisabled?: boolean
	hasForked: boolean
	isOnActiveAppChain: boolean
	questionCreating: boolean
	questionError: string | undefined
	questionForm: QuestionFormState
	questionResult: QuestionCreationResult | undefined
	loadingZoltarQuestions: boolean
	onCreateQuestion: () => void
	onQuestionFormChange: (update: Partial<QuestionFormState>) => void
	onOpenForkTab: () => void
	onResetQuestion: () => void
	onUseQuestionForFork: (questionId: string) => void
	renderResultActions?: (result: { questionType: QuestionCreationResult['questionType']; questionId: string; questionTitle: string }) => ComponentChildren
	submitFields?: ComponentChildren
	submitActionOverride?: {
		availability: {
			disabled: boolean
			reason: string | undefined
		}
		idleLabel: ComponentChildren
		onSubmit: () => void
		pending: boolean
		pendingLabel: string
	}
	zoltarQuestions: QuestionDetails[]
}

function getScalarCreatePreviewDetails(questionForm: QuestionFormState, scalarInputsValid: boolean): ScalarCreatePreviewDetails | undefined {
	if (questionForm.questionType !== 'scalar') return undefined
	if (!scalarInputsValid) return undefined
	return {
		answerUnit: questionForm.answerUnit.trim(),
		...parseScalarFormInputs(questionForm),
	}
}

function getFieldErrorId(field: QuestionFormFieldName) {
	return `question-create-${field}-error`
}

function getFieldErrorDescribedBy(field: QuestionFormFieldName, message: string | undefined) {
	return message === undefined ? undefined : getFieldErrorId(field)
}

function renderFieldError(field: QuestionFormFieldName, message: string | undefined) {
	if (message === undefined) return undefined
	return (
		<p className='field-error' id={getFieldErrorId(field)}>
			{message}
		</p>
	)
}

function renderRequiredFieldLabel(label: string) {
	return (
		<>
			{label}{' '}
			<span className='required-field-indicator' aria-hidden='true'>
				*
			</span>
			<span className='visually-hidden'> ({commonCopy.required})</span>
		</>
	)
}

function getQuestionTypeGuidance(questionType: QuestionFormState['questionType']) {
	switch (questionType) {
		case 'binary':
			return questionCopy.binaryQuestionDescription
		case 'categorical':
			return questionCopy.categoricalOutcomesGuidance
		case 'scalar':
			return questionCopy.scalarQuestionDescription
		default:
			return assertNever(questionType)
	}
}

function getDraftOutcomeLabels(questionForm: QuestionFormState, categoricalOutcomesError: string | undefined) {
	switch (questionForm.questionType) {
		case 'binary':
			return appendInvalidOutcomeLabelIfMissing(getQuestionCreationOutcomeLabels(questionForm))
		case 'categorical': {
			if (categoricalOutcomesError === undefined) {
				return appendInvalidOutcomeLabelIfMissing(getQuestionCreationOutcomeLabels(questionForm))
			}

			const normalizedOutcomes = questionForm.categoricalOutcomes.map(outcome => outcome.trim()).filter(outcome => outcome !== '')
			return normalizedOutcomes.length > 0 ? appendInvalidOutcomeLabelIfMissing(normalizedOutcomes) : [questionCopy.minimumOutcomeCountReason, commonCopy.invalid]
		}
		case 'scalar':
			return [questionCopy.scalar, commonCopy.invalid]
		default:
			return assertNever(questionForm.questionType)
	}
}

export function QuestionCreateSection({
	allowedQuestionTypes = ['binary', 'categorical', 'scalar'],
	accountAddress,
	canUseForFork,
	formDisabled = false,
	hasForked,
	isOnActiveAppChain,
	loadingZoltarQuestions,
	questionCreating,
	questionError,
	questionForm,
	questionResult,
	onCreateQuestion,
	onQuestionFormChange,
	onOpenForkTab,
	onResetQuestion,
	onUseQuestionForFork,
	renderResultActions,
	submitFields,
	submitActionOverride,
	zoltarQuestions,
}: QuestionCreateSectionProps) {
	const [scalarCreatePreviewTick, setScalarCreatePreviewTick] = useState('0')
	const currentTimestamp = useChainTimestamp()
	const [touchedFields, setTouchedFields] = useState<ReadonlySet<QuestionFormFieldName>>(new Set())
	const selectedQuestionDetails = useMemo(() => (questionResult === undefined ? undefined : zoltarQuestions.find(question => question.questionId === questionResult.questionId)), [questionResult?.questionId, zoltarQuestions])
	const questionTypeOptions = useMemo(() => QUESTION_TYPE_OPTIONS.filter(option => allowedQuestionTypes.includes(option.value)), [allowedQuestionTypes])
	const questionFormValidation = validateQuestionForm(questionForm)
	const questionTypeGuidance = getQuestionTypeGuidance(questionForm.questionType)
	const scalarInputsValid = questionFormValidation.fieldErrors.scalarIncrement === undefined && questionFormValidation.fieldErrors.scalarMax === undefined && questionFormValidation.fieldErrors.scalarMin === undefined
	const scalarCreatePreviewDetails = getScalarCreatePreviewDetails(questionForm, scalarInputsValid)
	const selectedQuestionTitle = selectedQuestionDetails === undefined ? commonCopy.question : getQuestionTitle(selectedQuestionDetails)
	const draftOutcomeItems = getDraftOutcomeLabels(questionForm, questionFormValidation.fieldErrors.categoricalOutcomes).map((outcome, outcomeIndex) => ({
		key: `${outcomeIndex}-${outcome}`,
		label: outcome,
		tone: isInvalidOutcomeLabel(outcome) ? ('warning' as const) : ('default' as const),
	}))
	const normalizedDescription = questionForm.description.trim()
	const draftDescription = normalizedDescription === '' ? undefined : questionForm.description
	const draftTitle = questionForm.title.trim() === '' ? questionCopy.untitledQuestion : questionForm.title
	const markFieldTouched = (field: QuestionFormFieldName) => setTouchedFields(current => new Set([...current, field]))
	const getVisibleFieldError = (field: QuestionFormFieldName) => (touchedFields.has(field) ? questionFormValidation.fieldErrors[field] : undefined)
	const timingRelationshipError = questionFormValidation.fieldErrors.startTime !== undefined && questionFormValidation.fieldErrors.startTime === questionFormValidation.fieldErrors.endTime && (touchedFields.has('startTime') || touchedFields.has('endTime')) ? questionFormValidation.fieldErrors.startTime : undefined
	const startTimeError = timingRelationshipError ?? getVisibleFieldError('startTime')
	const endTimeError = timingRelationshipError ?? getVisibleFieldError('endTime')
	const timingRelationshipErrorId = 'question-create-timing-error'
	const canCreateQuestion = accountAddress !== undefined && isOnActiveAppChain && !questionCreating && questionFormValidation.isValid
	const submitAction =
		submitActionOverride === undefined
			? {
					availability: {
						disabled: !canCreateQuestion,
						reason: (() => {
							if (accountAddress === undefined) return questionCopy.questionCreationWalletRequired
							if (!isOnActiveAppChain) return getWrongNetworkReason()
							if (questionFormValidation.isValid) return undefined
							return questionFormValidation.notice
						})(),
					},
					idleLabel: commonCopy.createQuestionAction,
					onSubmit: onCreateQuestion,
					pending: questionCreating,
					pendingLabel: questionCopy.createQuestionPendingLabel,
				}
			: submitActionOverride
	const showEndedQuestionWarning = questionFormValidation.fieldErrors.endTime === undefined && hasQuestionEndTimePassed(questionForm, currentTimestamp)
	const renderDraftTimestamp = (value: string, emptyValue: string) => {
		if (value.trim() === '') return emptyValue
		const timestamp = tryParseTimestampInput(value)
		return timestamp === undefined ? value : <TimestampValue timestamp={timestamp} />
	}
	useEffect(() => {
		if (scalarCreatePreviewDetails === undefined) return
		const clampedTick = clampScalarTickIndex(BigInt(scalarCreatePreviewTick), scalarCreatePreviewDetails.numTicks).toString()
		if (clampedTick === scalarCreatePreviewTick) return
		setScalarCreatePreviewTick(clampedTick)
	}, [scalarCreatePreviewDetails?.numTicks, scalarCreatePreviewTick])
	const updateCategoricalOutcome = (outcomeIndex: number, value: string) => {
		onQuestionFormChange({
			categoricalOutcomes: questionForm.categoricalOutcomes.map((outcome, index) => (index === outcomeIndex ? value : outcome)),
		})
	}
	const addCategoricalOutcome = () => {
		onQuestionFormChange({
			categoricalOutcomes: [...questionForm.categoricalOutcomes, ''],
		})
	}
	const removeCategoricalOutcome = (outcomeIndex: number) => {
		onQuestionFormChange({
			categoricalOutcomes: questionForm.categoricalOutcomes.filter((_, index) => index !== outcomeIndex),
		})
	}
	return (
		<>
			{questionResult === undefined ? undefined : (
				<EntityCard
					title={selectedQuestionTitle}
					actions={
						<div className='actions'>
							{canUseForFork ? (
								<button
									aria-label={hasForked ? questionCopy.formatAlreadyForkedLabel(selectedQuestionTitle, questionResult.questionId) : questionCopy.formatUseForForkLabel(selectedQuestionTitle, questionResult.questionId)}
									className='secondary'
									disabled={hasForked}
									onClick={() => {
										if (hasForked) return
										onUseQuestionForFork(questionResult.questionId)
										onOpenForkTab()
									}}
								>
									{hasForked ? questionCopy.alreadyForked : questionCopy.useForFork}
								</button>
							) : undefined}
							{renderResultActions?.({ questionType: questionResult.questionType, questionId: questionResult.questionId, questionTitle: selectedQuestionTitle })}
							<button className='secondary' onClick={onResetQuestion}>
								{questionCopy.createAnotherQuestion}
							</button>
						</div>
					}
				>
					<div className='question-preview-body'>
						{(() => {
							if (selectedQuestionDetails === undefined) {
								if (loadingZoltarQuestions)
									return (
										<span className='loading-value' role='status' aria-label={questionCopy.loadingQuestionDetails}>
											<span className='spinner' aria-hidden='true' />
										</span>
									)

								return <p className='detail'>{questionCopy.questionDetailsUnavailable}</p>
							}

							return <Question question={selectedQuestionDetails} showTitle={false} />
						})()}
						<MetricField label={questionCopy.creationTransactionHash}>
							<TransactionHashLink hash={questionResult.createQuestionHash} />
						</MetricField>
					</div>
				</EntityCard>
			)}

			{questionResult === undefined ? (
				<SectionBlock variant='plain'>
					<form
						aria-label={commonCopy.createQuestion}
						className='form-grid'
						noValidate
						onSubmit={event => {
							event.preventDefault()
							if (submitAction.availability.disabled) return
							submitAction.onSubmit()
						}}
					>
						<fieldset className='question-create-editor' disabled={formDisabled}>
							<div className='field'>
								<span>{questionCopy.questionType}</span>
								<EnumDropdown disabled={formDisabled || questionTypeOptions.length === 1} ariaLabel={questionCopy.questionType} options={questionTypeOptions} value={questionForm.questionType} onChange={questionType => onQuestionFormChange({ questionType })} />
								{questionTypeOptions.length === 1 ? undefined : <p className='field-help'>{questionTypeGuidance}</p>}
							</div>

							<div className='field'>
								<label>
									<span>{renderRequiredFieldLabel(questionCopy.title)}</span>
									<FormInput
										aria-label={questionCopy.title}
										aria-describedby={getFieldErrorDescribedBy('title', getVisibleFieldError('title'))}
										invalid={getVisibleFieldError('title') !== undefined}
										value={questionForm.title}
										onBlur={() => markFieldTouched('title')}
										onInput={event => onQuestionFormChange({ title: event.currentTarget.value })}
										placeholder={questionCopy.questionTitlePlaceholder}
										required
									/>
								</label>
								{renderFieldError('title', getVisibleFieldError('title'))}
							</div>

							<div className='field'>
								<label htmlFor='question-create-description'>
									<span>{questionCopy.description}</span>
								</label>
								<textarea id='question-create-description' value={questionForm.description} onInput={event => onQuestionFormChange({ description: event.currentTarget.value })} placeholder={questionCopy.optionalQuestionContext} />
								<p className='field-help'>{questionCopy.resolutionSourceHelpText}</p>
							</div>

							<div className='field-row'>
								<div className='field'>
									<label>
										<span>{questionCopy.startTime}</span>
										<FormInput
											aria-describedby={timingRelationshipError === undefined ? getFieldErrorDescribedBy('startTime', startTimeError) : timingRelationshipErrorId}
											invalid={startTimeError !== undefined}
											type='datetime-local'
											value={questionForm.startTime}
											onBlur={() => markFieldTouched('startTime')}
											onInput={event => onQuestionFormChange({ startTime: event.currentTarget.value })}
										/>
									</label>
									{timingRelationshipError === undefined ? renderFieldError('startTime', startTimeError) : undefined}
								</div>
								<div className='field'>
									<label>
										<span>{renderRequiredFieldLabel(questionCopy.endTime)}</span>
										<FormInput
											aria-label={questionCopy.endTime}
											aria-describedby={timingRelationshipError === undefined ? getFieldErrorDescribedBy('endTime', endTimeError) : timingRelationshipErrorId}
											invalid={endTimeError !== undefined}
											type='datetime-local'
											value={questionForm.endTime}
											required
											onBlur={() => markFieldTouched('endTime')}
											onInput={event => onQuestionFormChange({ endTime: event.currentTarget.value })}
										/>
									</label>
									{timingRelationshipError === undefined ? renderFieldError('endTime', endTimeError) : undefined}
								</div>
							</div>
							{timingRelationshipError === undefined ? undefined : (
								<p className='field-error' id={timingRelationshipErrorId}>
									{timingRelationshipError}
								</p>
							)}
							<p className='field-help'>{questionCopy.questionTimingHelpText}</p>

							{questionForm.questionType === 'categorical' ? (
								<div className='field' role='group' aria-labelledby='question-create-outcomes-label'>
									<span id='question-create-outcomes-label'>{renderRequiredFieldLabel(questionCopy.outcomes)}</span>
									<div className='categorical-outcomes'>
										{questionForm.categoricalOutcomes.map((outcome, outcomeIndex) => (
											<div className='categorical-outcome-row' key={`categorical-outcome-${outcomeIndex}`}>
												<label className='field'>
													<span className='visually-hidden'>{`${commonCopy.outcome} ${outcomeIndex + 1}`}</span>
													<FormInput
														aria-describedby={getFieldErrorDescribedBy('categoricalOutcomes', getVisibleFieldError('categoricalOutcomes'))}
														invalid={getVisibleFieldError('categoricalOutcomes') !== undefined}
														required={outcomeIndex < 2}
														value={outcome}
														onBlur={() => markFieldTouched('categoricalOutcomes')}
														onInput={event => updateCategoricalOutcome(outcomeIndex, event.currentTarget.value)}
														placeholder={`${commonCopy.outcome} ${outcomeIndex + 1}`}
													/>
												</label>
												<button aria-label={questionCopy.formatRemoveOutcomeLabel(outcomeIndex + 1)} className='secondary categorical-outcome-remove' type='button' onClick={() => removeCategoricalOutcome(outcomeIndex)}>
													{questionCopy.remove}
												</button>
											</div>
										))}
									</div>
									{renderFieldError('categoricalOutcomes', getVisibleFieldError('categoricalOutcomes'))}
									<p className='field-help'>{questionCopy.categoricalOutcomeLabelsHelpText}</p>
									<button className='secondary categorical-outcome-add' type='button' onClick={addCategoricalOutcome}>
										{questionCopy.addOutcome}
									</button>
								</div>
							) : undefined}

							{questionForm.questionType === 'scalar' ? (
								<div className='field-row'>
									<div className='field'>
										<label>
											<span>{renderRequiredFieldLabel(questionCopy.scalarMin)}</span>
											<FormInput
												aria-label={questionCopy.scalarMin}
												aria-describedby={getFieldErrorDescribedBy('scalarMin', getVisibleFieldError('scalarMin'))}
												invalid={getVisibleFieldError('scalarMin') !== undefined}
												value={questionForm.scalarMin}
												onBlur={() => markFieldTouched('scalarMin')}
												onInput={event => onQuestionFormChange({ scalarMin: event.currentTarget.value })}
												placeholder={questionCopy.scalarMinExample}
												required
											/>
										</label>
										{renderFieldError('scalarMin', getVisibleFieldError('scalarMin'))}
									</div>
									<label className='field'>
										<span>{questionCopy.answerUnit}</span>
										<FormInput value={questionForm.answerUnit} onInput={event => onQuestionFormChange({ answerUnit: event.currentTarget.value })} placeholder={questionCopy.usd} />
									</label>
								</div>
							) : undefined}

							{questionForm.questionType === 'scalar' ? (
								<div className='field-row'>
									<div className='field'>
										<label>
											<span>{renderRequiredFieldLabel(questionCopy.scalarIncrement)}</span>
											<FormInput
												aria-label={questionCopy.scalarIncrement}
												aria-describedby={getFieldErrorDescribedBy('scalarIncrement', getVisibleFieldError('scalarIncrement'))}
												invalid={getVisibleFieldError('scalarIncrement') !== undefined}
												value={questionForm.scalarIncrement}
												onBlur={() => markFieldTouched('scalarIncrement')}
												onInput={event => onQuestionFormChange({ scalarIncrement: event.currentTarget.value })}
												placeholder={questionCopy.scalarIncrementExample}
												required
											/>
										</label>
										{renderFieldError('scalarIncrement', getVisibleFieldError('scalarIncrement'))}
									</div>
									<div className='field'>
										<label>
											<span>{renderRequiredFieldLabel(questionCopy.scalarMax)}</span>
											<FormInput
												aria-label={questionCopy.scalarMax}
												aria-describedby={getFieldErrorDescribedBy('scalarMax', getVisibleFieldError('scalarMax'))}
												invalid={getVisibleFieldError('scalarMax') !== undefined}
												value={questionForm.scalarMax}
												onBlur={() => markFieldTouched('scalarMax')}
												onInput={event => onQuestionFormChange({ scalarMax: event.currentTarget.value })}
												placeholder={questionCopy.scalarMaxExample}
												required
											/>
										</label>
										{renderFieldError('scalarMax', getVisibleFieldError('scalarMax'))}
									</div>
								</div>
							) : undefined}
							{questionForm.questionType === 'scalar' ? <p className='field-help'>{questionCopy.scalarResolutionHelpText}</p> : undefined}
							{showEndedQuestionWarning ? (
								<WarningSurface ariaLive='polite' role='status' surface='flat' variant='compact'>
									<p>{questionCopy.endedQuestionWarning}</p>
								</WarningSurface>
							) : undefined}

							{(() => {
								if (questionForm.questionType === 'scalar') {
									if (scalarCreatePreviewDetails === undefined) return <p className='detail'>{questionCopy.scalarPreviewInputHint}</p>

									return <ScalarCreatePreview details={scalarCreatePreviewDetails} selectedTick={scalarCreatePreviewTick} onSelectedTickChange={setScalarCreatePreviewTick} />
								}

								return undefined
							})()}

							<SectionBlock headingLevel={4} title={questionCopy.draftPreview} variant='embedded'>
								<div className='question-draft-preview'>
									<div className='question-draft-preview-header'>
										<div className='question-summary-heading'>
											<strong>{draftTitle}</strong>
											{draftDescription === undefined ? undefined : <p className='detail'>{draftDescription}</p>}
										</div>
										<span className='question-draft-preview-chip'>{getQuestionTypeLabel(questionForm.questionType)}</span>
									</div>
									<OutcomeChipRow items={draftOutcomeItems} />
									<div className='question-draft-preview-meta' role='list' aria-label={questionCopy.draftQuestionSummary}>
										<div className='question-draft-preview-meta-item' role='listitem'>
											<span>{commonCopy.starts}</span>
											<strong>{renderDraftTimestamp(questionForm.startTime, questionCopy.immediatelyAfterCreation)}</strong>
										</div>
										<div className='question-draft-preview-meta-item' role='listitem'>
											<span>{commonCopy.ends}</span>
											<strong>{renderDraftTimestamp(questionForm.endTime, questionCopy.endTimeRequired)}</strong>
										</div>
									</div>
								</div>
							</SectionBlock>
						</fieldset>
						{submitFields}

						<div className='actions'>
							<TransactionActionButton idleLabel={submitAction.idleLabel} pendingLabel={submitAction.pendingLabel} onClick={() => undefined} pending={submitAction.pending} type='submit' availability={submitAction.availability} />
						</div>
					</form>
				</SectionBlock>
			) : undefined}

			<ErrorNotice message={questionError} />
		</>
	)
}
