"""
行番号追跡機能付きドキュメントローダー
"""

from pathlib import Path
from typing import Iterator

from langchain_community.document_loaders.base import BaseLoader
from langchain_core.documents import Document


class LineTrackingTextLoader(BaseLoader):
    """引用サポートのための行番号追跡機能付きテキストローダー"""

    def __init__(self, file_path: str, encoding: str = "utf-8"):
        self.file_path = Path(file_path)
        self.encoding = encoding

    def lazy_load(self) -> Iterator[Document]:
        """行オフセットメタデータ付きでファイルを読み込む"""
        with open(self.file_path, encoding=self.encoding) as f:
            content = f.read()

        # 行オフセットインデックスを構築: 各行の (開始文字位置, 終了文字位置)
        line_offsets: list[tuple[int, int]] = []
        current_pos = 0
        for line in content.split("\n"):
            line_end = current_pos + len(line)
            line_offsets.append((current_pos, line_end))
            current_pos = line_end + 1  # +1 は改行文字分

        metadata = {
            "source": str(self.file_path),
            "line_offsets": line_offsets,
            "total_lines": len(line_offsets),
        }

        yield Document(page_content=content, metadata=metadata)


def calculate_line_numbers(chunks: list[Document]) -> list[Document]:
    """文字位置に基づいてチャンクメタデータに start_line と end_line を追加"""
    for chunk in chunks:
        if "line_offsets" not in chunk.metadata or "start_index" not in chunk.metadata:
            continue

        line_offsets = chunk.metadata["line_offsets"]
        start_char = chunk.metadata["start_index"]
        end_char = start_char + len(chunk.page_content)

        # 開始行を検索 (1から始まる)
        start_line = 1
        for i, (line_start, line_end) in enumerate(line_offsets):
            if line_start <= start_char <= line_end:
                start_line = i + 1
                break
            if line_start > start_char:
                start_line = i
                break

        # 終了行を検索 (1から始まる)
        end_line = len(line_offsets)
        for i, (line_start, line_end) in enumerate(line_offsets):
            if line_start <= end_char <= line_end:
                end_line = i + 1
                break
            if line_start > end_char:
                end_line = i
                break

        chunk.metadata["start_line"] = start_line
        chunk.metadata["end_line"] = end_line

        # 大きなメタデータを削除 (ベクトルDBには保存しない)
        del chunk.metadata["line_offsets"]
        del chunk.metadata["total_lines"]

    return chunks
