import * as commonCopy from '@zoltar/ui-core-shared/copy/common.js'
import * as questionCopy from '../../../copy/question.js'
import { useEffect, useRef, useState } from 'preact/hooks'
import { StateHint } from '@zoltar/ui-core-shared/components/StateHint.js'
import { RouteHeader } from '@zoltar/ui-core-shared/components/RouteHeader.js'
import { Badge } from '@zoltar/ui-core-shared/components/Badge.js'
import { EntityCard } from '@zoltar/ui-core-shared/components/EntityCard.js'
import { ErrorNotice } from '@zoltar/ui-core-shared/components/ErrorNotice.js'
import { FormInput } from '@zoltar/ui-core-shared/components/FormInput.js'
import { PaginationControls } from '@zoltar/ui-core-shared/components/PaginationControls.js'
import { Question, getQuestionTitle } from '@zoltar/ui-core-shared/components/Question.js'
import { SectionBlock } from '@zoltar/ui-core-shared/components/SectionBlock.js'
import type { QuestionRouteContentProps } from '../../types.js'
import { QUESTION_PAGE_SIZE, formatPaginationSummary, getHasNextPaginationPage, getPaginationPageCount, resolvePaginationPageIndex } from '@zoltar/ui-core-shared/lib/pagination.js'
import { getQuestionTypeLabel } from '@zoltar/ui-core-shared/lib/questionType.js'

type QuestionsViewProps = Pick<QuestionRouteContentProps, 'loadingZoltarQuestions' | 'onActiveViewChange' | 'onLoadZoltarQuestionPage' | 'onZoltarForkQuestionIdChange' | 'zoltarQuestionPage' | 'zoltarQuestionsError'> & {
	canFork: boolean
	hasForked: boolean
	requestContextKey: number
}

export function QuestionsView({ canFork, hasForked, loadingZoltarQuestions, onActiveViewChange, onLoadZoltarQuestionPage, onZoltarForkQuestionIdChange, requestContextKey, zoltarQuestionPage, zoltarQuestionsError }: QuestionsViewProps) {
	const [pageIndex, setPageIndex] = useState(0)
	const [retryRequestNonce, setRetryRequestNonce] = useState(0)
	const [searchText, setSearchText] = useState('')
	const loadQuestionPageRef = useRef(onLoadZoltarQuestionPage)
	useEffect(() => {
		loadQuestionPageRef.current = onLoadZoltarQuestionPage
	}, [onLoadZoltarQuestionPage])
	useEffect(() => {
		void loadQuestionPageRef.current(pageIndex, QUESTION_PAGE_SIZE).catch(() => undefined)
	}, [pageIndex, requestContextKey, retryRequestNonce])
	const requestedPageCount = getPaginationPageCount(zoltarQuestionPage?.questionCount, QUESTION_PAGE_SIZE)
	const resolvedPageIndex = resolvePaginationPageIndex(pageIndex, requestedPageCount)
	useEffect(() => {
		if (resolvedPageIndex !== pageIndex) setPageIndex(resolvedPageIndex)
	}, [pageIndex, resolvedPageIndex])
	const currentPage = zoltarQuestionPage?.pageIndex === resolvedPageIndex && zoltarQuestionPage.pageSize === QUESTION_PAGE_SIZE ? zoltarQuestionPage : undefined
	const normalizedSearchText = searchText.trim().toLowerCase()
	const questions =
		currentPage?.questions.filter(question => {
			if (normalizedSearchText === '') return true
			return question.questionId.toLowerCase().includes(normalizedSearchText) || question.title.toLowerCase().includes(normalizedSearchText) || question.description.toLowerCase().includes(normalizedSearchText)
		}) ?? []
	const pageCount = getPaginationPageCount(currentPage?.questionCount, QUESTION_PAGE_SIZE)
	return (
		<div className='route-view-flow'>
			<RouteHeader description={canFork ? questionCopy.questionRegistryDescription : questionCopy.questionRegistryDescriptionWithoutUniverse} title={questionCopy.browseQuestions} />
			<SectionBlock
				actions={
					<PaginationControls
						hasNextPage={getHasNextPaginationPage(resolvedPageIndex, pageCount)}
						hasPreviousPage={resolvedPageIndex > 0}
						loading={loadingZoltarQuestions}
						onNextPage={() => setPageIndex(current => current + 1)}
						onPreviousPage={() => setPageIndex(current => Math.max(0, current - 1))}
						summary={formatPaginationSummary(resolvedPageIndex, pageCount)}
					/>
				}
				title={questionCopy.questions}
				variant='plain'
			>
				<label className='field question-page-search'>
					<span>{questionCopy.searchLoadedQuestions}</span>
					<FormInput value={searchText} onInput={event => setSearchText(event.currentTarget.value)} placeholder={questionCopy.questionSearchPlaceholder} />
				</label>
				<ErrorNotice message={zoltarQuestionsError} />
				{zoltarQuestionsError === undefined ? undefined : (
					<div className='actions'>
						<button className='secondary' disabled={loadingZoltarQuestions} onClick={() => setRetryRequestNonce(currentNonce => currentNonce + 1)} type='button'>
							{loadingZoltarQuestions ? commonCopy.retrying : questionCopy.retryQuestions}
						</button>
					</div>
				)}
				{loadingZoltarQuestions && currentPage === undefined ? <StateHint presentation={{ key: 'loading', badgeLabel: commonCopy.loading, badgeTone: 'pending', detail: questionCopy.loadingQuestions }} /> : undefined}
				{!loadingZoltarQuestions && currentPage !== undefined && currentPage.questions.length === 0 ? <StateHint presentation={{ key: 'empty', badgeLabel: questionCopy.noQuestions, badgeTone: 'muted', detail: questionCopy.noQuestions }} /> : undefined}
				{currentPage !== undefined && currentPage.questions.length > 0 && questions.length === 0 ? <StateHint presentation={{ key: 'empty', badgeLabel: commonCopy.noMatches, badgeTone: 'muted', detail: questionCopy.questionPageNoMatches }} /> : undefined}
				<div className='entity-card-list'>
					{questions.map(question => (
						<EntityCard
							actions={
								canFork ? (
									<button
										className='secondary'
										disabled={hasForked}
										onClick={() => {
											onZoltarForkQuestionIdChange(question.questionId)
											onActiveViewChange('universes')
										}}
									>
										{hasForked ? questionCopy.alreadyForked : questionCopy.useForFork}
									</button>
								) : undefined
							}
							badge={<Badge tone='muted'>{getQuestionTypeLabel(question.questionType)}</Badge>}
							key={question.questionId}
							title={getQuestionTitle(question)}
							variant='record'
						>
							<Question question={question} showTitle={false} variant='preview' />
						</EntityCard>
					))}
				</div>
			</SectionBlock>
		</div>
	)
}
