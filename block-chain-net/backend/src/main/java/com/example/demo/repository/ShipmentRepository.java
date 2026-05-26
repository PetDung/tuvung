package com.example.demo.repository;

import com.example.demo.entity.Shipment;
import com.example.demo.entity.ShipmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShipmentRepository extends JpaRepository<Shipment, UUID> {

    Optional<Shipment> findFirstByProductIdAndStatusIn(UUID productId, List<ShipmentStatus> statuses);
    
    Optional<Shipment> findByProductId(UUID productId);

    List<Shipment> findByFromUserId(UUID fromUserId);

    Page<Shipment> findByFromUserId(UUID fromUserId, Pageable pageable);

    List<Shipment> findByToUserId(UUID toUserId);

    Page<Shipment> findByToUserId(UUID toUserId, Pageable pageable);

    List<Shipment> findByDistributorId(UUID distributorId);

    Page<Shipment> findByDistributorId(UUID distributorId, Pageable pageable);

    List<Shipment> findByStatus(ShipmentStatus status);

    Page<Shipment> findByStatus(ShipmentStatus status, Pageable pageable);

    List<Shipment> findByFromUserIdOrToUserIdOrDistributorId(
            UUID fromUserId, UUID toUserId, UUID distributorId);

    Page<Shipment> findByFromUserIdOrToUserIdOrDistributorId(
            UUID fromUserId, UUID toUserId, UUID distributorId, Pageable pageable);

    List<Shipment> findByStatusAndDistributorIdIsNull(ShipmentStatus status);

    List<Shipment> findByProductIdIn(List<UUID> productIds);
}
