package chaincode

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// Product status constants
const (
	StatusRegistered = "Registered"
	StatusInspected  = "Inspected"
	StatusInTransit  = "InTransit"
	StatusDelivered  = "Delivered"
	StatusSold       = "Sold"
)

var validStatuses = map[string]bool{
	StatusRegistered: true,
	StatusInspected:  true,
	StatusInTransit:  true,
	StatusDelivered:  true,
	StatusSold:       true,
}

// Valid status transitions: from -> []to
var validTransitions = map[string][]string{
	StatusRegistered: {StatusInspected},
	StatusInspected:   {StatusInTransit},
	StatusInTransit:   {StatusDelivered},
	StatusDelivered:   {StatusSold},
	StatusSold:        {}, // terminal state
}

// Role constants
const (
	RoleFarmer      = "Farmer"
	RoleDistributor = "Distributor"
	RoleRetailer    = "Retailer"
	RoleInspector   = "Inspector"
)

var validRoles = map[string]bool{
	RoleFarmer:      true,
	RoleDistributor: true,
	RoleRetailer:   true,
	RoleInspector:   true,
}

// Pagination constants
const (
	defaultPageSize = 25
	maxPageSize     = 100
)

// sanitizeString removes potentially dangerous characters for CouchDB queries
func sanitizeString(input string) string {
	return strings.ReplaceAll(strings.TrimSpace(input), `"`, `\"`)
}

// validateStatus checks if the status is a valid enum value
func validateStatus(status string) error {
	if !validStatuses[status] {
		return fmt.Errorf("invalid status: %s (valid: Registered, Inspected, InTransit, Delivered, Sold)", status)
	}
	return nil
}

// validateRole checks if the role is a valid enum value
func validateRole(role string) error {
	if !validRoles[role] {
		return fmt.Errorf("invalid role: %s (valid: Farmer, Distributor, Retailer, Inspector)", role)
	}
	return nil
}

// validateStatusTransition checks if the status transition is allowed
func validateStatusTransition(currentStatus, newStatus string) error {
	if currentStatus == newStatus {
		return fmt.Errorf("status is already %s", currentStatus)
	}
	allowed, exists := validTransitions[currentStatus]
	if !exists {
		return fmt.Errorf("unknown current status: %s", currentStatus)
	}
	for _, s := range allowed {
		if s == newStatus {
			return nil
		}
	}
	return fmt.Errorf("invalid transition from %s to %s", currentStatus, newStatus)
}

// normalizePageSize ensures page size is within bounds
func normalizePageSize(pageSize int32) int32 {
	if pageSize <= 0 {
		return defaultPageSize
	}
	if pageSize > maxPageSize {
		return maxPageSize
	}
	return pageSize
}

// Product represents an IMMUTABLE product identity record on the blockchain.
// Only fields set at creation time are stored. All subsequent state changes
// (status, ownership) are recorded as SupplyChainEvent records.
// NEVER overwrite a Product record after creation.
type Product struct {
	ID         string `json:"ID"`
	RefID      string `json:"RefID"`
	FarmerID   string `json:"FarmerID"`
	FarmerName string `json:"FarmerName"`
	QRCode     string `json:"QRCode"`
	CreatedAt  string `json:"CreatedAt"`
}

// SupplyChainEvent represents an IMMUTABLE milestone on the blockchain.
// This is the ONLY source of truth for status changes and ownership transfers.
// Each event is a new record — never modify existing events.
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

// SmartContract provides functions for managing agricultural product traceability
type SmartContract struct {
	contractapi.Contract
}

// InitLedger is a no-op stub for backwards compatibility
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	return nil
}

// ProductExists returns true if product exists
func (s *SmartContract) ProductExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	productJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to check product: %v", err)
	}
	return productJSON != nil, nil
}

