# Chi Tiết Đánh Giá: chaincode.go

**File:** `block-chain-net/smart-contract/chaincode/chaincode.go`
**Lines:** 541
**Date:** May 2026

---

## 1. Imports & Dependencies (Dòng 1-9)

```go
import (
    "encoding/json"
    "fmt"
    "strings"

    "github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)
```

| Tiêu chí | Status | Chi tiết |
|----------|--------|----------|
| Minimal imports | ✅ Tốt | Chỉ import những gì cần |
| Standard library | ✅ Đủ | json, fmt, strings |
| Fabric API | ✅ Đúng | v2 contractapi |

---

## 2. Constants & Validation (Dòng 11-47)

### 2.1 Status Constants
```go
const (
    StatusGrowing   = "Growing"
    StatusHarvested = "Harvested"
    StatusInTransit = "InTransit"
    StatusDelivered = "Delivered"
    StatusSold      = "Sold"
)
```
| Đánh giá | Chi tiết |
|----------|----------|
| ✅ Quy tắc đặt tên | camelCase, nhất quán |
| ✅ Clear values | Dễ đọc, không ambiguous |
| ✅ Exported | Có thể reuse ở backend |

### 2.2 ValidStatuses Map
```go
var validStatuses = map[string]bool{
    StatusGrowing:   true,
    StatusHarvested: true,
    StatusInTransit: true,
    StatusDelivered: true,
    StatusSold:      true,
}
```
| Đánh giá | Chi tiết |
|----------|----------|
| ✅ O(1) lookup | Hiệu quả hơn slice/array |
| ⚠️ Nên là const | `map[string]bool{}` không thể const |

### 2.3 Role Constants
```go
const (
    RoleFarmer      = "Farmer"
    RoleDistributor = "Distributor"
    RoleRetailer    = "Retailer"
    RoleInspector   = "Inspector"
)
```
| Đánh giá | Chi tiết |
|----------|----------|
| ✅ Nhất quán | Cùng format với Status |
| ⚠️ Thiếu validation | Không có `validRoles` map như Status |

### 2.4 Helper Functions

**sanitizeString (Dòng 36-39)**
```go
func sanitizeString(input string) string {
    return strings.ReplaceAll(strings.TrimSpace(input), `"`, `\"`)
}
```
| Tiêu chí | Status | Chi tiết |
|----------|--------|----------|
| Purpose | ✅ Rõ ràng | Comment mô tả mục đích |
| TrimSpace | ✅ Tốt | Loại bỏ whitespace |
| Escape quotes | ⚠️ Partial | Chỉ escape `"` thôi |

**validateStatus (Dòng 41-47)**
```go
func validateStatus(status string) error {
    if !validStatuses[status] {
        return fmt.Errorf("invalid status: %s (valid: Growing, Harvested, InTransit, Delivered, Sold)", status)
    }
    return nil
}
```
| Tiêu chí | Status | Chi tiết |
|----------|--------|----------|
| Error message | ✅ Chi tiết | Liệt kê các giá trị hợp lệ |
| Early return | ✅ Tốt | Return ngay khi invalid |

---

## 3. Data Models (Dòng 49-82)

### 3.1 Product Struct

```go
type Product struct {
    ID          string `json:"ID"`
    RefID       string `json:"RefID"`
    FarmID      string `json:"FarmID"`
    FarmName    string `json:"FarmName"`
    FarmerID    string `json:"FarmerID"`
    FarmerName  string `json:"FarmerName"`
    Status      string `json:"Status"`
    Certified   bool   `json:"Certified"`
    QRCode      string `json:"QRCode"`
    CurrentOwner string `json:"CurrentOwner"`
    CurrentRole string `json:"CurrentRole"`
    CreatedAt   string `json:"CreatedAt"`
    UpdatedAt   string `json:"UpdatedAt"`
}
```

| Tiêu chí | Status | Chi tiết |
|----------|--------|----------|
| JSON tags | ✅ Đúng | Consistent uppercase |
| Comments | ✅ Có | Mô tả mục đích |
| Types | ✅ Phù hợp | string/bool đúng context |
| ⚠️ Time fields | Nên dùng | `time.Time` thay vì string |

### 3.2 SupplyChainEvent Struct

