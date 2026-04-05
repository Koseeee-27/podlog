package middleware

import (
	"errors"
	"log"
	"net/http"

	"github.com/Koseeee-27/podlog/backend/internal/response"
	"github.com/Koseeee-27/podlog/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

// NewHTTPErrorHandler はカスタム HTTPErrorHandler を返します。
// Echo がハンドラーから返されたエラーを処理する際に呼ばれ、
// エラー型に応じた適切な HTTP ステータスコードとメッセージを返します。
//
// isDev が true の場合、500 エラーの詳細をレスポンスに含めます。
// 本番環境では内部エラーの詳細をクライアントに露出しません。
func NewHTTPErrorHandler(isDev bool) func(err error, c echo.Context) {
	return func(err error, c echo.Context) {
		// レスポンスが既にコミット済みの場合は何もしない。
		// response.Error() 等でレスポンスを書いてから nil 以外を返した場合に発生しうる。
		if c.Response().Committed {
			return
		}

		code, message := classifyError(err, isDev)

		// サーバーエラーはログに残す
		if code >= 500 {
			log.Printf("HTTP %d: %v", code, err)
		}

		// HEAD リクエストではボディを返さない（HTTP 仕様）
		if c.Request().Method == http.MethodHead {
			if err := c.NoContent(code); err != nil {
				log.Printf("failed to send error response: %v", err)
			}
			return
		}

		// 共通ヘルパーで統一フォーマットのエラーレスポンスを返す
		if err := response.Error(c, code, message); err != nil {
			log.Printf("failed to send error response: %v", err)
		}
	}
}

// classifyError はエラーを分類し、HTTPステータスコードとメッセージを返します。
func classifyError(err error, isDev bool) (int, string) {
	// Echo の HTTPError（ミドルウェアやバインドエラー等）
	var echoErr *echo.HTTPError
	if errors.As(err, &echoErr) {
		msg := http.StatusText(echoErr.Code)
		if m, ok := echoErr.Message.(string); ok && m != "" {
			msg = m
		}
		// 5xx は本番では詳細を露出しない
		if echoErr.Code >= 500 && !isDev {
			return echoErr.Code, http.StatusText(echoErr.Code)
		}
		return echoErr.Code, msg
	}

	// usecase 層のカスタムエラー型
	var notFound *usecase.NotFoundError
	if errors.As(err, &notFound) {
		return http.StatusNotFound, notFound.Error()
	}

	var validation *usecase.ValidationError
	if errors.As(err, &validation) {
		return http.StatusBadRequest, validation.Error()
	}

	var conflict *usecase.ConflictError
	if errors.As(err, &conflict) {
		return http.StatusConflict, conflict.Error()
	}

	var ssrf *usecase.SSRFBlockedError
	if errors.As(err, &ssrf) {
		return http.StatusBadRequest, ssrf.Error()
	}

	// 予期しないエラー — 500 Internal Server Error
	if isDev {
		return http.StatusInternalServerError, err.Error()
	}
	return http.StatusInternalServerError, "internal server error"
}
