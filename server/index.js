import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import sqlite3 from 'sqlite3'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const app = express()
const port = Number(process.env.PORT || 4000)
const jwtSecret = process.env.JWT_SECRET || 'mytasks-secret-key'
const dataDir = path.join(process.cwd(), 'server', 'data')
const dbPath = path.join(dataDir, 'mytasks.db')

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
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description || '',
    completed: Boolean(row.completed),
    priority: row.priority || 'medium',
    dueDate: row.due_date || '',
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
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
app.use(express.json())

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
    const user = { id: created.id, name: String(name).trim(), email: normalizedEmail }

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

    const safeUser = { id: user.id, name: user.name, email: user.email }
    return res.json({
      token: issueToken(safeUser),
      user: safeUser,
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Đăng nhập thất bại.' })
  }
})

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await get('SELECT id, name, email FROM users WHERE id = ?', [req.user.id])
    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại.' })
    }
    res.json({ user: { id: user.id, name: user.name, email: user.email } })
  } catch (error) {
    console.error('Get current user error:', error)
    res.status(500).json({ message: 'Không thể lấy thông tin người dùng.' })
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
  const { title, description, priority, dueDate, completed } = req.body || {}

  if (!title || String(title).trim().length < 3) {
    return res.status(400).json({ message: 'Tên công việc phải có ít nhất 3 ký tự.' })
  }

  try {
    const created = await run(
      'INSERT INTO tasks (user_id, title, description, completed, priority, due_date, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [
        req.user.id,
        String(title).trim(),
        description || '',
        Boolean(completed) ? 1 : 0,
        priority || 'medium',
        dueDate || '',
      ],
    )

    const row = await get('SELECT * FROM tasks WHERE id = ?', [created.id])
    res.status(201).json(normalizeTask(row))
  } catch (error) {
    console.error('Create task error:', error)
    res.status(500).json({ message: 'Không thể lưu công việc mới.' })
  }
})

app.patch('/api/todos/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  const existing = await get('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.id])

  if (!existing) {
    return res.status(404).json({ message: 'Công việc không tồn tại.' })
  }

  const allowedFields = ['title', 'description', 'completed', 'priority', 'dueDate']
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

  try {
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

    fields.push('updated_at = CURRENT_TIMESTAMP')

    await run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, [...values, Number(id), req.user.id])

    const row = await get('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.id])
    res.json(normalizeTask(row))
  } catch (error) {
    console.error('Update task error:', error)
    res.status(500).json({ message: 'Không thể cập nhật công việc.' })
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
