import { Navigate } from 'react-router-dom'
import { useAppRuntime } from '@/hooks/useAppRuntime.js'
import { courseHasTextbook } from '@/lib/courseCapabilities.js'

/*
purpose keeps textbook routes inside supported courses
contract unsupported courses return to their dashboard
invariant guarded textbook content never renders for hurley courses
error behavior missing course state returns to the dashboard
*/
export default function TextbookCourseGuard({ children }) {
  const runtime = useAppRuntime()
  const courseState = runtime?.courseState
  const activeCourse = courseState?.courses?.find(
    (course) => Number(course.id) === Number(courseState.activeCourseId),
  )

  if (!courseHasTextbook(activeCourse)) {
    return <Navigate to={runtime?.dashboardPath || '/'} replace />
  }

  return children
}