// CreateProduct creates a new IMMUTABLE product record on blockchain.
// Called by Farmer to register a new product/lot.
// The product record is NEVER modified after this — all changes go to events.
func (s *SmartContract) CreateProduct(ctx contractapi.TransactionContextInterface,
	id, refID, farmerID, farmerName, qrCode, createdAt string) (string, error) {

	if id == "" {
		return "", fmt.Errorf("product ID is required")
	}
	if refID == "" {
		return "", fmt.Errorf("RefID is required")
	}
	if farmerID == "" {
		return "", fmt.Errorf("FarmerID is required")
	}
	if qrCode == "" {
		return "", fmt.Errorf("QRCode is required")
	}

	exists, err := s.ProductExists(ctx, id)
	if err != nil {
		return "", err
	}
	if exists {
		return "", fmt.Errorf("product %s already exists", id)
	}

	// Write IMMUTABLE product record — never overwrite after this
	product := Product{
		ID:         id,
		RefID:      refID,
		FarmerID:   farmerID,
		FarmerName: farmerName,
		QRCode:     qrCode,
		CreatedAt:  createdAt,
	}

	productJSON, err := json.Marshal(product)
	if err != nil {
		return "", err
	}

	if err := ctx.GetStub().PutState(id, productJSON); err != nil {
		return "", fmt.Errorf("failed to create product: %v", err)
	}

	// Emit Registered event — this is the record of initial status & ownership
	if err := s.emitEvent(ctx, product.ID, "Registered", farmerID, farmerName, RoleFarmer,
		createdAt, createdAt, farmerID, farmerID,
		fmt.Sprintf("Product registered by farmer %s", farmerName)); err != nil {
		return "", fmt.Errorf("failed to emit event: %v", err)
	}

	return id, nil
}

// ReadProduct retrieves the immutable product identity by ID.
// Returns only the creation-time fields; does NOT return current status or owner.
// Use GetSupplyChainEvents to get current state.
func (s *SmartContract) ReadProduct(ctx contractapi.TransactionContextInterface, id string) (*Product, error) {
	productJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read product: %v", err)
	}
	if productJSON == nil {
		return nil, fmt.Errorf("product %s does not exist", id)
	}

	var product Product
	if err := json.Unmarshal(productJSON, &product); err != nil {
		return nil, err
	}
	return &product, nil
}

// ApproveProduct — Inspector approves a registered product.
// Status: Registered → Inspected. Ownership stays with Farmer.
// Product record is NEVER modified — only a new event is added.
func (s *SmartContract) ApproveProduct(ctx contractapi.TransactionContextInterface,
	productID, inspectorID, inspectorName, timestamp, location string) error {

	product, err := s.ReadProduct(ctx, productID)
	if err != nil {
		return err
	}

	currentStatus, err := s.getLatestStatus(ctx, productID)
	if err != nil {
		return err
	}
	if currentStatus != StatusRegistered {
		return fmt.Errorf("product %s must be Registered to be approved (current: %s)", productID, currentStatus)
	}

	// NO PutState — Product is immutable. Only emit event.
	if err := s.emitEvent(ctx, productID, "Inspected", inspectorID, inspectorName, RoleInspector,
		timestamp, location, product.FarmerID, product.FarmerID,
		fmt.Sprintf("Product approved by inspector %s", inspectorName)); err != nil {
		return fmt.Errorf("failed to emit event: %v", err)
	}

	return nil
}

// StartShipment — Distributor begins shipping an inspected product.
// Status: Inspected → InTransit. Ownership transfers from Farmer to Distributor.
// Product record is NEVER modified — only a new event is added.
func (s *SmartContract) StartShipment(ctx contractapi.TransactionContextInterface,
	productID, distributorID, distributorName, timestamp, location string) error {

	// Verify product exists
	if _, err := s.ReadProduct(ctx, productID); err != nil {
		return err
	}

	currentStatus, err := s.getLatestStatus(ctx, productID)
	if err != nil {
		return err
	}
	if currentStatus != StatusInspected {
		return fmt.Errorf("product %s must be Inspected before shipping (current: %s)", productID, currentStatus)
	}

	currentOwner, _, err := s.getLatestOwner(ctx, productID)
	if err != nil {
		return err
	}

	// NO PutState — Product is immutable. Only emit event with ownership transfer.
	if err := s.emitEvent(ctx, productID, "InTransit", distributorID, distributorName, RoleDistributor,
		timestamp, location, currentOwner, distributorID,
		fmt.Sprintf("Shipment started by %s", distributorName)); err != nil {
		return fmt.Errorf("failed to emit event: %v", err)
	}

	return nil
}

