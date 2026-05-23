package com.example.demo.repository;

import com.example.demo.entity.SignatureAction;
import com.example.demo.entity.UsedSignature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UsedSignatureRepository extends JpaRepository<UsedSignature, UUID> {

    boolean existsBySignature(String signature);

    Optional<UsedSignature> findBySignature(String signature);

    List<UsedSignature> findByProductId(UUID productId);

    List<UsedSignature> findByProductIdOrderByUsedAtDesc(UUID productId);

    List<UsedSignature> findByActorId(UUID actorId);

    List<UsedSignature> findByAction(SignatureAction action);

    List<UsedSignature> findByUsedAtBetween(LocalDateTime start, LocalDateTime end);

    Optional<UsedSignature> findFirstByProductIdOrderByUsedAtDesc(UUID productId);
}
