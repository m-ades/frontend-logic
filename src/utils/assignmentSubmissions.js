function studentName(row) {
  return row?.User?.username || row?.user?.username || `User ${row?.user_id ?? "?"}`;
}

// fallback when no question list is given
function rawOrderIndex(row) {
  const raw =
    row?.AssignmentQuestion?.order_index ??
    row?.assignment_question?.order_index;
  const n = Number(raw);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

function questionId(row) {
  return row?.assignment_question_id ?? row?.AssignmentQuestion?.id ?? null;
}

// id -> position (order_index has gaps)
function buildQuestionPositions(questions) {
  const positionById = new Map();
  const sorted = (Array.isArray(questions) ? questions : [])
    .filter((q) => q?.id != null)
    .sort((a, b) => Number(a.order_index) - Number(b.order_index));
  sorted.forEach((q, index) => positionById.set(String(q.id), index));
  return positionById;
}

function questionPosition(row, positionById) {
  const id = questionId(row);
  if (id != null && positionById.has(String(id))) return positionById.get(String(id));
  return rawOrderIndex(row);
}

function questionLabel(row, positionById) {
  const position = questionPosition(row, positionById);
  if (position !== Number.MAX_SAFE_INTEGER) return `Problem ${position + 1}`;
  const id = questionId(row);
  return id != null ? `Question ${id}` : "Question";
}

function submittedMs(row) {
  const ms = Date.parse(row?.submitted_at);
  return Number.isFinite(ms) ? ms : 0;
}

function compareAttempts(a, b) {
  const attemptDiff = Number(b.attempt || 0) - Number(a.attempt || 0);
  if (attemptDiff !== 0) return attemptDiff;
  return submittedMs(b) - submittedMs(a);
}

function buildAttemptBundle(attempts) {
  const sorted = [...attempts].sort(compareAttempts);
  const latest = sorted[0] || null;
  const history = sorted.slice(1);
  return {
    latest,
    history,
    attemptCount: sorted.length,
    bestScore: sorted.reduce((max, row) => {
      const score = Number(row.score);
      return Number.isFinite(score) ? Math.max(max, score) : max;
    }, Number.NEGATIVE_INFINITY),
  };
}

/**
 * @param {Array} rows raw submission rows from API
 * @param {Array} questions full question list, for numbering
 * @returns {{
 *   byStudent: Array,
 *   byQuestion: Array,
 *   summary: { submissionCount, studentCount, questionCount, latestSubmittedAt }
 * }}
 */
export function organizeAssignmentSubmissions(rows = [], questions = []) {
  const list = Array.isArray(rows) ? rows : [];
  const positionById = buildQuestionPositions(questions);

  const studentMap = new Map();
  const questionMap = new Map();

  for (const row of list) {
    const uid = row.user_id;
    const qid = questionId(row);
    if (uid == null || qid == null) continue;

    if (!studentMap.has(uid)) {
      studentMap.set(uid, {
        userId: uid,
        username: studentName(row),
        questions: new Map(),
      });
    }
    const student = studentMap.get(uid);
    if (!student.questions.has(qid)) {
      student.questions.set(qid, {
        questionId: qid,
        label: questionLabel(row, positionById),
        orderIndex: questionPosition(row, positionById),
        attempts: [],
      });
    }
    student.questions.get(qid).attempts.push(row);

    if (!questionMap.has(qid)) {
      questionMap.set(qid, {
        questionId: qid,
        label: questionLabel(row, positionById),
        orderIndex: questionPosition(row, positionById),
        students: new Map(),
      });
    }
    const question = questionMap.get(qid);
    if (!question.students.has(uid)) {
      question.students.set(uid, {
        userId: uid,
        username: studentName(row),
        attempts: [],
      });
    }
    question.students.get(uid).attempts.push(row);
  }

  // include unattempted questions too
  for (const q of Array.isArray(questions) ? questions : []) {
    if (q?.id == null || questionMap.has(q.id)) continue;
    questionMap.set(q.id, {
      questionId: q.id,
      label: questionLabel({ assignment_question_id: q.id }, positionById),
      orderIndex: questionPosition({ assignment_question_id: q.id }, positionById),
      students: new Map(),
    });
  }

  const byStudent = Array.from(studentMap.values())
    .map((student) => {
      const questions = Array.from(student.questions.values())
        .map((q) => {
          const bundle = buildAttemptBundle(q.attempts);
          return {
            questionId: q.questionId,
            label: q.label,
            orderIndex: q.orderIndex,
            ...bundle,
            bestScore: Number.isFinite(bundle.bestScore) ? bundle.bestScore : null,
          };
        })
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const latestSubmittedAt = questions.reduce((max, q) => {
        const ms = submittedMs(q.latest);
        return Math.max(max, ms);
      }, 0);

      const scored = questions
        .map((q) => Number(q.latest?.score))
        .filter((n) => Number.isFinite(n));
      const averageLatestScore = scored.length
        ? Math.round(scored.reduce((sum, n) => sum + n, 0) / scored.length)
        : null;

      const correctCount = questions.filter((q) => q.latest?.is_correct).length;

      return {
        userId: student.userId,
        username: student.username,
        questions,
        questionCount: questions.length,
        attemptCount: questions.reduce((sum, q) => sum + q.attemptCount, 0),
        correctCount,
        averageLatestScore,
        latestSubmittedAt: latestSubmittedAt || null,
      };
    })
    .sort((a, b) => {
      const timeDiff = (b.latestSubmittedAt || 0) - (a.latestSubmittedAt || 0);
      if (timeDiff !== 0) return timeDiff;
      return String(a.username).localeCompare(String(b.username));
    });

  const byQuestion = Array.from(questionMap.values())
    .map((question) => {
      const students = Array.from(question.students.values())
        .map((s) => {
          const bundle = buildAttemptBundle(s.attempts);
          return {
            userId: s.userId,
            username: s.username,
            ...bundle,
            bestScore: Number.isFinite(bundle.bestScore) ? bundle.bestScore : null,
          };
        })
        .sort((a, b) => String(a.username).localeCompare(String(b.username)));

      const scored = students
        .map((s) => Number(s.latest?.score))
        .filter((n) => Number.isFinite(n));
      const averageLatestScore = scored.length
        ? Math.round(scored.reduce((sum, n) => sum + n, 0) / scored.length)
        : null;

      return {
        questionId: question.questionId,
        label: question.label,
        orderIndex: question.orderIndex,
        students,
        studentCount: students.length,
        attemptCount: students.reduce((sum, s) => sum + s.attemptCount, 0),
        correctCount: students.filter((s) => s.latest?.is_correct).length,
        averageLatestScore,
      };
    })
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const latestSubmittedAt = list.reduce((max, row) => Math.max(max, submittedMs(row)), 0);

  return {
    byStudent,
    byQuestion,
    summary: {
      submissionCount: list.length,
      studentCount: byStudent.length,
      questionCount: byQuestion.length,
      latestSubmittedAt: latestSubmittedAt || null,
    },
  };
}

export function filterOrganizedSubmissions(organized, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return organized;

  const byStudent = organized.byStudent.filter((student) =>
    String(student.username).toLowerCase().includes(q)
  );

  const byQuestion = organized.byQuestion
    .map((question) => ({
      ...question,
      students: question.students.filter((student) =>
        String(student.username).toLowerCase().includes(q)
      ),
    }))
    .filter((question) => question.students.length > 0)
    .map((question) => {
      const scored = question.students
        .map((student) => Number(student.latest?.score))
        .filter((n) => Number.isFinite(n));
      return {
        ...question,
        studentCount: question.students.length,
        attemptCount: question.students.reduce((sum, s) => sum + s.attemptCount, 0),
        correctCount: question.students.filter((s) => s.latest?.is_correct).length,
        averageLatestScore: scored.length
          ? Math.round(scored.reduce((sum, n) => sum + n, 0) / scored.length)
          : null,
      };
    });

  return {
    ...organized,
    byStudent,
    byQuestion,
    summary: {
      ...organized.summary,
      studentCount: byStudent.length,
      questionCount: byQuestion.length,
      submissionCount: byStudent.reduce((sum, s) => sum + s.attemptCount, 0),
    },
  };
}
