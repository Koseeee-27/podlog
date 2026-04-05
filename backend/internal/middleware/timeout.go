package middleware

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

const (
	// DefaultTimeout は一般 API のタイムアウト値です。
	DefaultTimeout = 30 * time.Second
	// ExternalTimeout は外部通信（RSS フェッチ、OGP 取得等）を含むエンドポイントのタイムアウト値です。
	ExternalTimeout = 60 * time.Second
)

// Timeout は指定された duration でコンテキストタイムアウトを設定するミドルウェアを返します。
// タイムアウト時は 504 Gateway Timeout を返します。
func Timeout(duration time.Duration) echo.MiddlewareFunc {
	return middleware.ContextTimeoutWithConfig(middleware.ContextTimeoutConfig{
		Timeout: duration,
		ErrorHandler: func(err error, c echo.Context) error {
			if err != nil && errors.Is(err, context.DeadlineExceeded) {
				return echo.NewHTTPError(http.StatusGatewayTimeout, "request timeout")
			}
			return err
		},
	})
}
