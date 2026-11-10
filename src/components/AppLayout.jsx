import { useEffect, useLayoutEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import { Alert } from 'react-bootstrap'
import { clearTodoError, fetchTodos } from '../features/todos/todosSlice'
import { logout } from '../features/auth/authSlice'

const menu = [
  { path: '/', icon: '◫', label: 'Tổng quan', end: true },
  { path: '/tasks', icon: '☷', label: 'Tất cả công việc' },
  { path: '/completed', icon: '✓', label: 'Đã hoàn thành' },
]

export default function AppLayout() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { items, status, error, loaded } = useSelector((state) => state.todos)
  const { user } = useSelector((state) => state.auth)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('mytasks-theme')
    return saved ? saved === 'dark' : true
  })

  useEffect(() => {
    if (!loaded && status === 'idle') {
      dispatch(fetchTodos())
    }
  }, [dispatch, loaded, status])

  useLayoutEffect(() => {
    document.body.dataset.theme = darkMode ? 'dark' : 'light'
    localStorage.setItem('mytasks-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const unfinished = items.filter((todo) => !todo.completed).length

  function handleLogout() {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="brand-icon">✓</span>
          <span>MyTasks<span className="brand-dot">.</span></span>
        </Link>
        <div className="sidebar-label">KHÔNG GIAN LÀM VIỆC</div>
        <nav className="side-nav" aria-label="Điều hướng chính">
          {menu.map((item) => (
            <NavLink
              key={item.path}
              end={item.end}
              to={item.path}
              className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
            >
              <span className="side-link-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="mini-icon">✦</div>
          <div>
            <strong>{user?.name || 'Người dùng'}</strong>
            <small>Bạn còn {unfinished} việc cần làm</small>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="topbar-overline">WORKSPACE</span>
            <strong>Quản lý công việc cá nhân</strong>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setDarkMode((value) => !value)}
              aria-label={darkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
              aria-pressed={darkMode}
              title={darkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <span className="user-chip">{user?.email || 'demo@mytasks.com'}</span>
            <Link to="/tasks/new" className="btn btn-brand">+ Thêm công việc</Link>
            <button type="button" className="btn btn-ghost" onClick={handleLogout}>Đăng xuất</button>
          </div>
        </header>
        <nav className="mobile-nav" aria-label="Điều hướng trên điện thoại">
          {menu.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.end} className={({isActive})=>isActive?'mobile-active':''}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="main-content">
          {error && (
            <Alert variant="danger" role="alert" className="d-flex align-items-center justify-content-between gap-3">
              <span>Lỗi API: {error}</span>
              {status === 'failed' && <button type="button" className="btn btn-sm btn-outline-danger ms-auto" onClick={() => dispatch(fetchTodos())}>Thử lại</button>}
              <button type="button" className="btn-close" aria-label="Đóng thông báo" onClick={() => dispatch(clearTodoError())} />
            </Alert>
          )}
          <Outlet />
        </main>
        <footer className="app-footer">Nguyen Tri Tai - SE194164</footer>
      </div>
    </div>
  )
}