```go
type SupplyChainEvent struct {
    ID          string `json:"ID"`
    ProductID   string `json:"ProductID"`
    EventType   string `json:"EventType"`
    ActorID     string `json:"ActorID"`
    ActorName   string `json:"ActorName"`
    ActorRole   string `json:"ActorRole"`
    Timestamp   string `json:"Timestamp"`
    Location    string `json:"Location"`
    PrevOwner   string `json:"PrevOwner"`
    NewOwner    string `json:"NewOwner"`
    Description string `json:"Description"`
    TxID        string `json:"TxID"`
}
```

| Tiêu chí | Status | Chi tiết |
|----------|--------|----------|
| Completeness | ✅ Tốt | Đủ thông tin cho traceability |
| Audit trail | ✅ Tốt | PrevOwner, NewOwner, TxID |

---

## 4. SmartContract Struct & InitLedger (Dòng 84-92)

```go
type SmartContract struct {
    contractapi.Contract
}

func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
    return nil
}
```

| Tiêu chí | Status | Chi tiết |
|----------|--------|----------|
| Embedding | ✅ Đúng | Embedded Contract interface |
| InitLedger | ⚠️ No-op | Chỉ return nil, không init gì |

---

## 5. CreateProduct (Dòng 94-155)

### Flow
1. Validate required fields (id, refID, farmerID, qrCode)
2. Validate status enum
3. Check duplicate
4. Create Product object
5. Marshal to JSON
6. PutState
7. Emit event

| Tiêu chí | Status | Chi tiết |
|----------|--------|----------|
| Input validation | ✅ Đầy đủ | Empty checks + status validation |
| Duplicate check | ✅ Có | ProductExists trước khi tạo |
| Read-before-write | ✅ Có | Check exists |
| Atomicity | ✅ Tốt | PutState + emitEvent cùng tx |
| Error wrapping | ✅ Tốt | Contextual error messages |

### Issues nhỏ
| Issue | Dòng | Chi tiết |
|-------|------|----------|
| ⚠️ farmerName not validated | 96 | Có thể empty |
| ⚠️ farmID/farmName not validated | 96 | Có thể empty |

---

## 6. ReadProduct (Dòng 157-172)

```go
func (s *SmartContract) ReadProduct(ctx contractapi.TransactionContextInterface, id string) (*Product, error) {
    productJSON, err := ctx.GetStub().GetState(id)
    // ... error handling ...
    var product Product
    if err := json.Unmarshal(productJSON, &product); err != nil {
        return nil, err
    }
    return &product, nil
}
```

| Tiêu chí | Status | Chi tiết |
|----------|--------|----------|
| Null check | ✅ Có | `productJSON == nil` |
| Pointer return | ✅ Tốt | Tránh copy |
| Error propagation | ✅ Tốt | Return error ngay |

---

## 7. UpdateProductStatus (Dòng 174-206)

### Flow
1. Validate status
2. Read product
3. Update fields
4. Marshal & PutState
5. Emit event

| Tiêu chí | Status | Chi tiết |
|----------|--------|----------|
| Status validation | ✅ Có | Gọi validateStatus |
| Read-before-write | ✅ Có | Đọc trước khi sửa |
| Event emission | ✅ Có | StatusChanged event |
| Error handling | ✅ Tốt | Tất cả errors được wrap |

### Issues
| Issue | Chi tiết |
|-------|----------|
| ⚠️ Không validate actor | Không kiểm tra ai gọi |
| ⚠️ Không check status transition | Growing→Sold hợp lệ? |

---

## 8. TransferProduct (Dòng 208-240)

### Flow
1. Read product
2. Save prevOwner/prevRole
3. Update owner info
4. Marshal & PutState
5. Emit transfer event

| Tiêu chí | Status | Chi tiết |
|----------|--------|----------|
| Owner tracking | ✅ Tốt | Lưu cả prevOwner/prevRole |
| Event data | ✅ Đầy đủ | From/To rõ ràng |
| Error handling | ✅ Tốt | Tất cả errors wrapped |

### Issues
| Issue | Chi tiết |
|-------|----------|
| ⚠️ newOwnerRole not validated | Nên validate enum |
| ⚠️ No ownership check | Ai cũng có thể transfer |
| ⚠️ No status check | Có thể transfer product đã Sold |

---

## 9. RecordInspection (Dòng 242-279)

```go
func (s *SmartContract) RecordInspection(ctx contractapi.TransactionContextInterface,
    eventID, productID, inspectorID, inspectorName, inspectorRole,
    timestamp, location, description string) error {
    // ...
}
```

| Tiêu chí | Status | Chi tiết |
|----------|--------|----------|
| Product check | ✅ Có | Đọc product trước |
| Event creation | ✅ Đúng | Inspected event type |
| TxID tracking | ✅ Có | Lưu blockchain TxID |
| Composite key | ✅ Đúng | `event:` prefix |

