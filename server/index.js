import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import sqlite3 from 'sqlite3'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createHash, randomBytes } from 'crypto'
import nodemailer from 'nodemailer'

const app = express()
const port = Number(process.env.PORT || 4000)
const jwtSecret = process.env.JWT_SECRET || 'mytasks-secret-key'
const dataDir = path.join(process.cwd(), 'server', 'data')
const dbPath = path.join(dataDir, 'mytasks.db')
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

fs.mkdirSync(dataDir, { recursive: true })

const db = new sqlite3.Database(dbPath)

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onRun(error) {
    if (error) return reject(error)
    resolve({ id: this.lastID, changes: this.changes })
  })
})

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (error, row) => {
    if (error) return reject(error)
    resolve(row)
  })
})

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (error, rows) => {
    if (error) return reject(error)
    resolve(rows)
  })
})

function issueToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn: '7d' })
}

function getMailTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  const configuredValues = [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS]
  if (configuredValues.every((value) => !value)) return null
  if (configuredValues.some((value) => !value)) {
    throw new Error('Cần cấu hình đầy đủ SMTP_HOST, SMTP_PORT, SMTP_USER và SMTP_PASS.')
  }

  const port = Number(SMTP_PORT)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT phải là số cổng hợp lệ.')
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

function hashResetToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function isValidDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ message: 'Không có token xác thực.' })
  }

  try {
    const decoded = jwt.verify(token, jwtSecret)
    req.user = { id: decoded.sub, email: decoded.email }
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' })
  }
}

