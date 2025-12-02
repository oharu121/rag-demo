"""
ドキュメント処理サービス
"""

import hashlib
import shutil
from pathlib import Path
from typing import Literal

from langchain_community.document_loaders import DirectoryLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import get_settings
from app.utils.line_tracker import LineTrackingTextLoader, calculate_line_numbers
from app.utils.errors import DocumentException, ErrorMessages


class DocumentInfo:
    """ドキュメント情報"""

    def __init__(
        self,
        id: str,
        filename: str,
        doc_type: Literal["sample", "uploaded"],
        status: Literal["ready", "processing", "error"] = "ready",
        line_count: int = 0,
    ):
        self.id = id
        self.filename = filename
        self.type = doc_type
        self.status = status
        self.line_count = line_count

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "filename": self.filename,
            "type": self.type,
            "status": self.status,
            "line_count": self.line_count,
        }


class DocumentService:
    """ドキュメント管理サービス"""

    def __init__(self):
        self.settings = get_settings()
        self._ensure_directories()

    def _ensure_directories(self) -> None:
        """必要なディレクトリを作成"""
        self.settings.documents_dir.mkdir(parents=True, exist_ok=True)
        self.settings.uploads_dir.mkdir(parents=True, exist_ok=True)

    def _iter_documents(self, directory: Path):
        """指定ディレクトリ内の.txtと.mdファイルをイテレート"""
        yield from directory.glob("**/*.txt")
        yield from directory.glob("**/*.md")

    def _generate_id(self, filename: str, content: str) -> str:
        """ファイル名とコンテンツからIDを生成"""
        hash_input = f"{filename}:{content[:100]}"
        return hashlib.md5(hash_input.encode()).hexdigest()[:12]

    def load_documents(self) -> list[Document]:
        """サンプルとアップロードされたドキュメントを全て読み込む"""
        documents: list[Document] = []

        # サンプルドキュメントを読み込み
        if self.settings.documents_dir.exists():
            sample_docs = self._load_from_directory(self.settings.documents_dir)
            for doc in sample_docs:
                doc.metadata["doc_type"] = "sample"
            documents.extend(sample_docs)

        # アップロードされたドキュメントを読み込み
        if self.settings.uploads_dir.exists():
            uploaded_docs = self._load_from_directory(self.settings.uploads_dir)
            for doc in uploaded_docs:
                doc.metadata["doc_type"] = "uploaded"
            documents.extend(uploaded_docs)

        print(f"{len(documents)}個のドキュメントを読み込みました", flush=True)
        return documents

    def _load_from_directory(self, directory: Path) -> list[Document]:
        """指定ディレクトリからドキュメントを読み込む"""
        if not directory.exists() or not any(self._iter_documents(directory)):
            return []

        documents: list[Document] = []
        for pattern in ["**/*.txt", "**/*.md"]:
            loader = DirectoryLoader(
                str(directory),
                glob=pattern,
                loader_cls=LineTrackingTextLoader,  # type: ignore[arg-type]
                loader_kwargs={"encoding": "utf-8"},
            )
            documents.extend(loader.load())
        return documents

    def split_documents(self, documents: list[Document]) -> list[Document]:
        """ドキュメントをチャンクに分割"""
        if not documents:
            return []

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.settings.chunk_size,
            chunk_overlap=self.settings.chunk_overlap,
            length_function=len,
            add_start_index=True,
        )
        chunks = splitter.split_documents(documents)

        # 行番号をメタデータに追加
        chunks = calculate_line_numbers(chunks)

        print(f"{len(chunks)}個のチャンクに分割しました", flush=True)
        return chunks

    def list_documents(self) -> list[DocumentInfo]:
        """全てのドキュメント情報を取得"""
        documents: list[DocumentInfo] = []

        # サンプルドキュメント
        for file_path in self._iter_documents(self.settings.documents_dir):
            content = file_path.read_text(encoding="utf-8")
            line_count = len(content.split("\n"))
            doc_id = self._generate_id(file_path.name, content)
            documents.append(
                DocumentInfo(
                    id=doc_id,
                    filename=file_path.name,
                    doc_type="sample",
                    status="ready",
                    line_count=line_count,
                )
            )

        # アップロードされたドキュメント
        for file_path in self._iter_documents(self.settings.uploads_dir):
            content = file_path.read_text(encoding="utf-8")
            line_count = len(content.split("\n"))
            doc_id = self._generate_id(file_path.name, content)
            documents.append(
                DocumentInfo(
                    id=doc_id,
                    filename=file_path.name,
                    doc_type="uploaded",
                    status="ready",
                    line_count=line_count,
                )
            )

        return documents

    async def upload_document(self, filename: str, content: bytes) -> DocumentInfo:
        """ドキュメントをアップロード"""
        # バリデーション
        if not filename.endswith(".txt") and not filename.endswith(".md"):
            raise DocumentException(ErrorMessages.INVALID_FILE_TYPE, "INVALID_FILE_TYPE")

        if len(content) > 1024 * 1024:  # 1MB
            raise DocumentException(ErrorMessages.FILE_TOO_LARGE, "FILE_TOO_LARGE")

        # UTF-8としてデコード
        try:
            text_content = content.decode("utf-8")
        except UnicodeDecodeError:
            raise DocumentException(
                "ファイルのエンコーディングが無効です。UTF-8形式のファイルをアップロードしてください。",
                "INVALID_ENCODING",
            )

        # ファイルを保存
        file_path = self.settings.uploads_dir / filename
        file_path.write_text(text_content, encoding="utf-8")

        line_count = len(text_content.split("\n"))
        doc_id = self._generate_id(filename, text_content)

        return DocumentInfo(
            id=doc_id,
            filename=filename,
            doc_type="uploaded",
            status="ready",
            line_count=line_count,
        )

    def delete_document(self, doc_id: str) -> bool:
        """アップロードされたドキュメントを削除"""
        # アップロードフォルダ内のみ削除可能
        for file_path in self._iter_documents(self.settings.uploads_dir):
            content = file_path.read_text(encoding="utf-8")
            if self._generate_id(file_path.name, content) == doc_id:
                file_path.unlink()
                return True

        raise DocumentException(ErrorMessages.DOCUMENT_NOT_FOUND, "NOT_FOUND")

    def has_documents(self) -> bool:
        """ドキュメントが存在するかチェック"""
        sample_exists = any(self._iter_documents(self.settings.documents_dir))
        uploads_exist = any(self._iter_documents(self.settings.uploads_dir))
        return sample_exists or uploads_exist

    def get_document_content(self, doc_id: str) -> tuple[DocumentInfo, str]:
        """ドキュメントの内容を取得"""
        # サンプルドキュメントを検索
        for file_path in self._iter_documents(self.settings.documents_dir):
            content = file_path.read_text(encoding="utf-8")
            if self._generate_id(file_path.name, content) == doc_id:
                line_count = len(content.split("\n"))
                doc_info = DocumentInfo(
                    id=doc_id,
                    filename=file_path.name,
                    doc_type="sample",
                    status="ready",
                    line_count=line_count,
                )
                return doc_info, content

        # アップロードされたドキュメントを検索
        for file_path in self._iter_documents(self.settings.uploads_dir):
            content = file_path.read_text(encoding="utf-8")
            if self._generate_id(file_path.name, content) == doc_id:
                line_count = len(content.split("\n"))
                doc_info = DocumentInfo(
                    id=doc_id,
                    filename=file_path.name,
                    doc_type="uploaded",
                    status="ready",
                    line_count=line_count,
                )
                return doc_info, content

        raise DocumentException(ErrorMessages.DOCUMENT_NOT_FOUND, "NOT_FOUND")


# シングルトンインスタンス
_document_service: DocumentService | None = None


def get_document_service() -> DocumentService:
    """ドキュメントサービスのインスタンスを取得"""
    global _document_service
    if _document_service is None:
        _document_service = DocumentService()
    return _document_service
