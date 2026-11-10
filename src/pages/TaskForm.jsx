import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Button, Form, Alert } from 'react-bootstrap'
import { Link, useNavigate, useParams } from 'react-router'
import { addTodo, updateTodo } from '../features/todos/todosSlice'

const emptyForm = { title: '', description: '', priority: 'medium', dueDate: '' }

export default function TaskForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { items, status } = useSelector((state) => state.todos)
  const currentTodo = editing ? items.find((todo) => String(todo.id) === id) : undefined
  const [form, setForm] = useState(emptyForm)
  const [validationError, setValidationError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (editing && currentTodo) {
      setForm({
        title: currentTodo.title || '',
        description: currentTodo.description || '',
        priority: currentTodo.priority || 'medium',
        dueDate: currentTodo.dueDate || '',
      })
    }
  }, [editing, currentTodo])

  function updateField(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setValidationError('')
    setSubmitError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const title = form.title.trim()
    if (title.length < 3 || title.length > 100) {
      setValidationError('Tên công việc phải có từ 3 đến 100 ký tự.')
      return
    }
    if (form.description.length > 500) {
      setValidationError('Mô tả không được vượt quá 500 ký tự.')
      return
    }

    setSubmitting(true)
    try {
      const payload = { ...form, title, description: form.description.trim() }
      if (editing) {
        await dispatch(updateTodo({ id: currentTodo.id, changes: payload })).unwrap()
      } else {
        await dispatch(addTodo(payload)).unwrap()
      }
      navigate('/tasks')
    } catch (error) {
      setSubmitError(error.message || 'Lưu công việc thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  if (editing && status === 'loading') return <div className="empty-state">Đang tải công việc...</div>
  if (editing && !currentTodo) {
    return <div className="empty-state">Không tìm thấy công việc này. <Link to="/tasks">Quay lại danh sách</Link></div>
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">QUẢN LÝ CÔNG VIỆC / {editing ? 'CHỈNH SỬA' : 'TẠO MỚI'}</div>
          <h1>{editing ? 'Chỉnh sửa công việc' : 'Thêm công việc mới'}</h1>
          <p>{editing ? 'Cập nhật kế hoạch của bạn.' : 'Ghi lại việc cần làm để không bỏ sót điều quan trọng.'}</p>
        </div>
      </div>

      <div className="form-panel">
        <div className="form-panel-header">
          <span className="form-header-icon">✎</span>
          <div><h2>Thông tin công việc</h2><p>Nhập các nội dung cần quản lý</p></div>
        </div>
        <Form onSubmit={handleSubmit} noValidate>
          {(validationError || submitError) && <Alert variant="danger" role="alert">{validationError || submitError}</Alert>}
          <div className="mb-4">
            <label className="form-label" htmlFor="title">Tên công việc <span className="text-danger">*</span></label>
            <Form.Control id="title" name="title" size="lg" value={form.title} onChange={updateField} placeholder="Ví dụ: Hoàn thành bài tập ReactJS" maxLength={100} required />
            <div className="helper-text">Bắt buộc từ 3–100 ký tự</div>
          </div>
          <div className="mb-4">
            <label className="form-label" htmlFor="description">Mô tả</label>
            <Form.Control as="textarea" id="description" name="description" rows={4} value={form.description} onChange={updateField} placeholder="Ghi chú chi tiết về công việc..." maxLength={500} />
            <div className="helper-text">Tối đa 500 ký tự</div>
          </div>
          <div className="row g-4 mb-4">
            <div className="col-md-6">
              <label className="form-label" htmlFor="priority">Độ ưu tiên</label>
              <Form.Select id="priority" name="priority" value={form.priority} onChange={updateField}>
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
              </Form.Select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="dueDate">Hạn hoàn thành</label>
              <Form.Control id="dueDate" name="dueDate" type="date" value={form.dueDate} onChange={updateField} />
            </div>
          </div>
          <div className="form-actions">
            <Link to="/tasks" className="btn btn-outline-secondary px-4">Hủy</Link>
            <Button type="submit" className="btn-brand px-4" disabled={submitting}>
              {submitting ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : '+ Thêm công việc'}
            </Button>
          </div>
        </Form>
      </div>
    </>
  )
}
