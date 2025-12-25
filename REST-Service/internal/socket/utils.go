package socket

import (
	"encoding/binary"
)

// payload = { a: "subscribe", v: [[408065]] };
type Payload struct {
	Type string   `json:"a"`
	Val  []uint32 `json:"v"`
}

func Int16ToBytes(n int16) []byte {
	buf := make([]byte, 2) // int16 takes 2 bytes
	binary.BigEndian.PutUint16(buf, uint16(n))
	return buf
}

// splitPackets splits packet dump to individual tick packet.
func SplitPackets(inp []byte) [][]byte {
	var pkts [][]byte
	if len(inp) < 2 {
		return pkts
	}

	pktLen := binary.BigEndian.Uint16(inp[0:2])

	j := 2
	for i := 0; i < int(pktLen); i++ {
		pLen := binary.BigEndian.Uint16(inp[j : j+2])
		pkts = append(pkts, inp[j+2:j+2+int(pLen)])
		j = j + 2 + int(pLen)
	}

	return pkts
}
