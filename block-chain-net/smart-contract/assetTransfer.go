package main

import (
	"agri-trace/chaincode"
	"log"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

func main() {
	agriChaincode, err := contractapi.NewChaincode(&chaincode.SmartContract{})
	if err != nil {
		log.Panicf("Error creating agri-trace chaincode: %v", err)
	}

	if err := agriChaincode.Start(); err != nil {
		log.Panicf("Error starting agri-trace chaincode: %v", err)
	}
}