function normalizeTask(row) {
  let tags = []
  try {
    tags = JSON.parse(row.tags || '[]')
  } catch (error) {
    console.error(`Invalid tags stored for task ${row.id}:`, error)
  }

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description || '',
    completed: Boolean(row.completed),
    priority: row.priority || 'medium',
    dueDate: row.due_date || '',
    category: row.category || '',
    tags: Array.isArray(tags) ? tags : [],
    repeatRule: row.repeat_rule || 'none',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function initDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      avatar TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const userColumns = await all('PRAGMA table_info(users)')
  if (!userColumns.some((column) => column.name === 'avatar')) {
    await run('ALTER TABLE users ADD COLUMN avatar TEXT')
  }

  await run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      category TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      repeat_rule TEXT NOT NULL DEFAULT 'none',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  const taskColumns = await all('PRAGMA table_info(tasks)')
  const existingColumns = new Set(taskColumns.map((column) => column.name))
  for (const [name, definition] of [
    ['category', "TEXT NOT NULL DEFAULT ''"],
    ['tags', "TEXT NOT NULL DEFAULT '[]'"],
    ['repeat_rule', "TEXT NOT NULL DEFAULT 'none'"],
  ]) {
    if (!existingColumns.has(name)) {
      await run(`ALTER TABLE tasks ADD COLUMN ${name} ${definition}`)
    }
  }

  await run(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  const demoUser = await get('SELECT * FROM users WHERE email = ?', ['demo@mytasks.com'])
  if (!demoUser) {
    const passwordHash = bcrypt.hashSync('demo123', 10)
    const created = await run('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', ['Demo User', 'demo@mytasks.com', passwordHash])

    await run(
      `INSERT INTO tasks (user_id, title, description, completed, priority, due_date) VALUES
      (?, 'Lập kế hoạch tuần', 'Chia nhỏ nhiệm vụ và chuẩn bị agenda cho tuần mới.', 0, 'high', '2026-11-15'),
      (?, 'Hoàn thành bài tập React', 'Xác nhận các component và Redux state đã hoạt động.', 1, 'medium', '2026-11-10'),
      (?, 'Rà soát email công việc', 'Phản hồi các tin nhắn và lọc các nhiệm vụ quan trọng.', 0, 'low', '2026-11-12')`,
      [created.id, created.id, created.id],
    )
  }
}

app.use(cors({
  origin: [
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/,
    'https://your-frontend.vercel.app',
  ],
  credentials: true
}))
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'MyTasks API is running' })
})

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {}

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ họ tên, email và mật khẩu.' })
  }

  if (String(name).trim().length < 2) {
    return res.status(400).json({ message: 'Họ tên phải dài ít nhất 2 ký tự.' })
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự.' })
  }

  const normalizedEmail = String(email).trim().toLowerCase()

  try {
    const existing = await get('SELECT id FROM users WHERE email = ?', [normalizedEmail])
    if (existing) {
      return res.status(409).json({ message: 'Email này đã được đăng ký.' })
    }

    const passwordHash = bcrypt.hashSync(String(password), 10)
    const created = await run('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [String(name).trim(), normalizedEmail, passwordHash])
    const user = { id: created.id, name: String(name).trim(), email: normalizedEmail, avatar: null }

    res.status(201).json({
      token: issueToken(user),
      user,
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: 'Đăng ký thất bại.' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu.' })
  }

  const normalizedEmail = String(email).trim().toLowerCase()

  try {
    const user = await get('SELECT * FROM users WHERE email = ?', [normalizedEmail])
    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' })
    }

    const matches = bcrypt.compareSync(String(password), user.password_hash)
    if (!matches) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' })
    }

    const safeUser = { id: user.id, name: user.name, email: user.email, avatar: user.avatar || null }
    return res.json({
      token: issueToken(safeUser),
      user: safeUser,
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Đăng nhập thất bại.' })
  }
})

app.post('/api/auth/forgot-password', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Vui lòng nhập địa chỉ email hợp lệ.' })
  }

  let mailTransport
  try {
    mailTransport = getMailTransport()
  } catch (error) {
    console.error('Password reset SMTP configuration error:', error)
    return res.status(500).json({ message: 'Cấu hình gửi email không hợp lệ.' })
  }

  if (!mailTransport && process.env.NODE_ENV === 'production') {
    return res.status(503).json({ message: 'Chức năng gửi email chưa được cấu hình.' })
  }

  try {
    const user = await get('SELECT id, email FROM users WHERE email = ?', [email])
    if (!user) {
      return res.json({ message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi đến bạn.' })
    }

    const token = randomBytes(32).toString('hex')
    const tokenHash = hashResetToken(token)
    const resetUrl = new URL('/reset-password', frontendUrl)
    resetUrl.searchParams.set('token', token)

    await run('DELETE FROM password_reset_tokens WHERE user_id = ?', [user.id])
    await run(
      "INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 minutes'))",
      [tokenHash, user.id],
    )

    if (mailTransport) {
      try {
        await mailTransport.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: user.email,
          subject: 'Đặt lại mật khẩu MyTasks',
          text: `Mở liên kết sau để đặt lại mật khẩu (liên kết có hiệu lực trong 30 phút):\n${resetUrl.toString()}`,
          html: `<p>Nhấn vào liên kết sau để đặt lại mật khẩu. Liên kết có hiệu lực trong 30 phút.</p><p><a href="${resetUrl.toString()}">Đặt lại mật khẩu</a></p>`,
        })
      } catch (error) {
        await run('DELETE FROM password_reset_tokens WHERE token_hash = ?', [tokenHash])
        console.error('Send password reset email error:', error)
        return res.status(503).json({ message: 'Không thể gửi email lúc này. Vui lòng thử lại sau.' })
      }
    } else {
      console.info(`Password reset link for ${user.email}: ${resetUrl.toString()}`)
    }

    return res.json({ message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi đến bạn.' })
  } catch (error) {
    console.error('Forgot password error:', error)
    return res.status(500).json({ message: 'Không thể xử lý yêu cầu đặt lại mật khẩu.' })
  }
})

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body || {}
  if (typeof token !== 'string' || !token || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'Liên kết không hợp lệ hoặc mật khẩu có ít nhất 6 ký tự.' })
  }

  const tokenHash = hashResetToken(token)
  const passwordHash = bcrypt.hashSync(password, 10)

  try {
    await run('BEGIN IMMEDIATE')
    const reset = await get(
      "SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP",
      [tokenHash],
    )
    if (!reset) {
      await run('ROLLBACK')
      return res.status(400).json({ message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' })
    }

    const consumed = await run(
      "UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token_hash = ? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP",
      [tokenHash],
    )
    if (consumed.changes !== 1) {
      await run('ROLLBACK')
      return res.status(400).json({ message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' })
    }

    await run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, reset.user_id])
    await run('COMMIT')
    return res.json({ message: 'Mật khẩu đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.' })
  } catch (error) {
    await run('ROLLBACK')
    console.error('Reset password error:', error)
    return res.status(500).json({ message: 'Không thể cập nhật mật khẩu.' })
  }
})

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await get('SELECT id, name, email, avatar FROM users WHERE id = ?', [req.user.id])
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại.' })
    }
    res.json({ user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar || null } })
  } catch (error) {
    console.error('Get current user error:', error)
    res.status(500).json({ message: 'Không thể lấy thông tin người dùng.' })
  }
})