// ConfirmDelivery — Distributor confirms delivery to Retailer.
// Status: InTransit → Delivered. Ownership transfers to Retailer.
// Product record is NEVER modified — only a new event is added.
func (s *SmartContract) ConfirmDelivery(ctx contractapi.TransactionContextInterface,
	productID, retailerID, retailerName, timestamp, location string) error {

	// Verify product exists
	if _, err := s.ReadProduct(ctx, productID); err != nil {
		return err
	}

	currentStatus, err := s.getLatestStatus(ctx, productID)
	if err != nil {
		return err
	}
	if currentStatus != StatusInTransit {
		return fmt.Errorf("product %s must be InTransit for delivery (current: %s)", productID, currentStatus)
	}

	currentOwner, _, err := s.getLatestOwner(ctx, productID)
	if err != nil {
		return err
	}

	// NO PutState — Product is immutable. Only emit event with ownership transfer.
	if err := s.emitEvent(ctx, productID, "Delivered", retailerID, retailerName, RoleRetailer,
		timestamp, location, currentOwner, retailerID,
		fmt.Sprintf("Delivered to %s", retailerName)); err != nil {
		return fmt.Errorf("failed to emit event: %v", err)
	}

	return nil
}

// UpdateProductStatus updates product status only (e.g. Delivered → Sold).
// Ownership does NOT change. Product record is NEVER modified.
// Valid transitions are enforced via validateStatusTransition.
func (s *SmartContract) UpdateProductStatus(ctx contractapi.TransactionContextInterface,
	id, newStatus, updatedAt, actorID, actorName string) error {

	if err := validateStatus(newStatus); err != nil {
		return err
	}

	// Verify product exists
	if _, err := s.ReadProduct(ctx, id); err != nil {
		return err
	}

	currentStatus, err := s.getLatestStatus(ctx, id)
	if err != nil {
		return err
	}

	if err := validateStatusTransition(currentStatus, newStatus); err != nil {
		return fmt.Errorf("invalid status transition: %v", err)
	}

	currentOwner, currentRole, err := s.getLatestOwner(ctx, id)
	if err != nil {
		return err
	}

	// NO PutState — Product is immutable. Only emit event.
	// EventType = newStatus so getLatestStatus() returns correct status
	if err := s.emitEvent(ctx, id, newStatus, actorID, actorName, currentRole,
		updatedAt, updatedAt, currentOwner, currentOwner,
		fmt.Sprintf("Status changed to %s", newStatus)); err != nil {
		return fmt.Errorf("failed to emit status change event: %v", err)
	}

	return nil
}

// TransferProduct transfers ownership and records the transfer on blockchain.
// Status does NOT change. Product record is NEVER modified.
// Use for generic ownership transfer; for standard flow use ConfirmDelivery.
func (s *SmartContract) TransferProduct(ctx contractapi.TransactionContextInterface,
	productID, newOwner, newOwnerRole, newOwnerName, updatedAt, actorID, actorName string) error {

	if err := validateRole(newOwnerRole); err != nil {
		return err
	}

	_, err := s.ReadProduct(ctx, productID)
	if err != nil {
		return err
	}

	currentStatus, err := s.getLatestStatus(ctx, productID)
	if err != nil {
		return err
	}
	if currentStatus == StatusSold {
		return fmt.Errorf("cannot transfer sold product")
	}

	currentOwner, prevRole, err := s.getLatestOwner(ctx, productID)
	if err != nil {
		return err
	}

	// NO PutState — Product is immutable. Only emit event.
	if err := s.emitEvent(ctx, productID, "Transferred", actorID, actorName, prevRole,
		updatedAt, updatedAt, currentOwner, newOwner,
		fmt.Sprintf("Transferred from %s (%s) to %s (%s)", currentOwner, prevRole, newOwner, newOwnerRole)); err != nil {
		return fmt.Errorf("failed to emit transfer event: %v", err)
	}

	return nil
}

