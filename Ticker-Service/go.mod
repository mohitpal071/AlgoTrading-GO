module ticker-service

go 1.22.5

replace gokiteconnect-master => ../gokiteconnect-master

require (
	github.com/gorilla/websocket v1.5.3
	github.com/joho/godotenv v1.5.1
	github.com/stretchr/testify v1.10.0
	gokiteconnect-master v0.0.0
)

require (
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/gocarina/gocsv v0.0.0-20240520201108-78e41c74b4b1 // indirect
	github.com/google/go-querystring v1.0.0 // indirect
	github.com/pmezard/go-difflib v1.0.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)