app.patch('/api/auth/profile', authMiddleware, async (req, res) => {
  if (req.body?.name !== undefined && typeof req.body.name !== 'string') {
    return res.status(400).json({ message: 'Họ tên không hợp lệ.' })
  }
  const name = req.body?.name === undefined ? undefined : req.body.name.trim()
  const avatar = req.body?.avatar
  if (name !== undefined && (name.length < 2 || name.length > 80)) {
    return res.status(400).json({ message: 'Họ tên phải có từ 2 đến 80 ký tự.' })
  }
  if (avatar !== undefined && avatar !== null) {
    const match = typeof avatar === 'string' && avatar.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/)
    if (!match) {
      return res.status(400).json({ message: 'Ảnh đại diện phải là PNG, JPEG hoặc WebP hợp lệ.' })
    }

    const imageBytes = Buffer.from(match[2], 'base64')
    if (imageBytes.length > 1024 * 1024 || imageBytes.toString('base64') !== match[2]) {
      return res.status(400).json({ message: 'Ảnh đại diện tối đa 1 MB hoặc dữ liệu ảnh không hợp lệ.' })
    }
    const isPng = match[1] === 'png' && imageBytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    const isJpeg = match[1] === 'jpeg' && imageBytes[0] === 255 && imageBytes[1] === 216 && imageBytes[2] === 255
    const isWebp = match[1] === 'webp' && imageBytes.toString('ascii', 0, 4) === 'RIFF' && imageBytes.toString('ascii', 8, 12) === 'WEBP'
    if (!isPng && !isJpeg && !isWebp) {
      return res.status(400).json({ message: 'Nội dung tệp không khớp với định dạng ảnh.' })
    }
  }

  try {
    const updates = []
    const values = []
    if (name !== undefined) {
      updates.push('name = ?')
      values.push(name)
    }
    if (avatar !== undefined) {
      updates.push('avatar = ?')
      values.push(avatar)
    }
    if (!updates.length) {
      return res.status(400).json({ message: 'Không có thông tin hồ sơ cần cập nhật.' })
    }
    await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, [...values, req.user.id])
    const user = await get('SELECT id, name, email, avatar FROM users WHERE id = ?', [req.user.id])
    return res.json({ user })
  } catch (error) {
    console.error('Update profile error:', error)
    return res.status(500).json({ message: 'Không thể cập nhật hồ sơ.' })
  }
})

app.patch('/api/auth/password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ message: 'Nhập mật khẩu hiện tại và mật khẩu mới có ít nhất 6 ký tự.' })
  }

  try {
    const user = await get('SELECT password_hash FROM users WHERE id = ?', [req.user.id])
    if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' })
    }

    await run('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(newPassword, 10), req.user.id])
    await run('DELETE FROM password_reset_tokens WHERE user_id = ?', [req.user.id])
    return res.json({ message: 'Đã đổi mật khẩu thành công.' })
  } catch (error) {
    console.error('Change password error:', error)
    return res.status(500).json({ message: 'Không thể đổi mật khẩu.' })
  }
})

app.get('/api/todos', authMiddleware, async (req, res) => {
  try {
    const rows = await all('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC', [req.user.id])
    res.json(rows.map(normalizeTask))
  } catch (error) {
    console.error('List tasks error:', error)
    res.status(500).json({ message: 'Không thể tải danh sách công việc.' })
  }
})

app.post('/api/todos', authMiddleware, async (req, res) => {
  const { title, description, priority, dueDate, completed, category, tags, repeatRule } = req.body || {}

  if (!title || String(title).trim().length < 3) {
    return res.status(400).json({ message: 'Tên công việc phải có ít nhất 3 ký tự.' })
  }
  if (category !== undefined && (typeof category !== 'string' || category.trim().length > 40)) {
    return res.status(400).json({ message: 'Danh mục không được vượt quá 40 ký tự.' })
  }
  if (tags !== undefined && (!Array.isArray(tags) || tags.length > 10 || tags.some((tag) => typeof tag !== 'string' || tag.trim().length > 24))) {
    return res.status(400).json({ message: 'Tối đa 10 nhãn, mỗi nhãn không quá 24 ký tự.' })
  }
  if (!['none', 'daily', 'weekly', 'monthly'].includes(repeatRule || 'none')) {
    return res.status(400).json({ message: 'Chu kỳ lặp không hợp lệ.' })
  }
  if (!['low', 'medium', 'high'].includes(priority || 'medium')) {
    return res.status(400).json({ message: 'Độ ưu tiên không hợp lệ.' })
  }
  if (dueDate && !isValidDateOnly(dueDate)) {
    return res.status(400).json({ message: 'Hạn hoàn thành không hợp lệ.' })
  }

  try {
    const created = await run(
      'INSERT INTO tasks (user_id, title, description, completed, priority, due_date, category, tags, repeat_rule, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [
        req.user.id,
        String(title).trim(),
        description || '',
        Boolean(completed) ? 1 : 0,
        priority || 'medium',
        dueDate || '',
        String(category || '').trim(),
        JSON.stringify((tags || []).map((tag) => tag.trim()).filter(Boolean)),
        repeatRule || 'none',
      ],
    )

    const row = await get('SELECT * FROM tasks WHERE id = ?', [created.id])
    res.status(201).json(normalizeTask(row))
  } catch (error) {
    console.error('Create task error:', error)
    res.status(500).json({ message: 'Không thể lưu công việc mới.' })
  }
})

