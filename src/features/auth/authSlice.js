import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import todoApi, { setAuthToken } from '../../api/todoApi'

const STORAGE_KEY = 'mytasks-auth-token'

const tokenFromStorage = localStorage.getItem(STORAGE_KEY)
setAuthToken(tokenFromStorage)

export const fetchCurrentUser = createAsyncThunk('auth/fetchCurrentUser', async (_, { rejectWithValue }) => {
  try {
    const { data } = await todoApi.get('/auth/me')
    return data.user
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Phiên đăng nhập hết hạn.')
  }
})

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await todoApi.post('/auth/login', credentials)
    localStorage.setItem(STORAGE_KEY, data.token)
    setAuthToken(data.token)
    return data
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Đăng nhập thất bại.')
  }
})

export const registerUser = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await todoApi.post('/auth/register', payload)
    localStorage.setItem(STORAGE_KEY, data.token)
    setAuthToken(data.token)
    return data
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Đăng ký thất bại.')
  }
})

export const updateProfile = createAsyncThunk('auth/updateProfile', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await todoApi.patch('/auth/profile', payload)
    return data.user
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Cập nhật hồ sơ thất bại.')
  }
})

const initialState = {
  token: tokenFromStorage || null,
  user: null,
  status: tokenFromStorage ? 'loading' : 'idle',
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.token = null
      state.user = null
      state.status = 'idle'
      state.error = null
      localStorage.removeItem(STORAGE_KEY)
      setAuthToken(null)
    },
    clearAuthError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.token = action.payload.token
        state.user = action.payload.user
        state.status = 'succeeded'
        state.error = null
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Đăng nhập thất bại.'
      })
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.token = action.payload.token
        state.user = action.payload.user
        state.status = 'succeeded'
        state.error = null
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Đăng ký thất bại.'
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload
        state.status = 'succeeded'
        state.error = null
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || 'Phiên đăng nhập hết hạn.'
        state.token = null
        state.user = null
        localStorage.removeItem(STORAGE_KEY)
        setAuthToken(null)
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload
      })
  },
})

export const { logout, clearAuthError } = authSlice.actions
export default authSlice.reducer
