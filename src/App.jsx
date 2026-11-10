import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import TaskList from './pages/TaskList'
import TaskForm from './pages/TaskForm'
import TaskDetail from './pages/TaskDetail'
import LoginPage from './pages/Login'
import { fetchCurrentUser } from './features/auth/authSlice'

function ProtectedRoute({ children }) {
  const { token, user } = useSelector((state) => state.auth)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (!user && token) {
    return <div className="empty-state">Đang xác thực người dùng...</div>
  }

  return children
}

export default function App() {
  const dispatch = useDispatch()
  const { token, user } = useSelector((state) => state.auth)

  useEffect(() => {
    if (token && !user) {
      dispatch(fetchCurrentUser())
    }
  }, [dispatch, token, user])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks" element={<TaskList />} />
        <Route path="/completed" element={<TaskList completedOnly />} />
        <Route path="/tasks/new" element={<TaskForm />} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route path="/tasks/:id/edit" element={<TaskForm />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
