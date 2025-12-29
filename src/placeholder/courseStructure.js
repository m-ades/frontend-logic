// dummy gpt generated placeholders until we get the backend up. delete later

// Course structure organized by chapters and subchapters
import { WORKSHEETS } from './proofs.js'

export const ACTIVITY_TYPES = {
  READING: 'reading',
  PRACTICE: 'practice',
  HOMEWORK: 'homework',
  QUIZ: 'quiz',
  EXAM: 'exam'
}

let activityIdCounter = 1000

const createActivity = (worksheet, type, metadata = {}) => {
  const {
    dueDate,
    points = 10,
    estimatedTime,
    description,
    released = true,
    countsTowardsGrade = false,
    partialCredit = false,
    immediateResult = true,
    title,
    id
  } = metadata

  const uniqueId = id || (worksheet ? `activity-${worksheet.id}-${activityIdCounter++}` : `activity-${activityIdCounter++}`)

  return {
    id: uniqueId,
    worksheet: worksheet || null,
    type,
    title: title || worksheet?.title || 'Untitled Activity',
    dueDate,
    points,
    estimatedTime,
    description,
    released,
    countsTowardsGrade,
    partialCredit,
    immediateResult,
    problemCount: worksheet?.proofs?.length || metadata.problemCount || 0
  }
}

export const COURSE_STRUCTURE = [
  {
    id: 'chapter-6',
    title: 'Chapter 6: Propositional Logic',
    subchapters: [
      {
        id: '6.1',
        title: '6.1 Symbols and Translation',
        activities: [
          createActivity(WORKSHEETS.find(w => w.id === 20), ACTIVITY_TYPES.PRACTICE, {
            description: 'Practice translating English sentences into symbolic notation',
            points: 10,
            estimatedTime: '~15 minutes'
          })
        ]
      },
      {
        id: '6.2',
        title: '6.2 Truth Functions',
        activities: [
          createActivity(WORKSHEETS.find(w => w.id === 23), ACTIVITY_TYPES.PRACTICE, {
            description: 'Practice evaluating truth functions',
            points: 10,
            estimatedTime: '~12 minutes'
          })
        ]
      },
      {
        id: '6.3',
        title: '6.3 Truth Tables for Propositions',
        activities: [
          {
            id: 'reading-6.3',
            type: ACTIVITY_TYPES.READING,
            title: '6.3 Section Reading',
            released: true
          },
          createActivity(WORKSHEETS.find(w => w.id === 18), ACTIVITY_TYPES.PRACTICE, {
            description: 'Practice constructing truth tables',
            points: 10,
            estimatedTime: '~20 minutes',
            title: '6.3 Section Exercise Set I'
          }),
          createActivity(WORKSHEETS.find(w => w.id === 19), ACTIVITY_TYPES.PRACTICE, {
            description: 'More truth table practice',
            points: 10,
            estimatedTime: '~15 minutes',
            title: '6.3 Section Exercise Set II'
          }),
          createActivity(WORKSHEETS.find(w => w.id === 18), ACTIVITY_TYPES.HOMEWORK, {
            description: 'Truth table homework assignment',
            points: 10,
            estimatedTime: '~14 minutes',
            problemCount: 6,
            dueDate: new Date('2026-01-05T16:00:00-04:00'),
            countsTowardsGrade: true,
            title: 'HW 6.3 (1)'
          }),
          createActivity(WORKSHEETS.find(w => w.id === 19), ACTIVITY_TYPES.HOMEWORK, {
            description: 'Additional truth table problems',
            points: 10,
            estimatedTime: '~24 minutes',
            problemCount: 8,
            dueDate: new Date('2026-01-09T16:00:00-04:00'),
            countsTowardsGrade: true,
            title: 'HW 6.3 (2)'
          })
        ]
      },
      {
        id: '6.4',
        title: '6.4 Truth Tables for Arguments',
        activities: [
          {
            id: 'reading-6.4',
            type: ACTIVITY_TYPES.READING,
            title: '6.4 Section Reading',
            released: true
          },
          createActivity(WORKSHEETS.find(w => w.id === 19), ACTIVITY_TYPES.PRACTICE, {
            description: 'Practice constructing truth tables for arguments',
            points: 10,
            estimatedTime: '~18 minutes'
          })
        ]
      }
    ]
  },
  {
    id: 'chapter-8',
    title: 'Chapter 8: Predicate Logic',
    subchapters: [
      {
        id: '8.1',
        title: '8.1 Symbols and Translation',
        activities: [
          createActivity(WORKSHEETS.find(w => w.id === 14), ACTIVITY_TYPES.PRACTICE, {
            description: 'Practice translating sentences into predicate logic',
            points: 10,
            estimatedTime: '~25 minutes'
          })
        ]
      },
      {
        id: '8.2',
        title: '8.2 Using the Rules of Inference',
        activities: [
          createActivity(WORKSHEETS.find(w => w.id === 15), ACTIVITY_TYPES.PRACTICE, {
            description: 'Practice applying predicate logic rules of inference',
            points: 10,
            estimatedTime: '~30 minutes'
          })
        ]
      },
      {
        id: '8.3',
        title: '8.3 Quantifier Negation Rules',
        activities: [
          createActivity(WORKSHEETS.find(w => w.id === 17), ACTIVITY_TYPES.PRACTICE, {
            description: 'Practice quantifier negation rules',
            points: 10,
            estimatedTime: '~20 minutes'
          })
        ]
      },
      {
        id: '8.4',
        title: '8.4 Conditional and Indirect Proof',
        activities: [
          createActivity(WORKSHEETS.find(w => w.id === 16), ACTIVITY_TYPES.HOMEWORK, {
            description: 'Conditional and indirect proof problems',
            points: 10,
            estimatedTime: '~35 minutes',
            dueDate: new Date('2026-01-15T16:00:00-04:00'),
            countsTowardsGrade: true
          }),
          createActivity(WORKSHEETS.find(w => w.id === 17), ACTIVITY_TYPES.PRACTICE, {
            description: 'Additional practice problems',
            points: 10,
            estimatedTime: '~20 minutes'
          })
        ]
      }
    ]
  }
]
