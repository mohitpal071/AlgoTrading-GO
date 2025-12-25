package socket

import (
	"encoding/binary"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

type Client struct {
	conn     *websocket.Conn
	manager  *ClientManager
	tokenMap map[uint32]bool // instrument token map
	mu       sync.Mutex
}

func (c *Client) subscribe(instrumentToken uint32) {
	c.tokenMap[instrumentToken] = true
}

func (c *Client) unsubscribe(instrumentToken uint32) {
	delete(c.tokenMap, instrumentToken)
}

func (c *Client) filterBinaryMsg(msg []byte) []byte {
	var filteredMsg []byte
	packets := SplitPackets(msg)
	count := 0
	c.mu.Lock()
	for _, b := range packets {
		token := binary.BigEndian.Uint32(b[0:4])
		if _, ok := c.tokenMap[token]; ok {
			filteredMsg = append(filteredMsg, append(Int16ToBytes(int16(len(b))), b...)...)
			count += 1
		}
	}
	c.mu.Unlock()
	filteredMsg = append(Int16ToBytes(int16(count)), filteredMsg...)
	log.Println(filteredMsg)
	return filteredMsg
}
