import { Link, useParams } from 'react-router'
import { useSelector } from 'react-redux'
import { formatDate } from '../components/TaskCard'

const priorities = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' }
const repeatLabels = { none: 'Không lặp', daily: 'Hằng ngày', weekly: 'Hằng tuần', monthly: 'Hằng tháng' }

export default function TaskDetail() {
  const { id } = useParams()
  const { items, status } = useSelector((state) => state.todos)
  const todo = items.find((item) => String(item.id) === id)

  if (status === 'loading') return <div className="empty-state">Đang tải dữ liệu...</div>
  if (!todo) return <div className="empty-state">Không tìm thấy công việc. <Link to="/tasks">Quay lại danh sách</Link></div>

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">QUẢN LÝ CÔNG VIỆC / CHI TIẾT</div>
          <h1>Chi tiết công việc</h1>
          <p>Thông tin và trạng thái công việc của bạn</p>
        </div>
      </div>
      <div className="form-panel detail-panel">
        <div className="detail-head">
          <div>
            <span className={`priority-pill priority-${todo.priority || 'medium'}`}>{priorities[todo.priority] || 'Trung bình'}</span>
            <h2>{todo.title}</h2>
          </div>
          <span className={`status-tag ${todo.completed ? 'status-done' : ''}`}>
            {todo.completed ? '✓ Hoàn thành' : '○ Chưa hoàn thành'}
          </span>
        </div>
        <div className="detail-row"><span>Mô tả</span><strong>{todo.description || 'Chưa có mô tả'}</strong></div>
        <div className="detail-row"><span>Hạn hoàn thành</span><strong>{formatDate(todo.dueDate)}</strong></div>
        <div className="detail-row"><span>Độ ưu tiên</span><strong>{priorities[todo.priority] || 'Trung bình'}</strong></div>
        <div className="detail-row"><span>Danh mục</span><strong>{todo.category || 'Chưa phân loại'}</strong></div>
        <div className="detail-row"><span>Nhãn</span><strong>{todo.tags?.length ? todo.tags.join(', ') : 'Chưa có nhãn'}</strong></div>
        <div className="detail-row"><span>Lặp lại</span><strong>{repeatLabels[todo.repeatRule] || 'Không lặp'}</strong></div>
        <div className="form-actions">
          <Link to="/tasks" className="btn btn-outline-secondary px-4">← Quay lại</Link>
          <Link to={`/tasks/${todo.id}/edit`} className="btn btn-brand px-4">✎ Chỉnh sửa</Link>
        </div>
      </div>
    </>
  )
}
