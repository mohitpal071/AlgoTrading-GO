module rest-service

go 1.16

replace gokiteconnect-master => ../gokiteconnect-master

require (
	github.com/gin-gonic/gin v1.9.1
	github.com/gorilla/websocket v1.4.2
	github.com/joho/godotenv v1.5.1
	github.com/stretchr/testify v1.8.3
	gokiteconnect-master v0.0.0
)
