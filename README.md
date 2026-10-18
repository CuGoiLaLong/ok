# PhyLab Pro - Phòng Thí Nghiệm Vật Lý Ảo

Nền tảng mô phỏng thí nghiệm vật lý và lý sinh tương tác cao cấp với 6 phòng thực hành chuyên sâu (Con lắc đơn & lò xo, Chuyển động ném, Quang hình học khúc xạ & thấu kính, Mạch dao động RLC & Cộng hưởng, Chuyển động Brown & Khuếch tán phân tử, Giao thoa sóng cơ học 2D/3D).

---

## 🚀 Hướng Dẫn Khắc Phục Màn Hình Trắng Khi Đưa Lên GitHub Pages

### 🔍 Nguyên nhân gây ra màn hình trắng:
1. **Đường dẫn assets tuyệt đối (`/assets/...`)**: Mặc định Vite biên dịch với đường dẫn gốc `/`, khi đẩy lên `https://<username>.github.io/<ten-repo>/`, trình duyệt sẽ tìm file JS/CSS ở `https://<username>.github.io/assets/...` (thiếu tên repo) dẫn đến lỗi **404 Not Found**, không tải được React khiến màn hình chỉ hiện màu trắng.
   - 👉 **Đã khắc phục:** Đã cấu hình `base: './'` trong `vite.config.ts`. Bây giờ assets dùng đường dẫn tương đối (`./assets/...`), chạy hoàn hảo ở mọi sub-path hoặc custom domain.
2. **Chưa build mã nguồn trước khi deploy**: Trình duyệt không thể chạy trực tiếp file TypeScript/TSX trong thư mục `src/`. Cần build ra thư mục `dist/` hoặc dùng GitHub Actions tự động build.
3. **Bọc ErrorBoundary an toàn**: Đã thêm `ErrorBoundary` để nếu có lỗi runtime thì hiển thị thông báo tiếng Việt kèm nút tải lại trang thay vì màn hình trắng.

---

### 🛠️ 2 Cách Đưa Lên GitHub Pages Thành Công 100%:

#### Cách 1: Tự động qua GitHub Actions (Khuyên dùng - Đơn giản nhất)
File workflow tự động `.github/workflows/deploy.yml` đã được tạo sẵn trong dự án:
1. Đẩy toàn bộ source code lên GitHub repository của bạn:
   ```bash
   git add .
   git commit -m "Deploy PhyLab Pro"
   git push origin main
   ```
2. Trên giao diện GitHub của repository:
   - Vào mục **Settings** -> **Pages** (ở cột bên trái).
   - Tại mục **Build and deployment** -> **Source**, chọn: **GitHub Actions**.
3. GitHub Actions sẽ tự động chạy build và phát hành trang web lên `https://<username>.github.io/<repo>/` chỉ sau 1-2 phút!

---

#### Cách 2: Tự build trước rồi đẩy thư mục `dist`
1. Chạy lệnh build ở máy tính của bạn:
   ```bash
   npm run build
   ```
2. Thư mục `dist/` sẽ được tạo ra chứa đầy đủ `index.html` và các tệp JS/CSS tĩnh.
3. Bạn có thể:
   - Cài đặt `gh-pages`: `npx gh-pages -d dist`
   - Hoặc copy các file trong thư mục `dist/` đưa lên nhánh `gh-pages` hoặc thư mục phục vụ của GitHub.

---

## ⚡ Triển Khai Lên Vercel (Khắc Phục Lỗi `npm error Conflicting peer dependency: esbuild`)

Nếu bạn deploy qua Vercel, lỗi xảy ra do trình quản lý gói `npm` trên Vercel kiểm tra nghiêm ngặt xung đột phiên bản phụ thuộc (peer dependency).
Đã xử lý hoàn toàn cho bạn:
1. Đã tạo `.npmrc` với `legacy-peer-deps=true`.
2. Đã tạo `vercel.json` với cấu hình build chuẩn Vite (`npm install --legacy-peer-deps`).
3. Đã gỡ bỏ khai báo xung đột `esbuild` dư thừa trong `devDependencies`.

👉 **Cách deploy lại trên Vercel:**
- Chỉ cần ấn nút **Redeploy** trên Vercel hoặc commit đẩy lên GitHub là Vercel sẽ tự động cài đặt và triển khai thành công 100%!


---

## 🧪 Các Thí Nghiệm Trong Ứng Dụng:
1. **Con lắc đơn & Con lắc lò xo:** Đo chu kỳ dao động điều hòa $T = 2\pi\sqrt{l/g}$, thế năng & động năng, lực cản môi trường.
2. **Chuyển động ném nòng pháo:** Quỹ đạo parabol, góc bắn tối ưu 45°, lực cản không khí, mô phỏng Vector vận tốc & gia tốc tức thời.
3. **Quang hình học & Khúc xạ:** Định luật Snell $n_1 \sin(i) = n_2 \sin(r)$, góc phản xạ toàn phần, thấu kính hội tụ & phân kỳ.
4. **Mạch điện RLC & Dao động xoay chiều:** Hiện tượng cộng hưởng $\omega_0 = 1/\sqrt{LC}$, giản đồ vector Fresnel, dao động tắt dần.
5. **Chuyển động Brown & Khuếch tán:** Định luật Einstein-Smoluchowski, bình phương dịch chuyển trung bình (MSD), số Avogadro.
6. **Giao thoa sóng cơ học:** Hai nguồn kết hợp, vân cực đại & cực tiểu, mặt cắt biên độ sóng và đồ thị 3D Wireframe.
