# MyTasks - To-Do List (đúng 7 yêu cầu bắt buộc)

Ứng dụng ReactJS quản lý công việc: tổng quan, xem danh sách, thêm, sửa, xóa, đánh dấu hoàn thành, xem chi tiết, tìm kiếm, lọc và sắp xếp.

## 1. Cách chạy trên Windows / VS Code

**Yêu cầu:** Node.js bản mới đáp ứng Vite 8 (nên dùng Node.js 22.12+).

1. Giải nén thư mục `todo-list-7-diem`.
2. Trong VS Code, `File > Open Folder...` rồi chọn thư mục trên.
3. Mở `Terminal > New Terminal`.
4. Nhập lần lượt:

   ```bash
   npm install
   npm run dev
   ```

5. Mở đường dẫn do Vite hiện trong terminal (thường là `http://localhost:5173`).

Để thử bản production:

```bash
npm run build
npm run preview
```

> Nếu có lỗi về phiên bản Node.js, hãy nâng cấp Node.js và chạy lại `npm install`.

## 2. Đối chiếu 7 điểm bắt buộc

| Điểm | Yêu cầu | File/vị trí |
|---|---|---|
| 1 | Vite | `vite.config.js`, `package.json` |
| 2 | ReactJS mới | `package.json`, `src/main.jsx` |
| 3 | React UI Library (React-Bootstrap) | `src/pages/TaskForm.jsx`, `src/pages/TaskList.jsx`, `src/components/AppLayout.jsx` (`Form`, `Button`, `Alert`) |
| 4 | React Router | `src/App.jsx`, `src/components/AppLayout.jsx` |
| 5 | Axios gọi API | `src/api/todoApi.js`, `src/features/todos/todosSlice.js` |
| 6 | `VITE_API_URL` trong `.env` | `.env`, `src/api/todoApi.js` |
| 7 | Redux quản lý shared state | `src/app/store.js`, `src/features/todos/todosSlice.js`, `src/main.jsx` |

Ba mục cộng điểm backend + database + JWT chưa làm theo yêu cầu.

## 3. Cấu trúc folder

```text
todo-list-7-diem/
├── .env                    # VITE_API_URL
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx           # Provider + BrowserRouter
    ├── App.jsx            # Cấu hình các Route
    ├── styles.css         # Giao diện riêng + Bootstrap
    ├── api/todoApi.js     # Axios instance
    ├── app/store.js       # Redux store
    ├── features/todos/todosSlice.js
    ├── components/
    │   ├── AppLayout.jsx
    │   └── TaskCard.jsx
    └── pages/
        ├── Dashboard.jsx
        ├── TaskList.jsx
        ├── TaskForm.jsx
        └── TaskDetail.jsx
```

## 4. Cách app hoạt động

- Lần đầu mở: `GET /todos?userId=1` qua Axios để tải 20 dữ liệu mẫu.
- Thêm: `POST /todos` qua Axios, cập nhật Redux.
- Sửa: `PATCH /todos/:id` đối với công việc từ API, cập nhật Redux.
- Xóa: `DELETE /todos/:id` đối với công việc từ API, cập nhật Redux.
- `useSelector` đọc danh sách từ store để cập nhật ở mọi trang.
- `store.subscribe` lưu danh sách Redux vào localStorage để không mất khi F5.

**LƯU Ý:** JSONPlaceholder là API giả lập: `POST/PATCH/DELETE` được phản hồi thành công nhưng **không ghi vào server**. Đối với công việc mới có ID `local-*`, lần sửa/xóa sau đó chỉ cập nhật Redux/localStorage. Mọi dữ liệu được lưu riêng trên trình duyệt, không đồng bộ qua máy khác. Không có backend và database riêng; đây là chủ đích để chỉ làm 7 yêu cầu bắt buộc.

## 5. Các bước kiểm tra khi nộp bài

1. Chạy `npm run dev` và xem trang `/`.
2. Trang `/tasks`: thấy dữ liệu từ API, tìm kiếm, lọc theo hoàn thành/chưa hoàn thành.
3. Vào `/tasks/new`, thêm công việc, quay lại danh sách.
4. Chỉnh sửa, đánh dấu hoàn thành và xóa công việc.
5. Vào `/completed` để xem những việc đã xong.
6. Bấm F5: dữ liệu vừa thay đổi vẫn còn do localStorage.
7. Mở DevTools > Network: xem các request Axios.
8. Mở Redux DevTools (nếu có): kiểm tra `todos.items` và các action.

## 6. Ghi chú về phiên bản

`package.json` chỉ định React 19.3+, React Router 8.5+, Vite 8.3+ và plugin React 6.1+ để bám bản stable mới tại 27/10/2026. `npm install` dùng dải `^` để lấy bản tương thích mới nhất trong cùng major. Để chốt phiên bản chính xác khi nộp, giữ file `package-lock.json` do `npm install` tạo ra.

Nếu máy tính báo lỗi mạng khi `npm install`, kiểm tra kết nối đến registry.npmjs.org rồi thử lại. Dự án trong ZIP **không** kèm `node_modules`.
