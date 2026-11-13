import { useContext, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import { Alert } from 'react-bootstrap'
import { ThemeContext } from '../App'
import { clearTodoError, fetchTodos, resetTodos } from '../features/todos/todosSlice'
import { logout } from '../features/auth/authSlice'

const menu = [
  { path: '/', icon: '◫', label: 'Tổng quan', end: true },
  { path: '/tasks', icon: '☷', label: 'Tất cả công việc' },
  { path: '/calendar', icon: '▦', label: 'Lịch' },
  { path: '/completed', icon: '✓', label: 'Đã hoàn thành' },
  { path: '/account', icon: '◎', label: 'Tài khoản' },
]

export default function AppLayout() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const { items, status, error, loaded } = useSelector((state) => state.todos)
  const { token, user } = useSelector((state) => state.auth)
  const { darkMode, setDarkMode } = useContext(ThemeContext)

  useEffect(() => {
    if (!user) {
      if (loaded || status !== 'idle') dispatch(resetTodos())
      return
    }

    if (token && !loaded && status === 'idle') {
      dispatch(fetchTodos())
    }
  }, [dispatch, loaded, status, token, user])

  const unfinished = items.filter((todo) => !todo.completed).length
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const threeDaysLater = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3)
  const reminderEndKey = `${threeDaysLater.getFullYear()}-${String(threeDaysLater.getMonth() + 1).padStart(2, '0')}-${String(threeDaysLater.getDate()).padStart(2, '0')}`
  const reminders = items
    .filter((todo) => !todo.completed && todo.dueDate && todo.dueDate <= reminderEndKey)
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate))

  function getReminderLabel(dueDate) {
    if (dueDate < todayKey) return 'Đã quá hạn'
    if (dueDate === todayKey) return 'Đến hạn hôm nay'
    return `Còn ${Math.round((new Date(`${dueDate}T00:00:00`) - new Date(`${todayKey}T00:00:00`)) / 86400000)} ngày`
  }

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
          {user?.avatar
            ? <img className="mini-icon sidebar-avatar" src={user.avatar} alt="" />
            : <div className="mini-icon">{user?.name?.trim().charAt(0).toUpperCase() || '✦'}</div>}
          <div>
            {user ? (
              <>
                <strong>{user.name}</strong>
                <small>Bạn còn {unfinished} việc cần làm</small>
              </>
            ) : (
              <>
                <strong>Chào mừng bạn</strong>
                <small><Link to="/login">Đăng nhập để bắt đầu</Link></small>
              </>
            )}
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
            {user ? (
              <>
                <div className="notification-wrap">
                  <button
                    type="button"
                    className="notification-toggle"
                    onClick={() => setNotificationsOpen((open) => !open)}
                    aria-label={`Thông báo công việc${reminders.length ? `, ${reminders.length} việc cần chú ý` : ''}`}
                    aria-expanded={notificationsOpen}
                    aria-controls="task-reminders"
                  >
                    <span aria-hidden="true">🔔</span>
                    {reminders.length > 0 && <span className="notification-count">{reminders.length > 99 ? '99+' : reminders.length}</span>}
                  </button>
                  {notificationsOpen && (
                    <section className="notification-panel" id="task-reminders" aria-label="Nhắc việc">
                      <div className="notification-heading">
                        <strong>Nhắc việc</strong>
                        <span>{reminders.length}</span>
                      </div>
                      {reminders.length === 0 ? (
                        <p className="notification-empty">Bạn không có việc nào sắp đến hạn.</p>
                      ) : (
                        <ul className="notification-list">
                          {reminders.map((todo) => (
                            <li key={todo.id}>
                              <Link to={`/tasks/${todo.id}`} onClick={() => setNotificationsOpen(false)}>
                                <span className={`notification-status ${todo.dueDate < todayKey ? 'overdue' : ''}`}>
                                  {getReminderLabel(todo.dueDate)}
                                </span>
                                <strong>{todo.title}</strong>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  )}
                </div>
                <Link to="/account" className="user-chip" aria-label="Mở tài khoản">
                  {user.avatar
                    ? <img className="topbar-avatar" src={user.avatar} alt="" />
                    : <span className="topbar-avatar topbar-avatar-fallback" aria-hidden="true">{user.name?.trim().charAt(0).toUpperCase() || '?'}</span>}
                  {user.email}
                </Link>
                <Link to="/tasks/new" className="btn btn-brand">+ Thêm công việc</Link>
                <button type="button" className="btn btn-ghost" onClick={handleLogout}>Đăng xuất</button>
              </>
            ) : (
              <Link to="/login" className="btn btn-brand">Đăng nhập</Link>
            )}
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
