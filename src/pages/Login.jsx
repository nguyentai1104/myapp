import { useEffect, useState } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, useNavigate } from 'react-router'
import todoApi from '../api/todoApi'
import { clearAuthError, fetchCurrentUser, loginUser, registerUser } from '../features/auth/authSlice'

const initialForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
}

export default function LoginPage({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState(initialForm)
  const [submitError, setSubmitError] = useState('')
  const [submitMessage, setSubmitMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  if (token && user && mode !== 'reset') {
    return <Navigate to="/" replace />
  }

  function updateField(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setSubmitError('')
    setSubmitMessage('')
    if (error) dispatch(clearAuthError())
  }

  function changeMode(nextMode) {
    setMode(nextMode)
    setSubmitError('')
    setSubmitMessage('')
    if (error) dispatch(clearAuthError())
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')
    setSubmitMessage('')

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
    }

    if (mode === 'forgot') {
      if (!payload.email) {
        setSubmitError('Vui lòng nhập email đã đăng ký.')
        return
      }

      setIsSubmitting(true)
      try {
        const { data } = await todoApi.post('/auth/forgot-password', { email: payload.email })
        setSubmitMessage(data.message)
      } catch (requestError) {
        setSubmitError(requestError.response?.data?.message || 'Không thể gửi yêu cầu đặt lại mật khẩu.')
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    if (mode === 'reset') {
      const token = new URLSearchParams(window.location.search).get('token')
      if (!token) {
        setSubmitError('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.')
        return
      }
      if (payload.password.length < 6) {
        setSubmitError('Mật khẩu phải có ít nhất 6 ký tự.')
        return
      }
      if (payload.password !== form.confirmPassword) {
        setSubmitError('Mật khẩu xác nhận không khớp.')
        return
      }

      setIsSubmitting(true)
      try {
        const { data } = await todoApi.post('/auth/reset-password', { token, password: payload.password })
        setSubmitMessage(data.message)
        setForm(initialForm)
        setMode('login')
        navigate('/login', { replace: true })
      } catch (requestError) {
        setSubmitError(requestError.response?.data?.message || 'Không thể đặt lại mật khẩu.')
      } finally {
        setIsSubmitting(false)
      }
      return
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

  const isBusy = status === 'loading' || isSubmitting
  const heading = {
    login: 'Chào mừng trở lại',
    register: 'Tạo tài khoản mới',
    forgot: 'Quên mật khẩu?',
    reset: 'Đặt lại mật khẩu',
  }[mode]

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand auth-brand">
            <span className="brand-icon">✓</span>
            <span>MyTasks<span className="brand-dot">.</span></span>
          </div>
          {(mode === 'login' || mode === 'register') && (
            <div className="auth-switch">
              <button type="button" className={mode === 'login' ? 'selected' : ''} onClick={() => changeMode('login')}>Đăng nhập</button>
              <button type="button" className={mode === 'register' ? 'selected' : ''} onClick={() => changeMode('register')}>Đăng ký</button>
            </div>
          )}
        </div>

        <h1>{heading}</h1>
        <p className="auth-subtitle">
          {mode === 'login' && 'Đăng nhập để tiếp tục quản lý công việc.'}
          {mode === 'register' && 'Đăng ký tài khoản để lưu nhật ký công việc riêng tư.'}
          {mode === 'forgot' && 'Nhập email đã đăng ký. Nếu tài khoản tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi đến bạn.'}
          {mode === 'reset' && 'Chọn mật khẩu mới có ít nhất 6 ký tự cho tài khoản của bạn.'}
        </p>

        <Form onSubmit={handleSubmit} className="auth-form" noValidate>
          {(submitError || error) && <Alert variant="danger">{submitError || error}</Alert>}
          {submitMessage && <Alert variant="success">{submitMessage}</Alert>}

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

          {mode !== 'reset' && (
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
          )}

          {mode === 'login' || mode === 'register' || mode === 'reset' ? (
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
          ) : null}

          {mode === 'reset' && (
            <Form.Group className="mb-3">
              <Form.Label>Xác nhận mật khẩu</Form.Label>
              <Form.Control
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={updateField}
                placeholder="Nhập lại mật khẩu mới"
                autoComplete="new-password"
              />
            </Form.Group>
          )}

          {mode === 'login' && (
            <div className="auth-extra-link">
              <button type="button" onClick={() => changeMode('forgot')}>
                Quên mật khẩu?
              </button>
            </div>
          )}

          <Button type="submit" className="btn-brand auth-submit" disabled={isBusy}>
            {isBusy ? 'Đang xử lý...' : {
              login: 'Đăng nhập',
              register: 'Tạo tài khoản',
              forgot: 'Gửi liên kết đặt lại',
              reset: 'Lưu mật khẩu mới',
            }[mode]}
          </Button>
        </Form>

        {(mode === 'forgot' || mode === 'reset') && (
          <div className="auth-extra-link auth-back-link">
            <button type="button" onClick={() => { changeMode('login'); navigate('/login') }}>
              Quay lại đăng nhập
            </button>
          </div>
        )}

        {mode === 'login' && (
          <div className="demo-account">
            <strong>Tài khoản demo:</strong>
            <span>demo@mytasks.com / demo123</span>
          </div>
        )}
      </div>
    </div>
  )
}
