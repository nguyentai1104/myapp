# MyTasks - To-Do List

Ứng dụng quản lý công việc với React, Redux, Express, SQLite và JWT: tổng quan, danh sách/lịch, thêm, sửa, xóa, đánh dấu hoàn thành, công việc lặp lại, danh mục/nhãn, nhắc hạn, hồ sơ, đổi/khôi phục mật khẩu và sao lưu dữ liệu.

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

### Đặt lại mật khẩu

Trang đăng nhập có liên kết **Quên mật khẩu?**. API phát hành liên kết đặt lại dùng một lần, hết hạn sau 30 phút. Để gửi email thật, cấu hình các biến môi trường sau cho tiến trình backend:

```env
FRONTEND_URL=http://localhost:5173
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=MyTasks <no-reply@example.com>
```

Đặt các giá trị trên trong `.env.local` (đã được Git bỏ qua) hoặc cấu hình trực tiếp cho tiến trình backend; tránh lưu thông tin SMTP trong `.env` được theo dõi bởi Git. `SMTP_FROM` là tùy chọn (mặc định dùng `SMTP_USER`); `SMTP_SECURE` mặc định bật cho cổng 465. Khi chạy phát triển mà chưa cấu hình SMTP, liên kết đặt lại chỉ được in trong terminal chạy API. Môi trường production yêu cầu cấu hình SMTP và sẽ không phát hành liên kết qua log.

### Tính năng quản lý

- Tạo công việc theo chu kỳ ngày/tuần/tháng; khi hoàn tất, ứng dụng tạo công việc tiếp theo và giữ lại mục đã hoàn thành.
- Thêm danh mục và tối đa 10 nhãn; tìm kiếm theo tên, mô tả, danh mục hoặc nhãn, lọc theo danh mục.
- Mục **Lịch** hiển thị công việc theo ngày đến hạn.
- Mục **Tài khoản** cho phép đổi tên, tải ảnh đại diện PNG/JPEG/WebP tối đa 1 MB, đổi mật khẩu, tải bản sao lưu JSON, xuất CSV và nhập JSON (tối đa 500 việc mỗi lần; dữ liệu được thêm vào danh sách hiện có).
- Chuông nhắc việc hiển thị các mục quá hạn, đến hạn hôm nay và trong 3 ngày tới.

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
