import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import todoApi from '../../api/todoApi'

const initialState = {
  items: [],
  loaded: false,
  status: 'idle',
  error: null,
}

export const fetchTodos = createAsyncThunk('todos/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await todoApi.get('/todos')
    return data
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Không thể tải công việc.')
  }
}, {
  condition: (_, { getState }) => {
    const { loaded, status } = getState().todos
    return !loaded && status !== 'loading'
  },
})

export const addTodo = createAsyncThunk('todos/add', async (draft, { rejectWithValue }) => {
  try {
    const { data } = await todoApi.post('/todos', { ...draft, completed: false })
    return data
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Thêm công việc thất bại.')
  }
})

export const importTodos = createAsyncThunk('todos/import', async (tasks, { rejectWithValue }) => {
  try {
    const { data } = await todoApi.post('/todos/import', { tasks })
    return data
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Nhập dữ liệu thất bại.')
  }
})

export const updateTodo = createAsyncThunk('todos/update', async ({ id, changes }, { rejectWithValue }) => {
  try {
    const { data } = await todoApi.patch(`/todos/${id}`, changes)
    return { id, changes: data.task || data, nextTask: data.nextTask || null }
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Cập nhật công việc thất bại.')
  }
})

export const deleteTodo = createAsyncThunk('todos/delete', async (id, { rejectWithValue }) => {
  try {
    await todoApi.delete(`/todos/${id}`)
    return id
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Xóa công việc thất bại.')
  }
})

const todosSlice = createSlice({
  name: 'todos',
  initialState,
  reducers: {
    clearTodoError(state) {
      state.error = null
    },
    resetTodos(state) {
      state.items = []
      state.loaded = false
      state.status = 'idle'
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodos.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchTodos.fulfilled, (state, action) => {
        state.items = action.payload
        state.status = 'succeeded'
        state.loaded = true
      })
      .addCase(fetchTodos.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Không thể tải công việc.'
      })
      .addCase(addTodo.fulfilled, (state, action) => {
        state.items.unshift(action.payload)
        state.loaded = true
        state.error = null
      })
      .addCase(updateTodo.fulfilled, (state, action) => {
        const todo = state.items.find((item) => item.id === action.payload.id)
        if (todo) Object.assign(todo, action.payload.changes)
        if (action.payload.nextTask) state.items.unshift(action.payload.nextTask)
        state.error = null
      })
      .addCase(importTodos.fulfilled, (state, action) => {
        state.items = [...action.payload, ...state.items]
        state.loaded = true
        state.error = null
      })
      .addCase(deleteTodo.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload)
        state.error = null
      })
      .addMatcher(
        (action) =>
          ['todos/add/rejected', 'todos/import/rejected', 'todos/update/rejected', 'todos/delete/rejected'].includes(action.type),
        (state, action) => {
          state.error = action.payload || 'Thao tác không thành công.'
        },
      )
  },
})

export const { clearTodoError, resetTodos } = todosSlice.actions
export default todosSlice.reducer
