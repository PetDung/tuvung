package com.example.demo.repository;

import com.example.demo.entity.ShipmentAction;
import com.example.demo.entity.ShipmentEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ShipmentEventRepository extends JpaRepository<ShipmentEvent, UUID> {

    List<ShipmentEvent> findByShipmentId(UUID shipmentId);

    Page<ShipmentEvent> findByShipmentId(UUID shipmentId, Pageable pageable);

    List<ShipmentEvent> findByShipmentIdOrderByCreatedAtAsc(UUID shipmentId);

    List<ShipmentEvent> findByProductId(UUID productId);

    Page<ShipmentEvent> findByProductId(UUID productId, Pageable pageable);

    List<ShipmentEvent> findByActorId(UUID actorId);

    List<ShipmentEvent> findByAction(ShipmentAction action);

    List<ShipmentEvent> findByShipmentIdAndAction(UUID shipmentId, ShipmentAction action);
}
