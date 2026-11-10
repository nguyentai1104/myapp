import { Link } from 'react-router'
import { useSelector } from 'react-redux'
import TaskCard from '../components/TaskCard'

export default function Dashboard() {
  const { items, status } = useSelector((state) => state.todos)
  const done = items.filter((todo) => todo.completed).length
  const pending = items.length - done
  const progress = items.length ? Math.round((done / items.length) * 100) : 0
  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">XIN CHÀO, CHÀO MỪNG BẠN QUAY LẠI 👋</div>
          <h1>Tổng quan công việc</h1>
          <p>Bắt đầu ngày mới thật hiệu quả. Hôm nay là {today}.</p>
        </div>
      </div>

      <div className="hero-banner">
        <div>
          <span className="hero-tag">✨ DUY TRÌ THÓI QUEN TỐT</span>
          <h2>Hôm nay, bạn muốn hoàn thành điều gì?</h2>
          <p>Chia nhỏ mục tiêu, theo dõi tiến độ và bắt đầu từ một việc đơn giản.</p>
          <Link to="/tasks/new" className="btn btn-light px-4 fw-semibold">+ Tạo công việc mới</Link>
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

      {status === 'loading' ? (
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