### Issues
| Issue | Chi tiết |
|-------|----------|
| ⚠️ inspectorRole not validated | Nên dùng Role constants |
| ⚠️ eventID passed in | Nên tự generate như emitEvent |
| ⚠️ No authorization | Không check ai là inspector |

---

## 10. RecordDelivery (Dòng 281-320)

```go
func (s *SmartContract) RecordDelivery(...) error {
    product, err := s.ReadProduct(ctx, productID)
    // ...
}
```

| Tiêu chí | Status | Chi tiết |
|----------|--------|----------|
| Product check | ✅ Có | Đọc product |
| Owner update | ❌ Thiếu | Đọc nhưng không update product.CurrentOwner |
| Event type | ✅ Đúng | Delivered |

### Critical Issue
```go
// product.CurrentOwner KHÔNG được update sau khi delivery!
// Chỉ có event được tạo, nhưng product state không đổi
PrevOwner: product.CurrentOwner,
NewOwner:  receiverID,
// ❌ Missing: product.CurrentOwner = receiverID
```

---

## 11. MarkAsCertified (Dòng 322-350)

```go
func (s *SmartContract) MarkAsCertified(ctx contractapi.TransactionContextInterface,
    productID, certifiedAt, certifierID, certifierName string) error {
    // ...
    product.Certified = true
    product.UpdatedAt = certifiedAt
    // ...
}
```

| Tiêu chí | Status | Chi tiết |
|----------|--------|----------|
| Field update | ✅ Có | Certified = true |
| Timestamp | ✅ Có | UpdatedAt |
| Event emission | ✅ Có | Certified event |

### Issues
| Issue | Chi tiết |
|-------|----------|
| ⚠️ certifierID not validated | Không check ai là certifier |
| ⚠️ Re-certify allowed | Có thể gọi nhiều lần |

---

## 12. GetProductHistory (Dòng 352-391)

```go
func (s *SmartContract) GetProductHistory(ctx contractapi.TransactionContextInterface, productID string) ([]SupplyChainEvent, error) {
    resultsIterator, err := ctx.GetStub().GetHistoryForKey(productID)
    defer resultsIterator.Close()
    // ...
}
```

| Tiêu chí | Status | Chi tiết |
|----------|--------|----------|
| Iterator cleanup | ✅ Có | defer Close() |
| Null value handling | ✅ Có | Handle deleted keys |
| ⚠️ Unmarshal error | ⚠️ | Continue thay vì return |
| ⚠️ Duplicate events | ⚠️ | Có thể có nhiều entry cho 1 tx |

---

## 13. GetSupplyChainEvents (Dòng 393-417)

```go
func (s *SmartContract) GetSupplyChainEvents(ctx contractapi.TransactionContextInterface, productID string) ([]SupplyChainEvent, error) {
    compositeKeyPrefix, _ := ctx.GetStub().CreateCompositeKey("event:", []string{productID, ""})
    // ⚠️ Error bị ignore!
}
```

### Issues
| Issue | Dòng | Chi tiết |
|-------|------|----------|
| ⚠️ Error swallowing | 395 | `compositeKeyPrefix, _ :=` |

---

## 14. Query Functions (Dòng 419-468)

### 14.1 GetProductsByFarmer
```go
query := fmt.Sprintf(`{"selector":{"FarmerID":"%s"}}`, sanitizeString(farmerID))
```

### 14.2 GetProductsByStatus
```go
if err := validateStatus(status); err != nil {
    return nil, err
}
query := fmt.Sprintf(`{"selector":{"Status":"%s"}}`, sanitizeString(status))
```

### 14.3 GetAllProducts
```go
query := `{"selector":{"_id":{"$gt":null}}}`
```
⚠️ **Hack** - Không nên dùng trong production

### 14.4 GetProductsByOwner
```go
query := fmt.Sprintf(`{"selector":{"CurrentOwner":"%s"}}`, sanitizeString(ownerID))
```

### 14.5 queryProducts (Private)
```go
func (s *SmartContract) queryProducts(ctx contractapi.TransactionContextInterface, query string) ([]*Product, error) {
    resultsIterator, err := ctx.GetStub().GetQueryResult(query)
    defer resultsIterator.Close()
    // ...
}
```

