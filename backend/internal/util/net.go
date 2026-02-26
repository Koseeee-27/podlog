// Package util はアプリケーション全体で共有するユーティリティ関数を提供します。
package util

import "net"

// privateRanges はプライベート IP アドレスのネットワーク範囲を保持します。
// パッケージ初期化時に1回だけ CIDR をパースし、毎回のパースオーバーヘッドを除去します。
var privateRanges []*net.IPNet

func init() {
	cidrs := []string{
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"127.0.0.0/8",
		"169.254.0.0/16",
		"::1/128",
		"fc00::/7",
		"fe80::/10",
	}
	for _, cidr := range cidrs {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			// 静的な値なのでパース失敗はプログラムのバグ
			panic("failed to parse CIDR: " + cidr)
		}
		privateRanges = append(privateRanges, network)
	}
}

// IsPrivateIP は IP アドレスがプライベートネットワークに属するか判定します。
// SSRF（Server-Side Request Forgery）攻撃を防ぐために、
// 外部URLへリクエストを送信する前のチェックで使用します。
//
// ブロック対象:
//   - RFC1918 プライベートアドレス（10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16）
//   - ループバック（127.0.0.0/8）
//   - リンクローカル（169.254.0.0/16）
//   - IPv6 プライベートアドレス（::1/128, fc00::/7, fe80::/10）
func IsPrivateIP(ip net.IP) bool {
	for _, network := range privateRanges {
		if network.Contains(ip) {
			return true
		}
	}

	return ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast()
}
