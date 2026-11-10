import { useDispatch } from 'react-redux'
import { Link } from 'react-router'
import { deleteTodo, updateTodo } from '../features/todos/todosSlice'

const priorityLabels = {
  high: 'Ưu tiên cao',
  medium: 'Trung bình',
  low: 'Ưu tiên thấp',
}

export function formatDate(date) {
  if (!date) return 'Không có hạn'
  return new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN')
}

export default function TaskCard({ todo }) {
  const dispatch = useDispatch()

  async function toggleCompleted() {
    try {
      await dispatch(updateTodo({ id: todo.id, changes: { completed: !todo.completed } })).unwrap()
    } catch {
      //loi hien thi
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Bạn có chắc muốn xóa công việc "${todo.title}"?`)) return
    try {
      await dispatch(deleteTodo(todo.id)).unwrap()
    } catch {
    }
  }

  return (
    <article className={`task-card ${todo.completed ? 'task-card-done' : ''}`}>
      <label className="task-check-wrap" aria-label={`Đánh dấu hoàn thành: ${todo.title}`}>
        <input type="checkbox" className="form-check-input task-check" checked={Boolean(todo.completed)} onChange={toggleCompleted} />
      </label>
      <div className="task-info">
        <Link to={`/tasks/${todo.id}`} className={`task-title ${todo.completed ? 'completed-title' : ''}`}>
          {todo.title}
        </Link>
        <div className="task-meta">
          <span className={`priority-pill priority-${todo.priority || 'medium'}`}>
            <span className="priority-dot" />{priorityLabels[todo.priority] || 'Trung bình'}
          </span>
          <span>◷ {formatDate(todo.dueDate)}</span>
          <span className={todo.completed ? 'text-success' : 'text-muted'}>
            {todo.completed ? '✓ Hoàn thành' : '○ Đang làm'}
          </span>
        </div>
      </div>
      <div className="task-actions">
        <Link to={`/tasks/${todo.id}/edit`} className="icon-button" title="Sửa công việc" aria-label="Sửa công việc">✎</Link>
        <button type="button" className="icon-button icon-danger" onClick={handleDelete} title="Xóa công việc" aria-label="Xóa công việc">×</button>
      </div>
    </article>
  )
}
