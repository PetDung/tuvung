# AgriTrace - Luồng Truy Xuất Nông Sản

## Tổ Quan Luồng

```
Farmer tạo sản phẩm        → status: Registered
Inspector duyệt            → status: Inspected + Tạo QR với signature
Retailer yêu cầu          → Tạo Shipment (status: Pending)
Distributor nhận đơn       → Shipment: distributor_id = user
Distributor bắt đầu giao  → Quét QR → Verify signature → Tạo signature mới → QR mới
                            → Shipment: status: InTransit
Distributor xác nhận giao → Quét QR → Verify signature → Tạo signature mới → QR mới
                            → Shipment: status: Delivered
Retailer xác nhận bán      → Quét QR → Verify signature → Tạo trace URL
                            → Product: status: Sold
```

## Chi Tiết Từng Bước

### 1. Farmer Tạo Sản Phẩm
- `POST /api/products` với: name, category, quantity, unit, farm_id, harvest_date
- Product `status = 'Registered'`
- Chưa có QR, chưa có signature

### 2. Inspector Duyệt Sản Phẩm
- `POST /api/products/:id/approve` (Inspector gọi)
- **Tạo signature:**
  ```json
  {
    "product_id": "uuid",
    "action": "APPROVED",
    "actor_id": "inspector_uuid",
    "timestamp": "ISO8601",
    "location": "địa điểm kiểm duyệt",
    "hash": "sha256(data)"
  }
  ```
- **Tạo QR URL:**
  ```
  {FRONTEND_URL}/trace/{product_id}?sig={base64_signature}
  ```
- Cập nhật: `product.status = 'Inspected'`
- Lưu: `current_signature`, `qr_code`
- Ghi: `used_signatures`, `shipment_events`

### 3. Retailer Yêu Cầu Shipment
- `POST /api/shipments` với: product_id, quantity, from_location, to_location
- Tạo shipment: `status = 'Pending'`, `distributor_id = NULL`
- QR hiện tại lấy từ product

### 4. Distributor Nhận Đơn
- `PUT /api/shipments/:id/accept`
- Cập nhật: `distributor_id = user.id`
- Shipment vẫn `status = 'Pending'` (chờ bắt đầu giao)

### 5. Distributor Bắt Đầu Giao (Quét QR)
- `PUT /api/scan/shipping` với body:
  ```json
  {
    "product_id": "uuid",
    "location": "địa điểm bắt đầu",
    "transport_type": "xe tải",
    "vehicle_plate": "biển số"
  }
  ```
- **Server xử lý:**
  1. Tìm shipment: `product_id` + `distributor_id` + `status = 'Pending'`
  2. **Verify signature** trong QR:
     - Decode base64 → parse JSON
     - Recalculate hash → so sánh
     - Check chưa used trong `used_signatures`
  3. **Mark signature used** vào bảng `used_signatures`
  4. **Cập nhật shipment:**
     - `status = 'InTransit'`
     - `departure_time = now()`
     - `transport_type`, `vehicle_plate`
  5. **Tạo signature mới** (action: `SHIPPED`)
  6. **Tạo QR mới** với signature mới
  7. Ghi `shipment_events`
  8. Sync blockchain
  9. Return: `{ shipment, new_qr_url, new_signature }`

### 6. Distributor Xác Nhận Đã Giao (Quét QR)
- `PUT /api/scan/delivered` với body:
  ```json
  {
    "product_id": "uuid",
    "arrival_location": "địa điểm giao"
  }
  ```
- **Server xử lý:**
  1. Tìm shipment: `product_id` + `distributor_id` + `status = 'InTransit'`
  2. **Verify signature** (SHIPPED signature)
  3. Mark signature used
  4. **Cập nhật shipment:**
     - `status = 'Delivered'`
     - `arrival_time = now()`
  5. **Tạo signature mới** (action: `DELIVERED`)
  6. **Tạo QR mới**
  7. Ghi `shipment_events`
  8. Sync blockchain
  9. Return: `{ shipment, new_qr_url, new_signature }`

### 7. Retailer Xác Nhận Đã Bán (Quét QR)
- `PUT /api/scan/sold` với body:
  ```json
  {
    "product_id": "uuid",
    "sold_location": "cửa hàng"
  }
  ```
