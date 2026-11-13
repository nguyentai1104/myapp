import { useRef, useState } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import { importTodos } from '../features/todos/todosSlice'
import { updateProfile } from '../features/auth/authSlice'
import todoApi from '../api/todoApi'

function downloadFile(contents, filename, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function toCsv(tasks) {
  const columns = ['title', 'description', 'completed', 'priority', 'dueDate', 'category', 'tags', 'repeatRule']
  const escape = (value) => {
    const text = String(value ?? '')
    const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text
    return `"${safeText.replaceAll('"', '""')}"`
  }
  return [columns.map(escape).join(','), ...tasks.map((task) => columns.map((column) => escape(Array.isArray(task[column]) ? task[column].join('; ') : task[column])).join(','))].join('\r\n')
}

export default function Account() {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const { items, loaded, status } = useSelector((state) => state.todos)
  const fileInput = useRef(null)
  const [name, setName] = useState(user?.name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function saveProfile(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await dispatch(updateProfile({ name })).unwrap()
      setMessage('Hồ sơ đã được cập nhật.')
    } catch (requestError) {
      setError(requestError)
    } finally {
      setBusy(false)
    }
  }

  async function changePassword(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }
    setBusy(true)
    try {
      const { data } = await todoApi.patch('/auth/password', { currentPassword, newPassword })
      setMessage(data.message)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể đổi mật khẩu.')
    } finally {
      setBusy(false)
    }
  }

  function exportJson() {
    const backup = { format: 'mytasks-backup', version: 1, exportedAt: new Date().toISOString(), tasks: items }
    downloadFile(JSON.stringify(backup, null, 2), 'mytasks-backup.json', 'application/json')
  }

  function exportCsv() {
    downloadFile(`\uFEFF${toCsv(items)}`, 'mytasks-tasks.csv', 'text/csv;charset=utf-8')
  }

  async function importJson(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    setMessage('')
    setBusy(true)
    try {
      const backup = JSON.parse(await file.text())
      const tasks = Array.isArray(backup) ? backup : backup?.tasks
      if (!Array.isArray(tasks)) throw new Error('Tệp JSON không có danh sách công việc hợp lệ.')
      const action = await dispatch(importTodos(tasks))
      if (importTodos.fulfilled.match(action)) {
        setMessage(`Đã nhập ${action.payload.length} công việc.`)
      } else {
        throw new Error(action.payload || 'Không thể nhập dữ liệu.')
      }
    } catch (importError) {
      setError(importError.message || 'Không đọc được tệp sao lưu.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-heading">
        <div><div className="eyebrow">CÀI ĐẶT</div><h1>Tài khoản & dữ liệu</h1><p>Cập nhật hồ sơ, bảo vệ tài khoản và sao lưu công việc.</p></div>
      </div>
      {(message || error) && <Alert variant={error ? 'danger' : 'success'}>{error || message}</Alert>}
      <div className="account-grid">
        <section className="form-panel account-panel">
          <div className="form-panel-header"><span className="form-header-icon">◎</span><div><h2>Hồ sơ</h2><p>{user?.email}</p></div></div>
          <Form onSubmit={saveProfile}>
            <Form.Group className="mb-3"><Form.Label htmlFor="account-name">Họ và tên</Form.Label><Form.Control id="account-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required /></Form.Group>
            <Button className="btn-brand" type="submit" disabled={busy}>Lưu hồ sơ</Button>
          </Form>
        </section>
        <section className="form-panel account-panel">
          <div className="form-panel-header"><span className="form-header-icon">⌑</span><div><h2>Đổi mật khẩu</h2><p>Dùng mật khẩu mới có ít nhất 6 ký tự.</p></div></div>
          <Form onSubmit={changePassword}>
            <Form.Group className="mb-3"><Form.Label htmlFor="current-password">Mật khẩu hiện tại</Form.Label><Form.Control id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></Form.Group>
            <Form.Group className="mb-3"><Form.Label htmlFor="new-password">Mật khẩu mới</Form.Label><Form.Control id="new-password" type="password" autoComplete="new-password" minLength={6} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></Form.Group>
            <Form.Group className="mb-3"><Form.Label htmlFor="confirm-password">Xác nhận mật khẩu mới</Form.Label><Form.Control id="confirm-password" type="password" autoComplete="new-password" minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></Form.Group>
            <Button className="btn-brand" type="submit" disabled={busy}>Đổi mật khẩu</Button>
          </Form>
        </section>
        <section className="form-panel account-panel account-data">
          <div className="form-panel-header"><span className="form-header-icon">⇅</span><div><h2>Sao lưu dữ liệu</h2><p>{items.length} công việc trong tài khoản</p></div></div>
          <div className="account-actions">
            <Button variant="outline-primary" onClick={exportJson} disabled={!loaded || busy}>Tải bản sao lưu JSON</Button>
            <Button variant="outline-primary" onClick={exportCsv} disabled={!loaded || busy}>Xuất bảng CSV</Button>
            <Button variant="outline-secondary" onClick={() => fileInput.current?.click()} disabled={!loaded || busy}>Nhập bản sao lưu JSON</Button>
            <Form.Control ref={fileInput} type="file" accept=".json,application/json" className="visually-hidden" onChange={importJson} />
          </div>
          <p className="helper-text">{status === 'loading' || !loaded ? 'Đang tải công việc để chuẩn bị sao lưu...' : 'Bản sao lưu JSON có thể nhập lại. Nhập sẽ thêm công việc vào danh sách hiện tại, không xóa dữ liệu đang có (tối đa 500 công việc mỗi lần).'}</p>
        </section>
      </div>
    </>
  )
}