| Tiêu chí | Status | Chi tiết |
|----------|--------|----------|
| Iterator cleanup | ✅ Có | defer Close() |
| Input sanitization | ✅ Có | sanitizeString |
| Status validation | ✅ Có | GetProductsByStatus |
| ⚠️ Pagination | ❌ Thiếu | Không có limit |

---

## 15. ProductExists (Dòng 470-477)

```go
func (s *SmartContract) ProductExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
    productJSON, err := ctx.GetStub().GetState(id)
    if err != nil {
        return false, fmt.Errorf("failed to check product: %v", err)
    }
    return productJSON != nil, nil
}
```

| Đánh giá | Chi tiết |
|----------|----------|
| ✅ Tốt | Simple, clear, error handling đúng |

---

## 16. GenerateQRPayload (Dòng 479-502)

```go
func (s *SmartContract) GenerateQRPayload(ctx contractapi.TransactionContextInterface, productID string) (string, error) {
    qrPayload := struct {
        ID      string `json:"id"`
        RefID   string `json:"refId"`
        Farm    string `json:"farm"`
        Status  string `json:"status"`
        URL     string `json:"url"`
    }{
        ID:     product.ID,
        RefID:  product.RefID,
        Farm:   product.FarmName,
        Status: product.Status,
        URL:    fmt.Sprintf("https://agri.trace/v1/%s", product.RefID),
    }
    payloadBytes, _ := json.Marshal(qrPayload)
    return string(payloadBytes), nil
}
```

| Tiêu chí | Status | Chi tiết |
|----------|--------|----------|
| Anonymous struct | ⚠️ | Nên định nghĩa type riêng |
| ⚠️ URL hardcoded | ⚠️ | `https://agri.trace` nên là constant |
| ⚠️ Error ignored | 500 | `payloadBytes, _` |

---

## 17. emitEvent (Dòng 504-540)

```go
func (s *SmartContract) emitEvent(ctx contractapi.TransactionContextInterface,
    productID, eventType, actorID, actorName, actorRole, timestamp, location,
    prevOwner, newOwner, description string) error {
    // ...
}
```

| Tiêu chí | Status | Chi tiết |
|----------|--------|----------|
| Event ID generation | ✅ Tốt | `EVT-{TxID[:12]}` unique |
| Error handling | ✅ Tốt | Return errors |
| Composite key | ✅ Đúng | `event:` prefix |
| TxID tracking | ✅ Có | Lưu blockchain TxID |

---

## Tổng Kết Issues

### Critical Issues
| # | Location | Issue |
|---|----------|-------|
| 1 | RecordDelivery | `CurrentOwner` không được update sau delivery |
| 2 | GetSupplyChainEvents:395 | Error bị swallow |

### High Priority
| # | Location | Issue |
|---|----------|-------|
| 1 | *Nhiều functions* | Không có authorization check |
| 2 | TransferProduct | Không validate newOwnerRole enum |
| 3 | GetAllProducts | Sử dụng query hack |

### Medium Priority
| # | Location | Issue |
|---|----------|-------|
| 1 | GenerateQRPayload:500 | Error bị ignore |
| 2 | MarkAsCertified | Không check đã certified chưa |
| 3 | GetProductHistory:377 | Unmarshal error continue |
| 4 | RecordInspection:eventID | Nên tự generate |

### Low Priority
| # | Location | Issue |
|---|----------|-------|
| 1 | Product struct | Time fields nên là `time.Time` |
| 2 | GenerateQRPayload | URL nên là constant |
| 3 | validStatuses | Nên là const (Go không cho phép) |

---

## Điểm Số Chi Tiết

| Category | Điểm | Chi tiết |
|----------|------|----------|
| Code Structure | 9/10 | Tổ chức tốt, clear naming |
| Error Handling | 8/10 | Tốt, vài chỗ swallow error |
| Security | 5/10 | Thiếu authorization, validation |
| Data Integrity | 7/10 | RecordDelivery bug nghiêm trọng |
| Maintainability | 8/10 | Code dễ đọc, có comments |
| **Total** | **7.4/10** | |

---

## Recommended Fixes (Priority Order)

### P0 - Fix ngay
1. **RecordDelivery**: Update `product.CurrentOwner = receiverID`
2. **GetSupplyChainEvents**: Handle composite key error

### P1 - Trước production
3. Thêm authorization check (CID library)
4. Validate newOwnerRole enum
5. Thêm pagination cho queries

### P2 - Cải thiện
6. Fix GenerateQRPayload error handling
7. Thêm certification check trong MarkAsCertified
8. Thêm status transition validation
