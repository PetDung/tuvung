# Tài khoản kiểm thử - AgriTrace

## Cách sử dụng

```bash
# 1. Xóa toàn bộ data cũ
npm run clean

# 2. Tạo tài khoản mới
npm run seed

# 3. Khởi động backend
npm run dev
```

## Danh sách tài khoản

| Role        | Email                        | Mật khẩu       | Ghi chú                  |
|-------------|------------------------------|----------------|--------------------------|
| **Admin**   | admin@agritrace.vn           | admin123       | Quản trị toàn hệ thống  |
| **Farmer**  | farmer@agritrace.vn          | farmer123      | Tạo sản phẩm nông trại  |
| **Distributor** | distributor@agritrace.vn  | distributor123 | Vận chuyển sản phẩm     |
| **Retailer**| retailer@agritrace.vn        | retailer123    | Nhận & bán sản phẩm     |
| **Consumer**| consumer@agritrace.vn        | consumer123    | Xem truy xuất nguồn gốc  |
| **Inspector**| inspector@agritrace.vn       | inspector123   | Kiểm định chất lượng     |

## Các bước test flow sản phẩm

```
Farmer → Tạo sản phẩm → Inspector → Kiểm định
→ Distributor → Tạo lô hàng gửi Retailer
→ Distributor → Giao hàng (Delivered)
→ Retailer → Nhận hàng
→ Retailer → Đánh dấu Đã bán ✓
→ Consumer → Quét QR truy xuất nguồn gốc
```

## Tài khoản Blockchain Gateway

Gateway chạy trên port **4000**.

Kiểm tra trạng thái:
```bash
curl http://localhost:4000/api/health
```
