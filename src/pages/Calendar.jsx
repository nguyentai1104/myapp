import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useSelector } from 'react-redux'
import { formatDate } from '../components/TaskCard'

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function Calendar() {
  const { items, status } = useSelector((state) => state.todos)
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const days = useMemo(() => {
    const firstWeekday = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7
    const lastDate = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const totalCells = Math.ceil((firstWeekday + lastDate) / 7) * 7
    return Array.from({ length: totalCells }, (_, index) => {
      const dayNumber = index - firstWeekday + 1
      if (dayNumber < 1 || dayNumber > lastDate) return null
      const date = new Date(month.getFullYear(), month.getMonth(), dayNumber)
      return { date, key: dateKey(date), number: dayNumber }
    })
  }, [month])

  return (
    <>
      <div className="page-heading heading-with-action">
        <div>
          <div className="eyebrow">LỊCH CÔNG VIỆC</div>
          <h1>Lịch</h1>
          <p>Xem các công việc theo ngày đến hạn.</p>
        </div>
        <Link to="/tasks/new" className="btn btn-brand">+ Thêm công việc</Link>
      </div>
      <section className="panel calendar-panel">
        <div className="calendar-toolbar">
          <button type="button" className="btn btn-ghost" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))} aria-label="Tháng trước">←</button>
          <h2>{month.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</h2>
          <button type="button" className="btn btn-ghost" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))} aria-label="Tháng sau">→</button>
          <button type="button" className="btn btn-outline-secondary" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Hôm nay</button>
        </div>
        <div className="calendar-grid calendar-weekdays">
          {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].map((day) => <strong key={day}>{day}</strong>)}
        </div>
        <div className="calendar-grid">
          {days.map((day, index) => {
            if (!day) return <div className="calendar-day calendar-day-empty" key={`empty-${index}`} />
            const dueTasks = items.filter((todo) => todo.dueDate === day.key)
            const isToday = day.key === dateKey(new Date())
            return (
              <div className={`calendar-day ${isToday ? 'calendar-day-today' : ''}`} key={day.key}>
                <span className="calendar-day-number">{day.number}</span>
                <div className="calendar-day-tasks">
                  {dueTasks.slice(0, 3).map((todo) => (
                    <Link to={`/tasks/${todo.id}`} key={todo.id} className={`calendar-task ${todo.completed ? 'calendar-task-completed' : ''}`} title={`${todo.title} · ${formatDate(todo.dueDate)}`}>
                      {todo.title}
                    </Link>
                  ))}
                  {dueTasks.length > 3 && <span className="calendar-more">+{dueTasks.length - 3} việc khác</span>}
                </div>
              </div>
            )
          })}
        </div>
        {status === 'loading' && <p className="calendar-note">Đang tải công việc...</p>}
        {!items.some((todo) => todo.dueDate) && status !== 'loading' && <p className="calendar-note">Chưa có công việc nào được đặt hạn. Thêm hạn hoàn thành để hiển thị trên lịch.</p>}
      </section>
    </>
  )
}
