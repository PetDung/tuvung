package com.example.demo.service;

import com.example.demo.dto.shipment.AcceptShipmentRequest;
import com.example.demo.dto.shipment.CreateShipmentRequest;
import com.example.demo.dto.shipment.ShipmentListResponse;
import com.example.demo.dto.shipment.ShipmentResponse;
import com.example.demo.entity.Product;
import com.example.demo.entity.Shipment;
import com.example.demo.entity.ShipmentAction;
import com.example.demo.entity.ShipmentEvent;
import com.example.demo.entity.ShipmentStatus;
import com.example.demo.entity.User;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.ShipmentEventRepository;
import com.example.demo.repository.ShipmentRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShipmentService {

    private final ShipmentRepository shipmentRepository;
    private final ShipmentEventRepository shipmentEventRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;

    @Transactional
    public ShipmentResponse createShipment(CreateShipmentRequest request) {
        log.info("Creating new shipment for product: {}", request.getProductId());

        UUID userId = securityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BadRequestException("User not authenticated");
        }

        User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Get product to get origin location
        Product product = productRepository.findById(UUID.fromString(request.getProductId()))
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", request.getProductId()));

        // Check if product already has an active shipment (PENDING, ACCEPTED, or IN_TRANSIT)
        if (product.isLocked()) {
            throw new BadRequestException("Cannot create shipment: product has been shipped and is locked. Reason: " + 
                    (product.getLockedReason() != null ? product.getLockedReason() : "Shipped"));
        }

        // Check for existing active shipment for this product
        java.util.Optional<Shipment> existingShipment = shipmentRepository.findByProductId(UUID.fromString(request.getProductId()));
        if (existingShipment.isPresent()) {
            ShipmentStatus existingStatus = existingShipment.get().getStatus();
            if (existingStatus != ShipmentStatus.DELIVERED) {
                throw new BadRequestException("Cannot create shipment: product already has an active shipment (status: " + existingStatus + ")");
            }
        }

        // fromLocation = product origin, toLocation = retailer's address
        String fromLocation = product.getOrigin();
        String toLocation = currentUser.getAddress() != null ? currentUser.getAddress() : "Cửa hàng của bạn";

        // RETAILER là người tạo shipment
        // fromUserId = farmer (người giữ sản phẩm), toUserId = retailer (người yêu cầu)
        Shipment shipment = Shipment.builder()
                .productId(UUID.fromString(request.getProductId()))
                .productName(product.getProductName())
                .fromUserId(product.getFarmerId())
                .fromUserName(product.getFarmerName())
                .toUserId(userId)
                .toUserName(currentUser.getFullName())
                .fromLocation(fromLocation)
                .toLocation(toLocation)
                .notes(request.getNotes())
                .status(ShipmentStatus.PENDING)
                .build();

        shipment = shipmentRepository.save(shipment);

        ShipmentEvent event = ShipmentEvent.builder()
                .shipmentId(shipment.getId())
                .productId(shipment.getProductId())
                .action(ShipmentAction.CREATED)
                .actorId(userId)
                .actorName(currentUser.getFullName())
                .location(fromLocation)
                .createdAt(LocalDateTime.now())
                .build();

        shipmentEventRepository.save(event);

        log.info("Shipment created successfully: {}", shipment.getId());
        return ShipmentResponse.fromEntity(shipment);
    }

    @Transactional
    public ShipmentResponse acceptShipment(UUID shipmentId, UUID distributorId, AcceptShipmentRequest request) {
        log.info("Accepting shipment: {} by distributor: {}", shipmentId, distributorId);

        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment", "id", shipmentId));

        if (shipment.getStatus() != ShipmentStatus.PENDING) {
            throw new BadRequestException("Shipment can only be accepted from PENDING status");
        }

        if (shipment.getDistributorId() != null) {
            throw new BadRequestException("Shipment already has a distributor assigned");
        }

        // Get distributor info
        User distributor = userRepository.findById(distributorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", distributorId));

        // Set transport info when accepting
        if (request != null) {
            shipment.setTransportType(request.getTransportType());
            shipment.setVehiclePlate(request.getVehiclePlate());
        }

        shipment.setDistributorId(distributorId);
        shipment.setDistributorName(distributor.getFullName());
        shipment.setStatus(ShipmentStatus.ACCEPTED);
        shipment = shipmentRepository.save(shipment);

        ShipmentEvent event = ShipmentEvent.builder()
                .shipmentId(shipment.getId())
                .productId(shipment.getProductId())
                .action(ShipmentAction.ACCEPTED)
                .actorId(distributorId)
                .actorName(distributor.getFullName())
                .location(shipment.getToLocation())
                .createdAt(LocalDateTime.now())
                .build();

        shipmentEventRepository.save(event);

        log.info("Shipment accepted successfully: {}", shipmentId);
        return ShipmentResponse.fromEntity(shipment);
    }

    public List<ShipmentResponse> getPendingShipments() {
        log.info("Getting pending shipments");

        List<Shipment> shipments = shipmentRepository.findByStatusAndDistributorIdIsNull(ShipmentStatus.PENDING);
        return shipments.stream()
                .map(ShipmentResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public List<ShipmentResponse> getShipmentsByDistributor(UUID distributorId) {
        log.info("Getting shipments by distributor: {}", distributorId);

        List<Shipment> shipments = shipmentRepository.findByDistributorId(distributorId);
        return shipments.stream()
                .map(ShipmentResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public ShipmentResponse getShipment(UUID shipmentId) {
        log.info("Getting shipment: {}", shipmentId);

        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment", "id", shipmentId));

        return ShipmentResponse.fromEntity(shipment);
    }

    public ShipmentListResponse getShipmentsByUser(UUID userId, int page, int size) {
        log.info("Getting shipments for user: {}", userId);

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Shipment> shipmentPage = shipmentRepository.findByFromUserIdOrToUserIdOrDistributorId(
                userId, userId, userId, pageable);

        List<ShipmentResponse> shipments = shipmentPage.getContent().stream()
                .map(ShipmentResponse::fromEntity)
                .collect(Collectors.toList());

        return ShipmentListResponse.of(
                shipments,
                shipmentPage.getNumber(),
                shipmentPage.getSize(),
                shipmentPage.getTotalElements(),
                shipmentPage.getTotalPages()
        );
    }

    public ShipmentListResponse getAllShipments(int page, int size) {
        log.info("Getting all shipments - page: {}, size: {}", page, size);

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Shipment> shipmentPage = shipmentRepository.findAll(pageable);

        List<ShipmentResponse> shipments = shipmentPage.getContent().stream()
                .map(ShipmentResponse::fromEntity)
                .collect(Collectors.toList());

        return ShipmentListResponse.of(
                shipments,
                shipmentPage.getNumber(),
                shipmentPage.getSize(),
                shipmentPage.getTotalElements(),
                shipmentPage.getTotalPages()
        );
    }

    public List<ShipmentEvent> getShipmentEvents(UUID shipmentId) {
        log.info("Getting events for shipment: {}", shipmentId);

        if (!shipmentRepository.existsById(shipmentId)) {
            throw new ResourceNotFoundException("Shipment", "id", shipmentId);
        }

        return shipmentEventRepository.findByShipmentIdOrderByCreatedAtAsc(shipmentId);
    }
}
