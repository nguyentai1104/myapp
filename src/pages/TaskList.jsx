import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useSelector } from 'react-redux'
import { Form } from 'react-bootstrap'
import TaskCard from '../components/TaskCard'

export default function TaskList({ completedOnly = false }) {
  const { items, status } = useSelector((state) => state.todos)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('newest')

  const filteredTodos = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase()
    const result = items.filter((todo) => {
      if (completedOnly && !todo.completed) return false
      if (!completedOnly && filter === 'pending' && todo.completed) return false
      if (!completedOnly && filter === 'completed' && !todo.completed) return false
      return todo.title.toLocaleLowerCase().includes(normalizedSearch)
    })

    if (sort === 'priority') {
      const rank = { high: 0, medium: 1, low: 2 }
      return [...result].sort((a, b) => (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1))
    }
    if (sort === 'deadline') {
      return [...result].sort((a, b) => {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.localeCompare(b.dueDate)
      })
    }
    return result
  }, [items, search, filter, sort, completedOnly])

  return (
    <>
      <div className="page-heading heading-with-action">
        <div>
          <div className="eyebrow">QUẢN LÝ CÔNG VIỆC</div>
          <h1>{completedOnly ? 'Đã hoàn thành' : 'Tất cả công việc'}</h1>
          <p>{completedOnly ? 'Những mục tiêu bạn đã chinh phục.' : 'Lên kế hoạch và chủ động mọi việc mỗi ngày.'}</p>
        </div>
        <Link to="/tasks/new" className="btn btn-brand">+ Thêm công việc</Link>
      </div>

      <div className="panel">
        <div className="filters-row">
          <Form.Control
            className="search-field"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="⌕  Tìm kiếm công việc..."
            aria-label="Tìm kiếm công việc"
          />
          <Form.Select className="sort-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sắp xếp công việc">
            <option value="newest">Thứ tự ban đầu</option>
            <option value="priority">Theo độ ưu tiên</option>
            <option value="deadline">Theo hạn hoàn thành</option>
          </Form.Select>
        </div>
        {!completedOnly && (
          <div className="filter-tabs">
            <button type="button" className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>Tất cả ({items.length})</button>
            <button type="button" className={filter === 'pending' ? 'selected' : ''} onClick={() => setFilter('pending')}>Đang làm ({items.filter((t) => !t.completed).length})</button>
            <button type="button" className={filter === 'completed' ? 'selected' : ''} onClick={() => setFilter('completed')}>Hoàn thành ({items.filter((t) => t.completed).length})</button>
          </div>
        )}
        <div className="result-count">Hiển thị {filteredTodos.length} công việc</div>
        {status === 'loading' ? (
          <div className="empty-state">Đang tải dữ liệu từ API...</div>
        ) : filteredTodos.length === 0 ? (
          <div className="empty-state">
            <span className="empty-emoji">🗒️</span>
            <strong>Chưa có công việc phù hợp</strong>
            <p>Hãy thử tìm từ khóa khác hoặc thêm công việc mới.</p>
            <Link to="/tasks/new" className="btn btn-outline-primary">+ Tạo công việc</Link>
          </div>
        ) : (
          <div className="task-list">
            {filteredTodos.map((todo) => <TaskCard key={todo.id} todo={todo} />)}
          </div>
        )}
      </div>
    </>
  )
}
