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

from app.config import (
    get_settings,
    ChunkingStrategy,
    DocumentSet,
    CHUNKING_CONFIGS,
)
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
        # Also ensure optimized docs directory exists
        self.settings.documents_dir_optimized.mkdir(parents=True, exist_ok=True)

    def _get_documents_dir(self, document_set: DocumentSet) -> Path:
        """Get the documents directory for the specified document set"""
        if document_set == DocumentSet.OPTIMIZED:
            return self.settings.documents_dir_optimized
        return self.settings.documents_dir

    def _iter_documents(self, directory: Path):
        """指定ディレクトリ内の.txtと.mdファイルをイテレート"""
        yield from directory.glob("**/*.txt")
        yield from directory.glob("**/*.md")

    def _generate_id(self, filename: str, content: str) -> str:
        """ファイル名とコンテンツからIDを生成"""
        hash_input = f"{filename}:{content[:100]}"
        return hashlib.md5(hash_input.encode()).hexdigest()[:12]

    def load_documents(
        self,
        document_set: DocumentSet = DocumentSet.ORIGINAL
    ) -> list[Document]:
        """Load documents from the specified document set"""
        documents: list[Document] = []

        # Get the appropriate directory
        docs_dir = self._get_documents_dir(document_set)

        # Load documents from the directory
        if docs_dir.exists():
            loaded_docs = self._load_from_directory(docs_dir)
            for doc in loaded_docs:
                doc.metadata["doc_type"] = "sample"
                doc.metadata["document_set"] = document_set.value
            documents.extend(loaded_docs)

        # Also load uploaded documents (always included)
        if self.settings.uploads_dir.exists():
            uploaded_docs = self._load_from_directory(self.settings.uploads_dir)
            for doc in uploaded_docs:
                doc.metadata["doc_type"] = "uploaded"
                doc.metadata["document_set"] = "uploaded"
            documents.extend(uploaded_docs)

        print(f"{len(documents)}個のドキュメントを読み込みました (document_set={document_set.value})", flush=True)
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

    def split_documents(
        self,
        documents: list[Document],
        strategy: ChunkingStrategy = ChunkingStrategy.STANDARD,
    ) -> list[Document]:
        """Split documents into chunks using the specified strategy"""
        if not documents:
            return []

        config = CHUNKING_CONFIGS[strategy]

        if strategy == ChunkingStrategy.PARENT_CHILD:
            return self._split_parent_child(documents, config)
        elif strategy == ChunkingStrategy.HYPOTHETICAL_QUESTIONS:
            return self._split_hypothetical_questions(documents, config)
        else:
            return self._split_standard(documents, config)

    def _split_standard(
        self,
        documents: list[Document],
        config: dict,
    ) -> list[Document]:
        """Standard chunking strategy"""
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=config["chunk_size"],
            chunk_overlap=config["chunk_overlap"],
            length_function=len,
            add_start_index=True,
        )
        chunks = splitter.split_documents(documents)

        # Add line numbers to metadata
        chunks = calculate_line_numbers(chunks)

        # Add chunking metadata
        for chunk in chunks:
            chunk.metadata["chunking_strategy"] = "standard"
            chunk.metadata["chunk_size"] = config["chunk_size"]

        print(f"{len(chunks)}個のチャンクに分割しました (standard)", flush=True)
        return chunks

    def _split_parent_child(
        self,
        documents: list[Document],
        config: dict,
    ) -> list[Document]:
        """
        Parent-child chunking strategy.

        Creates small chunks for retrieval but stores reference to parent chunk
        for providing more context to the LLM.
        """
        # First, create parent chunks
        parent_splitter = RecursiveCharacterTextSplitter(
            chunk_size=config["parent_chunk_size"],
            chunk_overlap=config["parent_chunk_overlap"],
            length_function=len,
            add_start_index=True,
        )
        parent_chunks = parent_splitter.split_documents(documents)

        # Then create child chunks from each parent
        child_splitter = RecursiveCharacterTextSplitter(
            chunk_size=config["child_chunk_size"],
            chunk_overlap=config["child_chunk_overlap"],
            length_function=len,
            add_start_index=True,
        )

        all_chunks = []
        for i, parent in enumerate(parent_chunks):
            # Create a document from the parent's content
            parent_doc = Document(
                page_content=parent.page_content,
                metadata=parent.metadata.copy(),
            )

            # Split into child chunks
            child_chunks = child_splitter.split_documents([parent_doc])

            # Add parent reference to each child
            for child in child_chunks:
                child.metadata["parent_id"] = i
                child.metadata["parent_content"] = parent.page_content
                child.metadata["chunking_strategy"] = "parent_child"
                child.metadata["is_child"] = True

            all_chunks.extend(child_chunks)

        # Add line numbers to metadata
        all_chunks = calculate_line_numbers(all_chunks)

        print(f"{len(all_chunks)}個のチャンクに分割しました (parent-child: {len(parent_chunks)} parents)", flush=True)
        return all_chunks

    def _split_hypothetical_questions(
        self,
        documents: list[Document],
        config: dict,
    ) -> list[Document]:
        """
        Hypothetical Questions chunking strategy.

        Generates user-facing questions for each chunk using an LLM.
        The questions are indexed (for similarity search), but metadata
        contains the original chunk content (for LLM context).

        This solves the alias mismatch problem by resolving domain terminology
        (e.g., "第2条の2に定める者") to user language (e.g., "アルバイト")
        at index time.
        """
        from app.services.question_generator import get_question_generator

        # First, create standard chunks
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=config["chunk_size"],
            chunk_overlap=config["chunk_overlap"],
            length_function=len,
            add_start_index=True,
            separators=["\n## ", "\n### ", "\n\n", "\n", "。", "、", " "],
        )
        chunks = splitter.split_documents(documents)

        # Add line numbers to metadata
        chunks = calculate_line_numbers(chunks)

        # Generate questions for each chunk
        generator = get_question_generator()
        num_questions = config.get("questions_per_chunk", 3)

        print(f"[HypotheticalQuestions] Generating questions for {len(chunks)} chunks...", flush=True)

        question_docs = []
        for i, chunk in enumerate(chunks):
            chunk_id = f"chunk_{i}"

            # Generate hypothetical questions
            questions = generator.generate_questions(chunk.page_content, num_questions)

            if not questions:
                print(f"  Warning: No questions generated for chunk {i + 1}, using chunk as-is", flush=True)
                # Fallback: use the chunk itself if no questions generated
                question_doc = Document(
                    page_content=chunk.page_content[:200],  # Use first 200 chars as "question"
                    metadata={
                        **chunk.metadata,
                        "chunk_id": chunk_id,
                        "original_content": chunk.page_content,
                        "chunking_strategy": "hypothetical_questions",
                        "is_question": True,
                        "question_index": 0,
                    }
                )
                question_docs.append(question_doc)
            else:
                # Create question documents pointing to this chunk
                for q_idx, question in enumerate(questions):
                    question_doc = Document(
                        page_content=question,
                        metadata={
                            **chunk.metadata,
                            "chunk_id": chunk_id,
                            "original_content": chunk.page_content,
                            "chunking_strategy": "hypothetical_questions",
                            "is_question": True,
                            "question_index": q_idx,
                        }
                    )
                    question_docs.append(question_doc)

        print(f"{len(question_docs)}個の質問ドキュメントを生成しました (hypothetical_questions: {len(chunks)} original chunks)", flush=True)
        return question_docs

    def list_documents(
        self,
        document_set: DocumentSet = DocumentSet.ORIGINAL
    ) -> list[DocumentInfo]:
        """Get document info for the specified document set"""
        documents: list[DocumentInfo] = []

        # Get documents from the appropriate directory
        docs_dir = self._get_documents_dir(document_set)

        for file_path in self._iter_documents(docs_dir):
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

        # Also list uploaded documents
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

    def has_documents(
        self,
        document_set: DocumentSet = DocumentSet.ORIGINAL
    ) -> bool:
        """Check if documents exist for the specified document set"""
        docs_dir = self._get_documents_dir(document_set)
        sample_exists = any(self._iter_documents(docs_dir))
        uploads_exist = any(self._iter_documents(self.settings.uploads_dir))
        return sample_exists or uploads_exist

    def get_document_content(self, doc_id: str) -> tuple[DocumentInfo, str]:
        """ドキュメントの内容を取得"""
        # Check both original and optimized directories
        for docs_dir, doc_set in [
            (self.settings.documents_dir, DocumentSet.ORIGINAL),
            (self.settings.documents_dir_optimized, DocumentSet.OPTIMIZED),
        ]:
            for file_path in self._iter_documents(docs_dir):
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

    def get_available_strategies(self) -> list[dict]:
        """Get list of available chunking strategies with descriptions"""
        return [
            {
                "id": ChunkingStrategy.STANDARD.value,
                "name": "Standard (1000/200)",
                "description": "標準的なチャンキング。チャンクサイズ1000文字、オーバーラップ200文字。",
            },
            {
                "id": ChunkingStrategy.LARGE.value,
                "name": "Large (2000/500)",
                "description": "大きめのチャンク。より多くのコンテキストを保持。",
            },
            {
                "id": ChunkingStrategy.PARENT_CHILD.value,
                "name": "Parent-Child",
                "description": "小さなチャンクで検索し、親チャンクをコンテキストとして使用。",
            },
            {
                "id": ChunkingStrategy.HYPOTHETICAL_QUESTIONS.value,
                "name": "Hypothetical Questions",
                "description": "LLMでユーザー視点の質問を生成してインデックス。エイリアス問題を解決。",
            },
        ]

    def get_available_document_sets(self) -> list[dict]:
        """Get list of available document sets with descriptions"""
        original_count = len(list(self._iter_documents(self.settings.documents_dir)))
        optimized_count = len(list(self._iter_documents(self.settings.documents_dir_optimized)))

        return [
            {
                "id": DocumentSet.ORIGINAL.value,
                "name": "Original Documents",
                "description": f"元の規程文書 ({original_count}ファイル)",
                "document_count": original_count,
            },
            {
                "id": DocumentSet.OPTIMIZED.value,
                "name": "Optimized Documents",
                "description": f"前処理済み文書 ({optimized_count}ファイル)",
                "document_count": optimized_count,
            },
        ]


# シングルトンインスタンス
_document_service: DocumentService | None = None


def get_document_service() -> DocumentService:
    """ドキュメントサービスのインスタンスを取得"""
    global _document_service
    if _document_service is None:
        _document_service = DocumentService()
    return _document_service
