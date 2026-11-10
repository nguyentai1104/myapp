import { useEffect, useState } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, useNavigate } from 'react-router'
import { clearAuthError, fetchCurrentUser, loginUser, registerUser } from '../features/auth/authSlice'

const initialForm = {
  name: '',
  email: '',
  password: '',
}

export default function LoginPage() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(initialForm)
  const [submitError, setSubmitError] = useState('')
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { token, user, status, error } = useSelector((state) => state.auth)

  useEffect(() => {
    if (token && !user) {
      dispatch(fetchCurrentUser())
    }
  }, [dispatch, token, user])

  useEffect(() => {
    if (error) setSubmitError(error)
  }, [error])

  if (token && user) {
    return <Navigate to="/" replace />
  }

  function updateField(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setSubmitError('')
    if (error) dispatch(clearAuthError())
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
    }

    if (mode === 'register' && payload.name.length < 2) {
      setSubmitError('Họ tên phải từ 2 ký tự.')
      return
    }

    if (!payload.email || !payload.password) {
      setSubmitError('Vui lòng nhập email và mật khẩu.')
      return
    }

    try {
      const action = mode === 'login'
        ? await dispatch(loginUser({ email: payload.email, password: payload.password })).unwrap()
        : await dispatch(registerUser(payload)).unwrap()

      if (action?.token) {
        navigate('/')
      }
    } catch (err) {
      setSubmitError(err || 'Xử lý thất bại.')
    }
  }

  const isBusy = status === 'loading'

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand auth-brand">
            <span className="brand-icon">✓</span>
            <span>MyTasks<span className="brand-dot">.</span></span>
          </div>
          <div className="auth-switch">
            <button type="button" className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}>Đăng nhập</button>
            <button type="button" className={mode === 'register' ? 'selected' : ''} onClick={() => setMode('register')}>Đăng ký</button>
          </div>
        </div>

        <h1>{mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}</h1>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Đăng nhập để tiếp tục quản lý công việc.'
            : 'Đăng ký tài khoản để lưu nhật ký công việc riêng tư.'}
        </p>

        <Form onSubmit={handleSubmit} className="auth-form" noValidate>
          {(submitError || error) && <Alert variant="danger">{submitError || error}</Alert>}

          {mode === 'register' && (
            <Form.Group className="mb-3">
              <Form.Label>Họ và tên</Form.Label>
              <Form.Control
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="Nguyễn Văn A"
                maxLength={80}
              />
            </Form.Group>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={form.email}
              onChange={updateField}
              placeholder="demo@mytasks.com"
              autoComplete="email"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Mật khẩu</Form.Label>
            <Form.Control
              type="password"
              name="password"
              value={form.password}
              onChange={updateField}
              placeholder="Ít nhất 6 ký tự"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </Form.Group>

          <Button type="submit" className="btn-brand auth-submit" disabled={isBusy}>
            {isBusy ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </Button>
        </Form>

        <div className="demo-account">
          <strong>Tài khoản demo:</strong>
          <span>demo@mytasks.com / demo123</span>
        </div>
      </div>
    </div>
  )
}
