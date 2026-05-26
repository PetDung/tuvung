Mỗi sản phẩm được xem là 1 lô hàng.
Người nông dân tạo sản phẩm -> Registered
Kiểm định duyệt, khi duyệt xong tạo thông tin cho QR -> Inspected + Tạo QR với signature
Nhà bán lẻ sẽ chỉ thấy  được những sản phẩm đã duyệt. Họ gửi yêu cầu lấy hàng.
Khi 1 sản phẩm đã nằm trong shipmet thì sản phẩm đó không được yêu cầu nữa
Bên nhà phân phối sẽ thấy yêu cần và nhận yêu cầu.
Khi bắt đầu giao họ sẽ scan qr để xác nhận lấy đúng sản phẩm để giao -> InTransit 
Khi giao tới của hàng thì scan để đảm bảo đúng sản phẩm -> Delivered + Tạo QR với signature mới
Và khi bán ra cửa hàng sẽ scan để chuyển trạng thái -> Sold

Tất cả lịch sử của sản phẩm được ghi lên blockchain (không ghi lịch sử shipmment)
Giúp tôi hoàn thiện nghiệp vụ hơn và maintain lại app theo luoonmgf này. Hạn chế thay đổi blockchain



/// Bổ sung
RETAILER ngoài thấy sản phẩm đã được kiểm định. Họ cần được thấy những sản phẩm mà họ yêu cầu mua rồi trong shipment họ yêu cầu.
DISTRIBUTOR đảm bảo chỉ được thấy sản phẩm trong trong shipment họ đã nhận.

Về QR cả be và FE
Với role
RETAILER chỉ hiển thị khi đã giao đến họ
DISTRIBUTOR chỉ hiển thị trước khi đã giao thôi.
Để đảm bảo không leak, khó thay đổi qr, vv


/// Mới
Xây 1 tang history nhận từ param id sản phẩm để xem toàn bộ cây lịch sử sản phẩm từ, thông tin sản phẩm. Lưu ý chỉ có xem khi sản phâm đã giao trở đi.
Trang public không auth.

