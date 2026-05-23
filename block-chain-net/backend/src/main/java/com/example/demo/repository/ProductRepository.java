package com.example.demo.repository;

import com.example.demo.entity.Product;
import com.example.demo.entity.ProductStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {

    List<Product> findByFarmerId(UUID farmerId);

    Page<Product> findByFarmerId(UUID farmerId, Pageable pageable);

    List<Product> findByStatus(ProductStatus status);

    Page<Product> findByStatus(ProductStatus status, Pageable pageable);

    List<Product> findByFarmerIdAndStatus(UUID farmerId, ProductStatus status);

    Page<Product> findByFarmerIdAndStatus(UUID farmerId, ProductStatus status, Pageable pageable);
}
