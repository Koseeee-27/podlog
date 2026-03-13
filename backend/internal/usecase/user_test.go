package usecase

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/Koseeee-27/podlog/backend/internal/model"
)

// mockFileStorage は FileStorage のモック（テスト用の偽実装）です。
type mockFileStorage struct {
	uploadFunc func(ctx context.Context, bucket, path string, reader io.Reader, contentType string) (string, error)
}

func (m *mockFileStorage) Upload(ctx context.Context, bucket, path string, reader io.Reader, contentType string) (string, error) {
	if m.uploadFunc == nil {
		return "", fmt.Errorf("not implemented")
	}
	return m.uploadFunc(ctx, bucket, path, reader, contentType)
}

// mockUserRepo は UserRepository のモック（テスト用の偽実装）です。
// 各メソッドの動作を関数フィールドで差し替えられるようにしています。
// これにより、テストごとに「DB がこう返す」という状況を自由に設定できます。
type mockUserRepo struct {
	createFunc            func(ctx context.Context, user *model.User) error
	getByIDFunc           func(ctx context.Context, id uuid.UUID) (*model.User, error)
	getByUsernameFunc     func(ctx context.Context, username string) (*model.User, error)
	updateFunc            func(ctx context.Context, user *model.User) error
	updateAvatarURLFunc   func(ctx context.Context, userID uuid.UUID, avatarURL string) error
	existsByUsernameFunc  func(ctx context.Context, username string) (bool, error)
}

func (m *mockUserRepo) Create(ctx context.Context, user *model.User) error {
	return m.createFunc(ctx, user)
}

func (m *mockUserRepo) GetByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	return m.getByIDFunc(ctx, id)
}

func (m *mockUserRepo) GetByUsername(ctx context.Context, username string) (*model.User, error) {
	return m.getByUsernameFunc(ctx, username)
}

func (m *mockUserRepo) Update(ctx context.Context, user *model.User) error {
	return m.updateFunc(ctx, user)
}

func (m *mockUserRepo) UpdateAvatarURL(ctx context.Context, userID uuid.UUID, avatarURL string) error {
	if m.updateAvatarURLFunc == nil {
		return fmt.Errorf("UpdateAvatarURL not implemented")
	}
	return m.updateAvatarURLFunc(ctx, userID, avatarURL)
}

func (m *mockUserRepo) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	return m.existsByUsernameFunc(ctx, username)
}

func TestCreateProfile_Success(t *testing.T) {
	userID := uuid.New()
	repo := &mockUserRepo{
		existsByUsernameFunc: func(ctx context.Context, username string) (bool, error) {
			return false, nil // ユーザー名は未使用
		},
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.User, error) {
			// 最初の呼び出し（既存チェック）は nil を返し、
			// 2回目（作成後の取得）はユーザーを返す
			if id == userID {
				return &model.User{
					ID:          userID,
					Username:    "testuser",
					DisplayName: "Test User",
				}, nil
			}
			return nil, nil
		},
		createFunc: func(ctx context.Context, user *model.User) error {
			return nil // 作成成功
		},
	}

	// ただし上のgetByIDFuncでは最初の呼び出しでもユーザーを返してしまうので、
	// 呼び出し回数をカウントして制御する
	callCount := 0
	repo.getByIDFunc = func(ctx context.Context, id uuid.UUID) (*model.User, error) {
		callCount++
		if callCount == 1 {
			return nil, nil // 最初: プロフィール未作成
		}
		return &model.User{
			ID:          userID,
			Username:    "testuser",
			DisplayName: "Test User",
		}, nil
	}

	uc := NewUserUsecase(repo, nil)

	user, err := uc.CreateProfile(context.Background(), userID, model.CreateProfileRequest{
		Username:    "testuser",
		DisplayName: "Test User",
	})

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if user.Username != "testuser" {
		t.Errorf("expected username 'testuser', got '%s'", user.Username)
	}
}