app.post('/api/todos/import', authMiddleware, async (req, res) => {
  const importedTasks = req.body?.tasks
  if (!Array.isArray(importedTasks) || importedTasks.length > 500) {
    return res.status(400).json({ message: 'Tệp sao lưu phải chứa tối đa 500 công việc.' })
  }

  const validPriorities = ['low', 'medium', 'high']
  const validRepeats = ['none', 'daily', 'weekly', 'monthly']
  const tasks = []
  for (const task of importedTasks) {
    if (!task || typeof task.title !== 'string' || task.title.trim().length < 3 || task.title.trim().length > 100) {
      return res.status(400).json({ message: 'Tệp sao lưu có công việc với tên không hợp lệ.' })
    }
    if (typeof (task.description || '') !== 'string' || (task.description || '').length > 500) {
      return res.status(400).json({ message: `Mô tả của "${task.title}" không hợp lệ.` })
    }
    if (task.completed !== undefined && typeof task.completed !== 'boolean') {
      return res.status(400).json({ message: `Trạng thái của "${task.title}" không hợp lệ.` })
    }
    if (task.dueDate !== undefined && task.dueDate !== '' && !isValidDateOnly(task.dueDate)) {
      return res.status(400).json({ message: `Hạn hoàn thành của "${task.title}" không hợp lệ.` })
    }
    if (task.tags !== undefined && (!Array.isArray(task.tags) || task.tags.length > 10 || task.tags.some((tag) => typeof tag !== 'string' || tag.trim().length > 24))) {
      return res.status(400).json({ message: `Nhãn của "${task.title}" không hợp lệ.` })
    }
    if (task.category !== undefined && (typeof task.category !== 'string' || task.category.trim().length > 40)) {
      return res.status(400).json({ message: `Danh mục của "${task.title}" không hợp lệ.` })
    }
    if (!validPriorities.includes(task.priority || 'medium') || !validRepeats.includes(task.repeatRule || 'none')) {
      return res.status(400).json({ message: `Độ ưu tiên hoặc chu kỳ lặp của "${task.title}" không hợp lệ.` })
    }
    tasks.push(task)
  }

  try {
    await run('BEGIN IMMEDIATE')
    const createdTasks = []
    for (const task of tasks) {
      const created = await run(
        'INSERT INTO tasks (user_id, title, description, completed, priority, due_date, category, tags, repeat_rule, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [
          req.user.id,
          task.title.trim(),
          (task.description || '').trim(),
          task.completed ? 1 : 0,
          task.priority || 'medium',
          task.dueDate || '',
          (task.category || '').trim(),
          JSON.stringify((task.tags || []).map((tag) => tag.trim()).filter(Boolean)),
          task.repeatRule || 'none',
        ],
      )
      createdTasks.push(normalizeTask(await get('SELECT * FROM tasks WHERE id = ?', [created.id])))
    }
    await run('COMMIT')
    return res.status(201).json(createdTasks)
  } catch (error) {
    await run('ROLLBACK')
    console.error('Import tasks error:', error)
    return res.status(500).json({ message: 'Không thể nhập dữ liệu.' })
  }
})

