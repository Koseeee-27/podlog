package usecase

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/kobayashikosei/podlog/backend/internal/model"
)

// mockUserRepo は UserRepository のモック（テスト用の偽実装）です。
// 各メソッドの動作を関数フィールドで差し替えられるようにしています。
// これにより、テストごとに「DB がこう返す」という状況を自由に設定できます。
type mockUserRepo struct {
	createFunc          func(ctx context.Context, user *model.User) error
	getByIDFunc         func(ctx context.Context, id uuid.UUID) (*model.User, error)
	getByUsernameFunc   func(ctx context.Context, username string) (*model.User, error)
	updateFunc          func(ctx context.Context, user *model.User) error
	existsByUsernameFunc func(ctx context.Context, username string) (bool, error)
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

	uc := NewUserUsecase(repo)

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
	uc := NewUserUsecase(repo)

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
	uc := NewUserUsecase(repo)

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
	uc := NewUserUsecase(repo)

	_, err := uc.CreateProfile(context.Background(), userID, model.CreateProfileRequest{
		Username:    "newuser",
		DisplayName: "Test",
	})
	if err == nil {
		t.Fatal("expected error for existing profile, got nil")
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
	uc := NewUserUsecase(repo)

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
	uc := NewUserUsecase(repo)

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
	uc := NewUserUsecase(repo)

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
	uc := NewUserUsecase(repo)

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
	uc := NewUserUsecase(repo)

	_, err := uc.GetMyProfile(context.Background(), uuid.New())
	if err == nil {
		t.Fatal("expected error for DB failure, got nil")
	}
}