func TestCreateProfile_InvalidUsername(t *testing.T) {
	repo := &mockUserRepo{}
	uc := NewUserUsecase(repo, nil)

	// 短すぎるユーザー名
	_, err := uc.CreateProfile(context.Background(), uuid.New(), model.CreateProfileRequest{
		Username:    "ab",
		DisplayName: "Test",
	})
	if err == nil {
		t.Fatal("expected error for short username, got nil")
	}

	// 不正文字を含むユーザー名
	_, err = uc.CreateProfile(context.Background(), uuid.New(), model.CreateProfileRequest{
		Username:    "user@name",
		DisplayName: "Test",
	})
	if err == nil {
		t.Fatal("expected error for invalid username chars, got nil")
	}
}

func TestCreateProfile_UsernameTaken(t *testing.T) {
	repo := &mockUserRepo{
		existsByUsernameFunc: func(ctx context.Context, username string) (bool, error) {
			return true, nil // ユーザー名は既に使用済み
		},
	}
	uc := NewUserUsecase(repo, nil)

	_, err := uc.CreateProfile(context.Background(), uuid.New(), model.CreateProfileRequest{
		Username:    "takenuser",
		DisplayName: "Test",
	})
	if err == nil {
		t.Fatal("expected error for taken username, got nil")
	}
}

func TestCreateProfile_ProfileAlreadyExists(t *testing.T) {
	userID := uuid.New()
	repo := &mockUserRepo{
		existsByUsernameFunc: func(ctx context.Context, username string) (bool, error) {
			return false, nil
		},
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.User, error) {
			return &model.User{ID: userID}, nil // 既にプロフィールが存在
		},
	}
	uc := NewUserUsecase(repo, nil)

	_, err := uc.CreateProfile(context.Background(), userID, model.CreateProfileRequest{
		Username:    "newuser",
		DisplayName: "Test",
	})
	if err == nil {
		t.Fatal("expected error for existing profile, got nil")
	}
}

// TestCreateProfile_UniqueViolationRace は TOCTOU 競合状態のテストです。
// ExistsByUsername が false を返した直後に、別のリクエストが同じユーザー名で
// Insert を完了した場合、DB の UNIQUE 制約違反が発生します。
// この場合に ConflictError が適切に返されることを検証します。
func TestCreateProfile_UniqueViolationRace(t *testing.T) {
	userID := uuid.New()
	callCount := 0

	repo := &mockUserRepo{
		existsByUsernameFunc: func(ctx context.Context, username string) (bool, error) {
			// 競合状態の再現: チェック時点ではユーザー名は未使用
			return false, nil
		},
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.User, error) {
			callCount++
			if callCount == 1 {
				return nil, nil // プロフィール未作成
			}
			return &model.User{ID: userID, Username: "raceuser", DisplayName: "Race User"}, nil
		},
		createFunc: func(ctx context.Context, user *model.User) error {
			// 競合状態の再現: 別のリクエストが先に同じユーザー名で Insert を完了したため、
			// UNIQUE 制約違反が発生する
			return fmt.Errorf("pq: duplicate key value violates unique constraint \"users_username_key\"")
		},
	}

	uc := NewUserUsecase(repo, nil)

	_, err := uc.CreateProfile(context.Background(), userID, model.CreateProfileRequest{
		Username:    "raceuser",
		DisplayName: "Race User",
	})

	// エラーが返ること
	if err == nil {
		t.Fatal("expected error for unique violation race condition, got nil")
	}

	// ConflictError 型であること
	var conflictErr *ConflictError
	if !errors.As(err, &conflictErr) {
		t.Fatalf("expected ConflictError, got %T: %v", err, err)
	}

	// エラーメッセージが「username already taken」であること
	if conflictErr.Message != "username already taken" {
		t.Errorf("expected message 'username already taken', got '%s'", conflictErr.Message)
	}
}

// TestCreateProfile_CreateDBError は UNIQUE 制約違反以外の DB エラーが
// そのまま返されることを検証します（ConflictError にならないこと）。
func TestCreateProfile_CreateDBError(t *testing.T) {
	userID := uuid.New()
	callCount := 0

	repo := &mockUserRepo{
		existsByUsernameFunc: func(ctx context.Context, username string) (bool, error) {
			return false, nil
		},
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.User, error) {
			callCount++
			if callCount == 1 {
				return nil, nil
			}
			return &model.User{ID: userID}, nil
		},
		createFunc: func(ctx context.Context, user *model.User) error {
			return fmt.Errorf("database connection lost")
		},
	}

	uc := NewUserUsecase(repo, nil)

	_, err := uc.CreateProfile(context.Background(), userID, model.CreateProfileRequest{
		Username:    "testuser",
		DisplayName: "Test User",
	})

	if err == nil {
		t.Fatal("expected error for DB failure, got nil")
	}

	// ConflictError ではないこと（一般的なDBエラー）
	var conflictErr *ConflictError
	if errors.As(err, &conflictErr) {
		t.Fatal("expected non-ConflictError for general DB failure, but got ConflictError")
	}
}

