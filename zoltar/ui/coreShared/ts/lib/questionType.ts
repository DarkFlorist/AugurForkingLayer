import { assertNever } from './assert.js'
import * as questionCopy from '../copy/questionType.js'
import type { QuestionType } from '../types/contracts.js'

export function getQuestionTypeLabel(questionType: QuestionType) {
	switch (questionType) {
		case 'binary':
			return questionCopy.binary
		case 'categorical':
			return questionCopy.categorical
		case 'scalar':
			return questionCopy.scalar
		default:
			return assertNever(questionType)
	}
}