// RecordInspection records an inspection/certification event without changing product status.
func (s *SmartContract) RecordInspection(ctx contractapi.TransactionContextInterface,
	productID, inspectorID, inspectorName, inspectorRole, timestamp, location, description string) error {

	if err := validateRole(inspectorRole); err != nil {
		return err
	}

	_, err := s.ReadProduct(ctx, productID)
	if err != nil {
		return fmt.Errorf("product %s not found: %v", productID, err)
	}

	txID := ctx.GetStub().GetTxID()
	eventID := fmt.Sprintf("INSP-%s", txID[:12])

	event := SupplyChainEvent{
		ID:          eventID,
		ProductID:   productID,
		EventType:   "Inspected",
		ActorID:     inspectorID,
		ActorName:   inspectorName,
		ActorRole:   inspectorRole,
		Timestamp:   timestamp,
		Location:    location,
		Description: description,
		TxID:        txID,
	}

	eventBytes, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %v", err)
	}

	compositeKey, err := ctx.GetStub().CreateCompositeKey("event:", []string{productID, eventID})
	if err != nil {
		return fmt.Errorf("failed to create composite key: %v", err)
	}

	if err := ctx.GetStub().PutState(compositeKey, eventBytes); err != nil {
		return fmt.Errorf("failed to record inspection: %v", err)
	}

	return nil
}

// MarkAsCertified marks a product as certified.
// Product record is NEVER modified — only a Certified event is emitted.
// Note: Certified is a metadata event, NOT a status change. It does NOT affect
// the product status flow (Registered → Inspected → InTransit → Delivered → Sold).
// Use GetSupplyChainEvents to check if a product was certified.
func (s *SmartContract) MarkAsCertified(ctx contractapi.TransactionContextInterface,
	productID, certifiedAt, certifierID, certifierName string) error {

	// Verify product exists
	if _, err := s.ReadProduct(ctx, productID); err != nil {
		return err
	}

	currentOwner, _, err := s.getLatestOwner(ctx, productID)
	if err != nil {
		return err
	}

	// NO PutState on Product — only emit Certified event.
	// NOTE: Certified flag is no longer stored on Product. Check events for certification.
	if err := s.emitEvent(ctx, productID, "Certified", certifierID, certifierName, RoleInspector,
		certifiedAt, certifiedAt, currentOwner, currentOwner,
		fmt.Sprintf("Product certified by %s", certifierName)); err != nil {
		return fmt.Errorf("failed to emit certification event: %v", err)
	}

	return nil
}

// getLatestStatus returns the most recent STATUS event by scanning all events.
// This is the ONLY way to get current status — Product is immutable.
// Note: Only status events (Registered, Inspected, InTransit, Delivered, Sold) are counted.
// Non-status events (Certified, Transferred) are IGNORED for status tracking.
func (s *SmartContract) getLatestStatus(ctx contractapi.TransactionContextInterface, productID string) (string, error) {
	events, err := s.GetSupplyChainEvents(ctx, productID)
	if err != nil {
		return "", err
	}
	if len(events) == 0 {
		return "", fmt.Errorf("no events found for product %s", productID)
	}
	// Sort by timestamp descending to find latest
	sort.Slice(events, func(i, j int) bool {
		return events[i].Timestamp > events[j].Timestamp
	})
	// Find the latest STATUS event (ignore Certified, Transferred, etc.)
	for _, event := range events {
		if validStatuses[event.EventType] {
			return event.EventType, nil
		}
	}
	return "", fmt.Errorf("no status event found for product %s", productID)
}

