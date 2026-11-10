# MyTasks - To-Do List

Ứng dụng quản lý công việc với React, Redux, Express, SQLite và JWT: tổng quan, xem danh sách, thêm, sửa, xóa, đánh dấu hoàn thành, xem chi tiết, tìm kiếm, lọc và sắp xếp.

## 1. Cách chạy trên Windows / VS Code

**Yêu cầu:** Node.js bản mới đáp ứng Vite 8 (nên dùng Node.js 22.12+).

1. Giải nén thư mục `todo-list-7-diem`.
2. Trong VS Code, `File > Open Folder...` rồi chọn thư mục trên.
3. Mở `Terminal > New Terminal`.
4. Cài dependencies và chạy cả frontend lẫn backend:

   ```bash
   npm install
   npm run dev
   ```

5. Mở `http://localhost:5173`. Lệnh `npm run dev` khởi động Vite và API server cùng lúc; giữ terminal chạy khi sử dụng ứng dụng.

API mặc định chạy tại `http://localhost:4000`; URL frontend được cấu hình trong `.env` qua `VITE_API_URL`. Nếu chạy riêng từng phần, dùng hai terminal:

```bash
npm run server
npm run dev
```

> Nếu có lỗi về phiên bản Node.js, hãy nâng cấp Node.js và chạy lại `npm install`.

Để thử bản production của frontend:

```bash
npm run build
npm run preview
```

Tài khoản demo được tạo tự động khi API khởi động lần đầu: `demo@mytasks.com` / `demo123`.

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

- Frontend gọi REST API qua Axios với URL `VITE_API_URL`.
- Người dùng đăng ký/đăng nhập; JWT được gửi trong header `Authorization`.
- API dùng SQLite để lưu tài khoản và công việc; công việc được giới hạn theo người dùng đã xác thực.
- Redux Toolkit quản lý trạng thái công việc và cập nhật giao diện sau các thao tác CRUD.
- API có endpoint kiểm tra trạng thái `GET /api/health`.

## 5. Các bước kiểm tra khi nộp bài

1. Chạy `npm run dev` và mở `http://localhost:5173`.
2. Đăng nhập bằng tài khoản demo hoặc tạo tài khoản mới; nếu gặp `ERR_CONNECTION_REFUSED` ở cổng 4000, kiểm tra API server đã được khởi động.
3. Trang `/tasks`: xem dữ liệu từ API, tìm kiếm, lọc theo hoàn thành/chưa hoàn thành.
4. Vào `/tasks/new`, thêm công việc, quay lại danh sách.
5. Chỉnh sửa, đánh dấu hoàn thành và xóa công việc.
6. Vào `/completed` để xem những việc đã xong.
7. Mở DevTools > Network để xem các request Axios; Redux DevTools (nếu có) để kiểm tra `todos.items` và các action.

## 6. Ghi chú về phiên bản

`package.json` chỉ định React 19.3+, React Router 8.5+, Vite 8.3+ và plugin React 6.1+ để bám bản stable mới tại 27/10/2026. `npm install` dùng dải `^` để lấy bản tương thích mới nhất trong cùng major. Để chốt phiên bản chính xác khi nộp, giữ file `package-lock.json` do `npm install` tạo ra.

Nếu máy tính báo lỗi mạng khi `npm install`, kiểm tra kết nối đến registry.npmjs.org rồi thử lại. Dự án trong ZIP **không** kèm `node_modules`.
