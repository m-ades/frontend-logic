/**
 * Organize classwide assignment submissions for instructor review.
 *
 * Design:
 * - Group by student (default) or by question
 * - Collapse attempt history: each question shows its latest attempt;
 *   earlier attempts stay available under expand
 * - Sort students by most recent activity; questions by order_index
 */

function studentName(row) {
  return row?.User?.username || row?.user?.username || `User ${row?.user_id ?? "?"}`;
}

function questionOrderIndex(row) {
  const raw =
    row?.AssignmentQuestion?.order_index ??
    row?.assignment_question?.order_index;
  const n = Number(raw);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

function questionId(row) {
  return row?.assignment_question_id ?? row?.AssignmentQuestion?.id ?? null;
}

function questionLabel(row) {
  const order = questionOrderIndex(row);
  if (order !== Number.MAX_SAFE_INTEGER) return `Problem ${order + 1}`;
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
 * @returns {{
 *   byStudent: Array,
 *   byQuestion: Array,
 *   summary: { submissionCount, studentCount, questionCount, latestSubmittedAt }
 * }}
 */
export function organizeAssignmentSubmissions(rows = []) {
  const list = Array.isArray(rows) ? rows : [];

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
        label: questionLabel(row),
        orderIndex: questionOrderIndex(row),
        attempts: [],
      });
    }
    student.questions.get(qid).attempts.push(row);

    if (!questionMap.has(qid)) {
      questionMap.set(qid, {
        questionId: qid,
        label: questionLabel(row),
        orderIndex: questionOrderIndex(row),
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