// getLatestOwner returns the most recent owner and their role by scanning all events.
func (s *SmartContract) getLatestOwner(ctx contractapi.TransactionContextInterface, productID string) (string, string, error) {
	events, err := s.GetSupplyChainEvents(ctx, productID)
	if err != nil {
		return "", "", err
	}
	if len(events) == 0 {
		return "", "", fmt.Errorf("no events found for product %s", productID)
	}
	sort.Slice(events, func(i, j int) bool {
		return events[i].Timestamp > events[j].Timestamp
	})
	latest := events[0]
	return latest.NewOwner, latest.ActorRole, nil
}

// GetProductHistory returns the full chain of SupplyChainEvents for a product.
// This replaces the old approach of reading Product state at each transaction.
// Returns ALL immutable events sorted by timestamp (oldest first).
func (s *SmartContract) GetProductHistory(ctx contractapi.TransactionContextInterface, productID string) ([]SupplyChainEvent, error) {
	events, err := s.GetSupplyChainEvents(ctx, productID)
	if err != nil {
		return nil, err
	}
	// Sort by timestamp ascending (oldest first = creation order)
	sort.Slice(events, func(i, j int) bool {
		return events[i].Timestamp < events[j].Timestamp
	})
	return events, nil
}

// GetSupplyChainEvents retrieves all immutable supply chain events for a product.
func (s *SmartContract) GetSupplyChainEvents(
	ctx contractapi.TransactionContextInterface,
	productID string,
) ([]SupplyChainEvent, error) {

	resultsIterator, err := ctx.GetStub().GetStateByPartialCompositeKey("event:", []string{productID})
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var events []SupplyChainEvent
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var event SupplyChainEvent
		if err := json.Unmarshal(queryResult.Value, &event); err != nil {
			return nil, err
		}

		events = append(events, event)
	}

	return events, nil
}

// PaginatedQueryResults holds query results with pagination metadata
type PaginatedQueryResults struct {
	Products     []*Product `json:"products"`
	Bookmark     string     `json:"bookmark"`
	FetchedCount int        `json:"fetchedCount"`
}

// GetProductsByFarmer returns all products registered by a specific farmer
func (s *SmartContract) GetProductsByFarmer(ctx contractapi.TransactionContextInterface,
	farmerID string, pageSize int32, bookmark string) (*PaginatedQueryResults, error) {
	query := fmt.Sprintf(`{"selector":{"FarmerID":"%s"}}`, sanitizeString(farmerID))
	return s.queryProductsPaginated(ctx, query, pageSize, bookmark)
}

// GetProductsByStatus returns products whose latest event has the given status.
// Since status is tracked via events, we scan all events for matching status.
func (s *SmartContract) GetProductsByStatus(ctx contractapi.TransactionContextInterface,
	status string, pageSize int32, bookmark string) (*PaginatedQueryResults, error) {
	if err := validateStatus(status); err != nil {
		return nil, err
	}

	// Get all products and check their latest status
	allProducts, err := s.GetAllProducts(ctx, maxPageSize, "")
	if err != nil {
		return nil, err
	}

	var matched []*Product
	for _, p := range allProducts.Products {
		latestStatus, err := s.getLatestStatus(ctx, p.ID)
		if err != nil {
			continue
		}
		if latestStatus == status {
			matched = append(matched, p)
		}
	}

	pageSize = normalizePageSize(pageSize)
	start := 0
	if bookmark != "" {
		for i, p := range matched {
			if p.ID == bookmark {
				start = i + 1
				break
			}
		}
	}
	end := start + int(pageSize)
	if end > len(matched) {
		end = len(matched)
	}
	page := matched[start:end]
	nextBookmark := ""
	if end < len(matched) {
		nextBookmark = page[len(page)-1].ID
	}

	return &PaginatedQueryResults{
		Products:     page,
		Bookmark:     nextBookmark,
		FetchedCount: len(page),
	}, nil
}

// GetAllProducts returns all products with pagination
func (s *SmartContract) GetAllProducts(ctx contractapi.TransactionContextInterface,
	pageSize int32, bookmark string) (*PaginatedQueryResults, error) {
	query := `{"selector":{"_id":{"$gt":null}}}`
	return s.queryProductsPaginated(ctx, query, pageSize, bookmark)
}