func TestUpdateMyProfile_Success(t *testing.T) {
	userID := uuid.New()
	newName := "Updated Name"

	repo := &mockUserRepo{
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.User, error) {
			return &model.User{
				ID:          userID,
				Username:    "testuser",
				DisplayName: "Old Name",
			}, nil
		},
		updateFunc: func(ctx context.Context, user *model.User) error {
			return nil
		},
	}
	uc := NewUserUsecase(repo, nil)

	user, err := uc.UpdateMyProfile(context.Background(), userID, model.UpdateProfileRequest{
		DisplayName: &newName,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	// getByIDFunc は常に同じデータを返すのでここでは更新後の値チェックは省略
	if user == nil {
		t.Fatal("expected user, got nil")
	}
}

func TestUpdateMyProfile_InvalidDisplayName(t *testing.T) {
	userID := uuid.New()
	emptyName := ""

	repo := &mockUserRepo{
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.User, error) {
			return &model.User{ID: userID, Username: "testuser", DisplayName: "Old"}, nil
		},
	}
	uc := NewUserUsecase(repo, nil)

	_, err := uc.UpdateMyProfile(context.Background(), userID, model.UpdateProfileRequest{
		DisplayName: &emptyName,
	})
	if err == nil {
		t.Fatal("expected error for empty display name, got nil")
	}
}

func TestGetPublicProfile_NotFound(t *testing.T) {
	repo := &mockUserRepo{
		getByUsernameFunc: func(ctx context.Context, username string) (*model.User, error) {
			return nil, nil // 見つからない
		},
	}
	uc := NewUserUsecase(repo, nil)

	_, err := uc.GetPublicProfile(context.Background(), "nonexistent")
	if err == nil {
		t.Fatal("expected error for non-existent user, got nil")
	}
}

func TestGetMyProfile_NotFound(t *testing.T) {
	repo := &mockUserRepo{
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.User, error) {
			return nil, nil
		},
	}
	uc := NewUserUsecase(repo, nil)

	_, err := uc.GetMyProfile(context.Background(), uuid.New())
	if err == nil {
		t.Fatal("expected error for non-existent profile, got nil")
	}
}

func TestGetMyProfile_DBError(t *testing.T) {
	repo := &mockUserRepo{
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.User, error) {
			return nil, fmt.Errorf("database connection failed")
		},
	}
	uc := NewUserUsecase(repo, nil)

	_, err := uc.GetMyProfile(context.Background(), uuid.New())
	if err == nil {
		t.Fatal("expected error for DB failure, got nil")
	}
}

// ── UploadAvatar テスト ──

func TestUploadAvatar_Success(t *testing.T) {
	userID := uuid.New()
	expectedURL := "https://example.supabase.co/storage/v1/object/public/avatars/" + userID.String() + "/avatar.jpg"

	repo := &mockUserRepo{
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.User, error) {
			return &model.User{ID: userID, Username: "testuser", DisplayName: "Test"}, nil
		},
		updateAvatarURLFunc: func(ctx context.Context, uid uuid.UUID, avatarURL string) error {
			return nil
		},
	}
	store := &mockFileStorage{
		uploadFunc: func(ctx context.Context, bucket, path string, reader io.Reader, contentType string) (string, error) {
			return expectedURL, nil
		},
	}

	uc := NewUserUsecase(repo, store)

	url, err := uc.UploadAvatar(context.Background(), userID, strings.NewReader("fake-image-data"), 1024, "image/jpeg")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if url != expectedURL {
		t.Errorf("expected URL %s, got %s", expectedURL, url)
	}
}

