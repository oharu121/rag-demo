"""
日本語エラーメッセージ
"""


class ErrorMessages:
    """日本語エラーメッセージ定義"""

    # API関連
    RATE_LIMIT_EXCEEDED = "リクエスト制限に達しました。しばらくお待ちください。"
    INTERNAL_ERROR = "内部エラーが発生しました。"
    INVALID_REQUEST = "無効なリクエストです。"

    # 認証関連
    API_KEY_MISSING = "Google APIキーが設定されていません。"
    API_KEY_INVALID = "Google APIキーが無効です。"

    # ドキュメント関連
    DOCUMENT_NOT_FOUND = "ドキュメントが見つかりません。"
    DOCUMENT_UPLOAD_FAILED = "ドキュメントのアップロードに失敗しました。"
    DOCUMENT_DELETE_FAILED = "ドキュメントの削除に失敗しました。"
    INVALID_FILE_TYPE = "無効なファイル形式です。テキストファイル(.txt)のみ対応しています。"
    FILE_TOO_LARGE = "ファイルサイズが大きすぎます。1MB以下のファイルをアップロードしてください。"
    NO_DOCUMENTS = "ドキュメントがありません。ドキュメントをアップロードしてください。"

    # RAG関連
    VECTORSTORE_NOT_READY = "ベクトルストアの準備ができていません。"
    EMBEDDING_MODEL_ERROR = "埋め込みモデルの読み込みに失敗しました。"
    LLM_ERROR = "LLMの応答生成に失敗しました。"
    QUERY_TOO_LONG = "質問が長すぎます。短くしてください。"

    # システム関連
    SERVICE_UNAVAILABLE = "サービスが一時的に利用できません。"
    INITIALIZATION_IN_PROGRESS = "システムを初期化中です。しばらくお待ちください。"


class RAGException(Exception):
    """RAGアプリケーション用カスタム例外"""

    def __init__(self, message: str, code: str = "INTERNAL_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)


class RateLimitException(RAGException):
    """レート制限例外"""

    def __init__(self):
        super().__init__(ErrorMessages.RATE_LIMIT_EXCEEDED, "RATE_LIMIT_EXCEEDED")


class DocumentException(RAGException):
    """ドキュメント関連例外"""

    pass


class ConfigurationException(RAGException):
    """設定関連例外"""

    pass
