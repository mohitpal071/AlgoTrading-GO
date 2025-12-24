package handlers

import (
	kiteconnect "gokiteconnect-master"
)

// Controller holds the Kite Connect client and other dependencies
type Controller struct {
	KiteClient *kiteconnect.Client
}

// NewController creates a new Controller instance
func NewController(client *kiteconnect.Client) *Controller {
	return &Controller{
		KiteClient: client,
	}
}
