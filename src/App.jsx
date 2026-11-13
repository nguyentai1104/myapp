import { createContext, useEffect, useLayoutEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import TaskList from './pages/TaskList'
import TaskForm from './pages/TaskForm'
import TaskDetail from './pages/TaskDetail'
import LoginPage from './pages/Login'
import Calendar from './pages/Calendar'
import Account from './pages/Account'
import { fetchCurrentUser } from './features/auth/authSlice'

export const ThemeContext = createContext(null)

function ProtectedRoute() {
  const { token, user } = useSelector((state) => state.auth)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (!user && token) {
    return <div className="empty-state">Đang xác thực người dùng...</div>
  }

  return <Outlet />
}

export default function App() {
  const dispatch = useDispatch()
  const { token, user } = useSelector((state) => state.auth)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('mytasks-theme') !== 'light')

  useLayoutEffect(() => {
    document.body.dataset.theme = darkMode ? 'dark' : 'light'
    localStorage.setItem('mytasks-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    if (token && !user) {
      dispatch(fetchCurrentUser())
    }
  }, [dispatch, token, user])

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<LoginPage initialMode="reset" />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/tasks" element={<TaskList />} />
            <Route path="/completed" element={<TaskList completedOnly />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/account" element={<Account />} />
            <Route path="/tasks/new" element={<TaskForm />} />
            <Route path="/tasks/:id" element={<TaskDetail />} />
            <Route path="/tasks/:id/edit" element={<TaskForm />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ThemeContext.Provider>
  )
}
