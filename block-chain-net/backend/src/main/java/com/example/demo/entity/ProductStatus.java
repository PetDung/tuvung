package com.example.demo.entity;

public enum ProductStatus {
    REGISTERED,
    INSPECTED,
    IN_TRANSIT,
    DELIVERED,
    SOLD;

    /**
     * Returns the chaincode-compatible PascalCase status name.
     * Chaincode uses "Registered", "Inspected", "InTransit", "Delivered", "Sold"
     * while Java enum uses REGISTERED, INSPECTED, IN_TRANSIT, DELIVERED, SOLD.
     */
    public String getChaincodeName() {
        return switch (this) {
            case REGISTERED -> "Registered";
            case INSPECTED -> "Inspected";
            case IN_TRANSIT -> "InTransit";
            case DELIVERED -> "Delivered";
            case SOLD -> "Sold";
        };
    }
}