// GetProductsByOwner returns products whose latest event shows the given owner
func (s *SmartContract) GetProductsByOwner(ctx contractapi.TransactionContextInterface,
	ownerID string, pageSize int32, bookmark string) (*PaginatedQueryResults, error) {

	// Get all products and check their latest owner
	allProducts, err := s.GetAllProducts(ctx, maxPageSize, "")
	if err != nil {
		return nil, err
	}

	var matched []*Product
	for _, p := range allProducts.Products {
		latestOwner, _, err := s.getLatestOwner(ctx, p.ID)
		if err != nil {
			continue
		}
		if latestOwner == ownerID {
			matched = append(matched, p)
		}
	}

	pageSize = normalizePageSize(pageSize)
	start := 0
	if bookmark != "" {
		for i, p := range matched {
			if p.ID == bookmark {
				start = i + 1
				break
			}
		}
	}
	end := start + int(pageSize)
	if end > len(matched) {
		end = len(matched)
	}
	page := matched[start:end]
	nextBookmark := ""
	if end < len(matched) {
		nextBookmark = page[len(page)-1].ID
	}

	return &PaginatedQueryResults{
		Products:     page,
		Bookmark:     nextBookmark,
		FetchedCount: len(page),
	}, nil
}

// queryProductsPaginated executes a paginated CouchDB query
func (s *SmartContract) queryProductsPaginated(
	ctx contractapi.TransactionContextInterface,
	query string,
	pageSize int32,
	bookmark string,
) (*PaginatedQueryResults, error) {

	pageSize = normalizePageSize(pageSize)

	resultsIterator, metadata, err :=
		ctx.GetStub().GetQueryResultWithPagination(query, pageSize, bookmark)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	products := make([]*Product, 0)
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var product Product
		if err := json.Unmarshal(queryResult.Value, &product); err != nil {
			return nil, err
		}

		products = append(products, &product)
	}

	return &PaginatedQueryResults{
		Products:     products,
		Bookmark:     metadata.Bookmark,
		FetchedCount: len(products),
	}, nil
}

// QRPayload represents the QR code data structure
type QRPayload struct {
	ID    string `json:"id"`
	RefID string `json:"refId"`
	Farm  string `json:"farm"`
	URL   string `json:"url"`
}

// GenerateQRPayload generates QR code payload for a product
func (s *SmartContract) GenerateQRPayload(ctx contractapi.TransactionContextInterface, productID string) (string, error) {
	product, err := s.ReadProduct(ctx, productID)
	if err != nil {
		return "", err
	}

	qrPayload := QRPayload{
		ID:    product.ID,
		RefID: product.RefID,
		Farm:  product.FarmerName,
		URL:   product.QRCode,
	}

	payloadBytes, err := json.Marshal(qrPayload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal QR payload: %v", err)
	}
	return string(payloadBytes), nil
}

// emitEvent creates and stores an IMMUTABLE supply chain event.
// Events are NEVER modified or deleted — only new events are added.
func (s *SmartContract) emitEvent(ctx contractapi.TransactionContextInterface,
	productID, eventType, actorID, actorName, actorRole, timestamp, location,
	prevOwner, newOwner, description string) error {

	txID := ctx.GetStub().GetTxID()
	event := SupplyChainEvent{
		ID:          fmt.Sprintf("EVT-%s", txID[:12]),
		ProductID:   productID,
		EventType:   eventType,
		ActorID:     actorID,
		ActorName:   actorName,
		ActorRole:   actorRole,
		Timestamp:   timestamp,
		Location:    location,
		PrevOwner:   prevOwner,
		NewOwner:    newOwner,
		Description: description,
		TxID:        txID,
	}

	eventBytes, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %v", err)
	}

	compositeKey, err := ctx.GetStub().CreateCompositeKey("event:", []string{productID, event.ID})
	if err != nil {
		return fmt.Errorf("failed to create composite key: %v", err)
	}

	if err := ctx.GetStub().PutState(compositeKey, eventBytes); err != nil {
		return fmt.Errorf("failed to store event: %v", err)
	}

	return nil
}