app.patch('/api/todos/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  const allowedFields = ['title', 'description', 'completed', 'priority', 'dueDate', 'category', 'tags', 'repeatRule']
  const updates = {}

  for (const key of allowedFields) {
    if (key in req.body) {
      updates[key] = req.body[key]
    }
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({ message: 'Không có dữ liệu cập nhật.' })
  }

  if (updates.title !== undefined && String(updates.title).trim().length < 3) {
    return res.status(400).json({ message: 'Tên công việc phải có ít nhất 3 ký tự.' })
  }
  if (updates.category !== undefined && (typeof updates.category !== 'string' || updates.category.trim().length > 40)) {
    return res.status(400).json({ message: 'Danh mục không được vượt quá 40 ký tự.' })
  }
  if (updates.tags !== undefined && (!Array.isArray(updates.tags) || updates.tags.length > 10 || updates.tags.some((tag) => typeof tag !== 'string' || tag.trim().length > 24))) {
    return res.status(400).json({ message: 'Tối đa 10 nhãn, mỗi nhãn không quá 24 ký tự.' })
  }
  if (updates.repeatRule !== undefined && !['none', 'daily', 'weekly', 'monthly'].includes(updates.repeatRule)) {
    return res.status(400).json({ message: 'Chu kỳ lặp không hợp lệ.' })
  }
  if (updates.priority !== undefined && !['low', 'medium', 'high'].includes(updates.priority)) {
    return res.status(400).json({ message: 'Độ ưu tiên không hợp lệ.' })
  }
  if (updates.dueDate !== undefined && updates.dueDate !== '' && !isValidDateOnly(updates.dueDate)) {
    return res.status(400).json({ message: 'Hạn hoàn thành không hợp lệ.' })
  }

  try {
    await run('BEGIN IMMEDIATE')
    const existing = await get('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.id])
    if (!existing) {
      await run('ROLLBACK')
      return res.status(404).json({ message: 'Công việc không tồn tại.' })
    }

    const fields = []
    const values = []

    if (updates.title !== undefined) {
      fields.push('title = ?')
      values.push(String(updates.title).trim())
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description || '')
    }
    if (updates.completed !== undefined) {
      fields.push('completed = ?')
      values.push(Boolean(updates.completed) ? 1 : 0)
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?')
      values.push(updates.priority || 'medium')
    }
    if (updates.dueDate !== undefined) {
      fields.push('due_date = ?')
      values.push(updates.dueDate || '')
    }
    if (updates.category !== undefined) {
      fields.push('category = ?')
      values.push(updates.category.trim())
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?')
      values.push(JSON.stringify(updates.tags.map((tag) => tag.trim()).filter(Boolean)))
    }
    if (updates.repeatRule !== undefined) {
      fields.push('repeat_rule = ?')
      values.push(updates.repeatRule)
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')

    await run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, [...values, Number(id), req.user.id])

    const row = await get('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.id])
    let nextTask = null
    if (!existing.completed && updates.completed === true && existing.repeat_rule && existing.repeat_rule !== 'none') {
      const baseDate = existing.due_date || new Date().toISOString().slice(0, 10)
      const [year, month, day] = baseDate.split('-').map(Number)
      const nextDate = new Date(Date.UTC(year, month - 1, day))
      if (existing.repeat_rule === 'daily') nextDate.setUTCDate(nextDate.getUTCDate() + 1)
      if (existing.repeat_rule === 'weekly') nextDate.setUTCDate(nextDate.getUTCDate() + 7)
      if (existing.repeat_rule === 'monthly') {
        const targetMonth = nextDate.getUTCMonth() + 1
        nextDate.setUTCDate(1)
        nextDate.setUTCMonth(targetMonth)
        const lastDay = new Date(Date.UTC(nextDate.getUTCFullYear(), nextDate.getUTCMonth() + 1, 0)).getUTCDate()
        nextDate.setUTCDate(Math.min(day, lastDay))
      }
      const nextDueDate = nextDate.toISOString().slice(0, 10)
      const created = await run(
        'INSERT INTO tasks (user_id, title, description, completed, priority, due_date, category, tags, repeat_rule, updated_at) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [req.user.id, existing.title, existing.description || '', existing.priority, nextDueDate, existing.category || '', existing.tags || '[]', existing.repeat_rule],
      )
      nextTask = normalizeTask(await get('SELECT * FROM tasks WHERE id = ?', [created.id]))
    }
    await run('COMMIT')
    return res.json({ task: normalizeTask(row), nextTask })
  } catch (error) {
    await run('ROLLBACK')
    console.error('Update task error:', error)
    return res.status(500).json({ message: 'Không thể cập nhật công việc.' })
  }
})

app.delete('/api/todos/:id', authMiddleware, async (req, res) => {
  const { id } = req.params

  try {
    const existing = await get('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.id])
    if (!existing) {
      return res.status(404).json({ message: 'Công việc không tồn tại.' })
    }

    await run('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.id])
    res.json({ success: true, id: Number(id) })
  } catch (error) {
    console.error('Delete task error:', error)
    res.status(500).json({ message: 'Không thể xóa công việc.' })
  }
})

await initDatabase()

app.listen(port, () => {
  console.log(`MyTasks API running on http://localhost:${port}`)
})
