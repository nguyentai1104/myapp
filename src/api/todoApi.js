import axios from 'axios'

const todoApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 10000,
})

export function setAuthToken(token) {
  if (token) {
    todoApi.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete todoApi.defaults.headers.common.Authorization
  }
}

export default todoApi
