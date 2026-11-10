import { Link } from 'react-router'
import { useSelector } from 'react-redux'
import TaskCard from '../components/TaskCard'

export default function Dashboard() {
  const { items, status } = useSelector((state) => state.todos)
  const { user } = useSelector((state) => state.auth)
  const done = items.filter((todo) => todo.completed).length
  const pending = items.length - done
  const progress = items.length ? Math.round((done / items.length) * 100) : 0
  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{user ? 'XIN CHÀO, CHÀO MỪNG BẠN QUAY LẠI 👋' : 'WORKSPACE CỦA BẠN'}</div>
          <h1>{user ? 'Tổng quan công việc' : 'Quản lý công việc thật đơn giản'}</h1>
          <p>{user ? `Bắt đầu ngày mới thật hiệu quả. Hôm nay là ${today}.` : 'Xem giao diện và đăng nhập khi bạn muốn bắt đầu quản lý công việc.'}</p>
        </div>
      </div>

      <div className="hero-banner">
        <div>
          <span className="hero-tag">✨ DUY TRÌ THÓI QUEN TỐT</span>
          <h2>{user ? 'Hôm nay, bạn muốn hoàn thành điều gì?' : 'Sẵn sàng bắt đầu một ngày hiệu quả?'}</h2>
          <p>{user ? 'Chia nhỏ mục tiêu, theo dõi tiến độ và bắt đầu từ một việc đơn giản.' : 'Đăng nhập để tạo danh sách việc cần làm riêng và theo dõi tiến độ của bạn.'}</p>
          <Link to={user ? '/tasks/new' : '/login'} className="btn btn-light px-4 fw-semibold">
            {user ? '+ Tạo công việc mới' : 'Đăng nhập để bắt đầu'}
          </Link>
        </div>
        <div className="hero-illustration" aria-hidden="true"><span>✓</span><i>★</i></div>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><span className="stat-icon stat-purple">☷</span><small>Tổng công việc</small><strong>{items.length}</strong><span className="stat-caption">Đang quản lý</span></div>
        <div className="stat-card"><span className="stat-icon stat-orange">◷</span><small>Chưa hoàn thành</small><strong>{pending}</strong><span className="stat-caption">Cần tập trung</span></div>
        <div className="stat-card"><span className="stat-icon stat-green">✓</span><small>Đã hoàn thành</small><strong>{done}</strong><span className="stat-caption">Tiếp tục phát huy</span></div>
        <div className="stat-card"><span className="stat-icon stat-blue">↗</span><small>Tiến độ</small><strong>{progress}%</strong><div className="progress slim-progress"><div className="progress-bar" style={{ width: `${progress}%` }} /></div></div>
      </div>

      <div className="section-heading">
        <div><h3>Công việc cần làm</h3><p>Những việc đang chờ bạn xử lý</p></div>
        <Link to="/tasks" className="text-link">Xem tất cả →</Link>
      </div>

      {!user ? (
        <div className="empty-state">
          <strong>Danh sách công việc của bạn sẽ xuất hiện ở đây</strong>
          <p>Đăng nhập để xem, tạo và quản lý công việc cá nhân.</p>
          <Link to="/login" className="btn btn-brand">Đăng nhập</Link>
        </div>
      ) : status === 'loading' ? (
        <div className="empty-state">Đang tải dữ liệu từ API...</div>
      ) : items.filter((todo) => !todo.completed).length === 0 ? (
        <div className="empty-state">🎉 Không còn công việc chưa hoàn thành!</div>
      ) : (
        <div className="task-list">
          {items.filter((todo) => !todo.completed).slice(0, 5).map((todo) => <TaskCard key={todo.id} todo={todo} />)}
        </div>
      )}
    </>
  )
}
