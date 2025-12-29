package handlers

import (
	kiteconnect "gokiteconnect-master"
	"rest-service/internal/options"
)

// Controller holds the Kite Connect client and other dependencies
type Controller struct {
	KiteClient *kiteconnect.Client
	Scanner    *options.Scanner
}

// NewController creates a new Controller instance
func NewController(client *kiteconnect.Client, scanner *options.Scanner) *Controller {
	return &Controller{
		KiteClient: client,
		Scanner:    scanner,
	}
}