- **Server xử lý:**
  1. Tìm shipment: `product_id` + `to_retailer_id` + `status = 'Delivered'`
  2. **Verify signature** (DELIVERED signature)
  3. Mark signature used
  4. **Cập nhật product:**
     - `status = 'Sold'`
  5. **Tạo signature mới** (action: `SOLD`)
  6. **QR cuối cùng** → Trace URL:
     ```
     {FRONTEND_URL}/trace/{product_id}?sig={signature}&history=1
     ```
  7. Ghi `shipment_events`
  8. Sync blockchain
  9. Return: `{ product, trace_url, signature }`

## Database Schema (bổ sung)

### Bảng `used_signatures`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| product_id | UUID | FK → products.id |
| signature | TEXT | Chữ ký đã dùng (base64) |
| action | VARCHAR | APPROVED, SHIPPED, DELIVERED, SOLD |
| actor_id | UUID | User thực hiện |
| location | VARCHAR | Địa điểm |
| prev_hash | VARCHAR | Hash signature trước |
| metadata | JSONB | Extra info |
| used_at | TIMESTAMP | |

### Bảng `shipment_events`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| shipment_id | UUID | FK → shipments.id |
| product_id | UUID | FK → products.id |
| action | VARCHAR | ACCEPTED, SHIPPING, DELIVERED, SOLD |
| actor_id | UUID | User thực hiện |
| signature | TEXT | Signature tại thời điểm đó |
| location | VARCHAR | Địa điểm |
| metadata | JSONB | Extra info |
| bc_tx_id | VARCHAR | Blockchain tx ID |
| created_at | TIMESTAMP | |

### Bảng `products` (bổ sung)
| Column | Type | Description |
|--------|------|-------------|
| current_signature | TEXT | Signature hiện tại |
| qr_code | TEXT | URL QR hiện tại |

### Bảng `shipments` (bổ sung)
| Column | Type | Description |
|--------|------|-------------|
| current_signature | TEXT | Signature hiện tại |
| qr_code | TEXT | URL QR hiện tại |
| from_user_id | UUID | Farmer ID |

## Chữ Ký Số

### Tạo Signature
```
payload = {
  product_id,
  action,           // APPROVED | SHIPPED | DELIVERED | SOLD
  actor_id,
  timestamp,        // ISO8601
  location,
  prev_hash,        // hash từ signature trước
  metadata
}
data_string = JSON.stringify(payload)
hash = SHA256(data_string + SECRET)
signature = BASE64({...payload, hash})
```

### Verify Signature
```
1. Decode base64 → parse JSON
2. Tách payload.hash
3. Recreate hash từ payload (không có hash) + SECRET
4. So sánh hashes
5. Check NOT IN used_signatures table
```

## API Endpoints

### Products
- `POST /api/products` - Farmer tạo sản phẩm
- `POST /api/products/:id/approve` - Inspector duyệt → tạo signature + QR
- `GET /api/products/:id/trace` - Lấy lịch sử

### Shipments
- `POST /api/shipments` - Retailer tạo yêu cầu
- `GET /api/shipments` - Distributor: pending + của tôi
- `GET /api/shipments/pending` - Chưa ai nhận
- `PUT /api/shipments/:id/accept` - Distributor nhận đơn

### Scan Endpoints (QR)
- `PUT /api/scan/shipping` - Bắt đầu giao
  - Body: `{ product_id, location, transport_type?, vehicle_plate? }`
  - Response: `{ shipment, new_qr_url, new_signature }`
  
- `PUT /api/scan/delivered` - Xác nhận đã giao
  - Body: `{ product_id, arrival_location }`
  - Response: `{ shipment, new_qr_url, new_signature }`
  
- `PUT /api/scan/sold` - Xác nhận đã bán
  - Body: `{ product_id, sold_location }`
  - Response: `{ product, trace_url, signature }`

## Frontend Pages

### Distributor - /dashboard/shipments
- **Yêu cầu đặt hàng**: shipments `status=Pending, distributor_id=NULL`
  → Nút "Nhận đơn"
- **Đơn đã nhận**: shipments `status=Pending, distributor_id=user`
  → Nút "Quét giao hàng" → Mở QR scanner → Gọi /scan/shipping
- **Đang vận chuyển**: shipments `status=InTransit, distributor_id=user`
  → Nút "Quét đã giao" → Mở QR scanner → Gọi /scan/delivered
- **Đã giao thành công**: shipments `status=Delivered`

### Retailer - /dashboard/retailer-products
- Danh sách shipment đã giao (`status=Delivered, to_retailer_id=user`)
  → Nút "Quét bán" → Gọi /scan/sold

### Trace - /trace/:productId (Public)
- QR cuối cùng trỏ về đây
- Hiển thị lịch sử từ shipment_events + blockchain