func TestUploadAvatar_ProfileNotFound(t *testing.T) {
	repo := &mockUserRepo{
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.User, error) {
			return nil, nil // プロフィール未作成
		},
	}
	store := &mockFileStorage{}

	uc := NewUserUsecase(repo, store)

	_, err := uc.UploadAvatar(context.Background(), uuid.New(), strings.NewReader("data"), 1024, "image/jpeg")
	if err == nil {
		t.Fatal("expected error for missing profile, got nil")
	}

	var notFoundErr *NotFoundError
	if !errors.As(err, &notFoundErr) {
		t.Fatalf("expected NotFoundError, got %T: %v", err, err)
	}
}

func TestUploadAvatar_FileTooLarge(t *testing.T) {
	userID := uuid.New()
	repo := &mockUserRepo{
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.User, error) {
			return &model.User{ID: userID, Username: "testuser", DisplayName: "Test"}, nil
		},
	}
	store := &mockFileStorage{}

	uc := NewUserUsecase(repo, store)

	// 3MB（2MB 制限を超える）
	_, err := uc.UploadAvatar(context.Background(), userID, strings.NewReader("data"), 3*1024*1024, "image/jpeg")
	if err == nil {
		t.Fatal("expected error for oversized file, got nil")
	}

	var validationErr *ValidationError
	if !errors.As(err, &validationErr) {
		t.Fatalf("expected ValidationError, got %T: %v", err, err)
	}
}

func TestUploadAvatar_InvalidContentType(t *testing.T) {
	userID := uuid.New()
	repo := &mockUserRepo{
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.User, error) {
			return &model.User{ID: userID, Username: "testuser", DisplayName: "Test"}, nil
		},
	}
	store := &mockFileStorage{}

	uc := NewUserUsecase(repo, store)

	// GIF は許可されていない
	_, err := uc.UploadAvatar(context.Background(), userID, strings.NewReader("data"), 1024, "image/gif")
	if err == nil {
		t.Fatal("expected error for invalid content type, got nil")
	}

	var validationErr *ValidationError
	if !errors.As(err, &validationErr) {
		t.Fatalf("expected ValidationError, got %T: %v", err, err)
	}
}

func TestUploadAvatar_StorageError(t *testing.T) {
	userID := uuid.New()
	repo := &mockUserRepo{
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.User, error) {
			return &model.User{ID: userID, Username: "testuser", DisplayName: "Test"}, nil
		},
	}
	store := &mockFileStorage{
		uploadFunc: func(ctx context.Context, bucket, path string, reader io.Reader, contentType string) (string, error) {
			return "", fmt.Errorf("storage unavailable")
		},
	}

	uc := NewUserUsecase(repo, store)

	_, err := uc.UploadAvatar(context.Background(), userID, strings.NewReader("data"), 1024, "image/png")
	if err == nil {
		t.Fatal("expected error for storage failure, got nil")
	}

	// ストレージエラーは ValidationError でも NotFoundError でもない
	var validationErr *ValidationError
	var notFoundErr *NotFoundError
	if errors.As(err, &validationErr) || errors.As(err, &notFoundErr) {
		t.Fatal("expected internal error, not validation/notfound")
	}
}

func TestUploadAvatar_PNGContentType(t *testing.T) {
	userID := uuid.New()
	var capturedPath string

	repo := &mockUserRepo{
		getByIDFunc: func(ctx context.Context, id uuid.UUID) (*model.User, error) {
			return &model.User{ID: userID, Username: "testuser", DisplayName: "Test"}, nil
		},
		updateAvatarURLFunc: func(ctx context.Context, uid uuid.UUID, avatarURL string) error {
			return nil
		},
	}
	store := &mockFileStorage{
		uploadFunc: func(ctx context.Context, bucket, path string, reader io.Reader, contentType string) (string, error) {
			capturedPath = path
			return "https://example.com/" + path, nil
		},
	}

	uc := NewUserUsecase(repo, store)

	_, err := uc.UploadAvatar(context.Background(), userID, strings.NewReader("data"), 1024, "image/png")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// PNG の場合、パスの拡張子が .png であること
	expectedPath := userID.String() + "/avatar.png"
	if capturedPath != expectedPath {
		t.Errorf("expected path %s, got %s", expectedPath, capturedPath)
	}
}
