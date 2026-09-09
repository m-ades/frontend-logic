import assert from 'node:assert/strict'
import test from 'node:test'
import { buildBreadcrumbInfo, buildRuntimePaths, remapRoutePath } from '../src/runtime/sandboxRuntime.js'

test('students and instructors share assignment and textbook links', () => {
  for (const role of ['student', 'instructor']) {
    const paths = buildRuntimePaths(role)
    assert.equal(paths.dashboardPath, '/dashboard')
    assert.equal(paths.assignmentPath(30), '/assignment/30')
    assert.equal(paths.textbookChapterPath('Ch6'), '/textbook/Ch6')
    assert.deepEqual(buildBreadcrumbInfo('/assignment/30', { routeKind: role, returnTo: '/practice' }), {
      label: 'Practice', path: '/practice',
    })
  }
  assert.equal(buildRuntimePaths('student').gradesPath, '/grades')
  assert.equal(buildRuntimePaths('instructor').gradesPath, '/gradebook')
})

test('demo navigation stays within its selected sandbox', () => {
  for (const role of ['student', 'instructor']) {
    const prefix = `/sandbox/${role}`
    const paths = buildRuntimePaths(role, prefix)
    assert.equal(paths.assignmentPath(30), `${prefix}/assignment/30`)
    assert.equal(remapRoutePath('/assignments', '', prefix), `${prefix}/assignments`)
    assert.deepEqual(buildBreadcrumbInfo(`${prefix}/assignment/30`, { routeKind: role, routePrefix: prefix }), {
      label: 'Assignments', path: `${prefix}/assignments`,
    })
  }
})
