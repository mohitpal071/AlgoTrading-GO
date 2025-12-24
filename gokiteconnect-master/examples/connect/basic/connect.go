package main

import (
	"fmt"

	kiteconnect "gokiteconnect-master"
	"os"

	"github.com/joho/godotenv"
)

// const (
// 	apiKey    string = "my_api_key"
// 	apiSecret string = "my_api_secret"
// )

func main() {
	err := godotenv.Load("../../../../.env")
    if err != nil {
        panic("Error loading .env file")
    }

	// Create a new Kite connect instance
	encToken := os.Getenv("ENCTOKEN")
	fmt.Println("encToken: ", encToken)
	kc := kiteconnect.NewWithEncToken(encToken)

	//Get Full User Profile
	profile, err := kc.GetFullUserProfile()
	if err != nil {
		fmt.Printf("Error getting full user profile: %v", err)
	}
	fmt.Println("profile: ", profile)

	// Get margins
	// margins, err := kc.GetUserMargins()
	// if err != nil {
	// 	fmt.Printf("Error getting margins: %v", err)
	// }
	// fmt.Println("margins: ", margins)
}
