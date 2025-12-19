"""
ベクトルストアサービス - 複数コレクション対応
"""

from pathlib import Path
from typing import Optional

from langchain_chroma import Chroma
from langchain_core.documents import Document

from app.config import get_settings, ChunkingStrategy, DocumentSet
from app.services.embedding_service import get_embedding_service


def get_collection_name(
    document_set: DocumentSet,
    strategy: ChunkingStrategy,
) -> str:
    """Generate a unique collection name based on document set and strategy"""
    return f"{document_set.value}_{strategy.value}"


class VectorStoreService:
    """Chromaベクトルストア管理サービス - 複数コレクション対応"""

    def __init__(self):
        self.settings = get_settings()
        # Store multiple vectorstores keyed by collection name
        self._vectorstores: dict[str, Chroma] = {}
        # Track the currently active collection
        self._current_collection: str | None = None

    @property
    def db_path(self) -> Path:
        """ベクトルDBのパス"""
        return self.settings.chroma_db_dir

    @property
    def is_ready(self) -> bool:
        """ベクトルストアが準備できているかチェック"""
        return self._current_collection is not None and self._current_collection in self._vectorstores

    def get_or_create(
        self,
        chunks: list[Document] | None = None,
        document_set: DocumentSet = DocumentSet.ORIGINAL,
        strategy: ChunkingStrategy = ChunkingStrategy.STANDARD,
    ) -> Chroma:
        """Get or create vectorstore for the specified document set and strategy"""
        collection_name = get_collection_name(document_set, strategy)
        embedding_service = get_embedding_service()

        # Check if we already have this collection loaded
        if collection_name in self._vectorstores:
            self._current_collection = collection_name
            return self._vectorstores[collection_name]

        # Try to load existing collection
        collection_path = self.db_path / collection_name
        if collection_path.exists() and chunks is None:
            print(f"既存のベクトルストアを読み込み中: {collection_name}", flush=True)
            vectorstore = Chroma(
                persist_directory=str(collection_path),
                embedding_function=embedding_service.embeddings,
                collection_name=collection_name,
            )
            self._vectorstores[collection_name] = vectorstore
            self._current_collection = collection_name
            return vectorstore

        if chunks is None:
            raise ValueError(f"既存のベクトルストアがなく、チャンクも提供されていません: {collection_name}")

        # Create new vectorstore
        print(f"新しいベクトルストアを作成中: {collection_name}", flush=True)
        collection_path.mkdir(parents=True, exist_ok=True)
        vectorstore = Chroma.from_documents(
            documents=chunks,
            embedding=embedding_service.embeddings,
            persist_directory=str(collection_path),
            collection_name=collection_name,
        )
        self._vectorstores[collection_name] = vectorstore
        self._current_collection = collection_name
        return vectorstore

    def rebuild(
        self,
        chunks: list[Document],
        document_set: DocumentSet = DocumentSet.ORIGINAL,
        strategy: ChunkingStrategy = ChunkingStrategy.STANDARD,
    ) -> Chroma:
        """Rebuild vectorstore for the specified document set and strategy"""
        collection_name = get_collection_name(document_set, strategy)

        # Delete existing collection if it exists
        if collection_name in self._vectorstores:
            try:
                vectorstore = self._vectorstores[collection_name]
                vectorstore._client.delete_collection(collection_name)
            except Exception:
                pass
            del self._vectorstores[collection_name]

        # Delete the directory
        collection_path = self.db_path / collection_name
        if collection_path.exists():
            import shutil
            shutil.rmtree(collection_path)

        # Create new
        return self.get_or_create(chunks, document_set, strategy)

    def get_retriever(
        self,
        k: int | None = None,
        document_set: Optional[DocumentSet] = None,
        strategy: Optional[ChunkingStrategy] = None,
    ):
        """Get retriever for the specified or current collection"""
        if document_set is not None and strategy is not None:
            collection_name = get_collection_name(document_set, strategy)
            if collection_name not in self._vectorstores:
                raise ValueError(f"ベクトルストアが初期化されていません: {collection_name}")
            vectorstore = self._vectorstores[collection_name]
        elif self._current_collection is not None:
            vectorstore = self._vectorstores[self._current_collection]
        else:
            raise ValueError("ベクトルストアが初期化されていません")

        k = k or self.settings.retriever_k
        return vectorstore.as_retriever(search_kwargs={"k": k})

    def similarity_search_with_score(
        self,
        query: str,
        k: int | None = None,
        document_set: Optional[DocumentSet] = None,
        strategy: Optional[ChunkingStrategy] = None,
    ) -> list[tuple[Document, float]]:
        """
        Perform similarity search and return documents with scores.
        Useful for chunk visualization.
        """
        if document_set is not None and strategy is not None:
            collection_name = get_collection_name(document_set, strategy)
            if collection_name not in self._vectorstores:
                raise ValueError(f"ベクトルストアが初期化されていません: {collection_name}")
            vectorstore = self._vectorstores[collection_name]
        elif self._current_collection is not None:
            vectorstore = self._vectorstores[self._current_collection]
        else:
            raise ValueError("ベクトルストアが初期化されていません")

        k = k or self.settings.retriever_k
        return vectorstore.similarity_search_with_score(query, k=k)

    def exists(
        self,
        document_set: Optional[DocumentSet] = None,
        strategy: Optional[ChunkingStrategy] = None,
    ) -> bool:
        """Check if vectorstore exists for the specified or default collection"""
        if document_set is not None and strategy is not None:
            collection_name = get_collection_name(document_set, strategy)
            collection_path = self.db_path / collection_name
            return collection_path.exists()

        # Check if any collection exists
        return self.db_path.exists() and any(self.db_path.iterdir())

    def get_available_collections(self) -> list[dict]:
        """Get list of available (built) collections"""
        collections = []
        if not self.db_path.exists():
            return collections

        for path in self.db_path.iterdir():
            if path.is_dir():
                parts = path.name.split("_")
                if len(parts) >= 2:
                    doc_set = parts[0]
                    strategy = "_".join(parts[1:])
                    collections.append({
                        "name": path.name,
                        "document_set": doc_set,
                        "strategy": strategy,
                        "is_loaded": path.name in self._vectorstores,
                    })
        return collections

    def set_active_collection(
        self,
        document_set: DocumentSet,
        strategy: ChunkingStrategy,
    ) -> bool:
        """Set the active collection (must already be loaded or exist on disk)"""
        collection_name = get_collection_name(document_set, strategy)

        if collection_name in self._vectorstores:
            self._current_collection = collection_name
            return True

        # Try to load from disk
        collection_path = self.db_path / collection_name
        if collection_path.exists():
            self.get_or_create(document_set=document_set, strategy=strategy)
            return True

        return False

    def build_all_collections(self) -> dict[str, int]:
        """
        Pre-build all collection combinations for faster switching.
        Returns dict mapping collection_name -> chunk_count (-1 if already exists)
        """
        from app.services.document_service import get_document_service

        doc_service = get_document_service()
        results = {}

        for doc_set in DocumentSet:
            if not doc_service.has_documents(doc_set):
                print(f"[Build All] Skipping {doc_set.value}: no documents", flush=True)
                continue

            documents = doc_service.load_documents(doc_set)
            print(f"[Build All] Loaded {len(documents)} documents for {doc_set.value}", flush=True)

            for strategy in ChunkingStrategy:
                collection_name = get_collection_name(doc_set, strategy)

                # Skip if already exists on disk
                collection_path = self.db_path / collection_name
                if collection_path.exists():
                    print(f"[Build All] Collection already exists: {collection_name}", flush=True)
                    results[collection_name] = -1
                    continue

                # Build collection
                print(f"[Build All] Building collection: {collection_name}", flush=True)
                chunks = doc_service.split_documents(documents, strategy)
                self.get_or_create(chunks, doc_set, strategy)
                results[collection_name] = len(chunks)
                print(f"[Build All] Created {collection_name} with {len(chunks)} chunks", flush=True)

        return results


# シングルトンインスタンス
_vectorstore_service: VectorStoreService | None = None


def get_vectorstore_service() -> VectorStoreService:
    """ベクトルストアサービスのインスタンスを取得"""
    global _vectorstore_service
    if _vectorstore_service is None:
        _vectorstore_service = VectorStoreService()
    return _vectorstore_service
