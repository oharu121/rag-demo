"""
ドキュメント前処理サービス

規程文書を従業員タイプ別に分割し、曖昧さを解消する。
例：通勤手当規程.md → 通勤手当規程_正社員.md, 通勤手当規程_パート.md, 通勤手当規程_アルバイト.md
"""

import re
from pathlib import Path
from typing import Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate

from app.config import get_settings


class DocumentPreprocessor:
    """規程文書を従業員タイプ別に分割するサービス"""

    EMPLOYEE_TYPES = ["正社員", "パートタイム", "アルバイト"]

    def __init__(self):
        self.settings = get_settings()
        self._llm: Optional[ChatGoogleGenerativeAI] = None

    def _get_llm(self) -> ChatGoogleGenerativeAI:
        """LLMインスタンスを取得"""
        if self._llm is None:
            self._llm = ChatGoogleGenerativeAI(
                model=self.settings.llm_model,
                google_api_key=self.settings.google_api_key,
                temperature=0.1,  # Low temperature for consistent output
            )
        return self._llm

    def preprocess_document(self, content: str, filename: str, employee_type: str) -> str:
        """
        ドキュメントを特定の従業員タイプ向けに再構成する

        Args:
            content: 元のドキュメント内容
            filename: ファイル名（コンテキスト用）
            employee_type: 対象の従業員タイプ（正社員、パートタイム、アルバイト）

        Returns:
            再構成されたドキュメント
        """
        llm = self._get_llm()

        template = """あなたは企業の規程文書を再構成する専門家です。

以下の規程文書を「{employee_type}」向けに再構成してください。

## 再構成のルール：
1. 一般的な条項（全従業員に適用）は維持する
2. 附則や特則で「{employee_type}」に特有のルールがある場合は、それを本文に統合する
3. 他の従業員タイプ（例：正社員向けの場合はアルバイト向けの特則）は削除する
4. 元の条項番号は維持しつつ、内容を明確にする
5. 出力はMarkdown形式で、元の構造を保つ
6. 「{employee_type}向け」であることをタイトルに明記する

## 元の文書：
ファイル名: {filename}

{content}

## 出力：
「{employee_type}」向けに再構成した規程文書を出力してください。"""

        prompt = ChatPromptTemplate.from_template(template)
        chain = prompt | llm

        result = chain.invoke({
            "content": content,
            "filename": filename,
            "employee_type": employee_type,
        })

        content_result = result.content
        if isinstance(content_result, list):
            # Handle case where content is a list of content blocks
            return "".join(str(item) for item in content_result)
        return str(content_result)

    def preprocess_all_documents(
        self,
        source_dir: Optional[Path] = None,
        output_dir: Optional[Path] = None,
    ) -> dict[str, list[str]]:
        """
        ソースディレクトリ内の全ドキュメントを処理し、従業員タイプ別に分割

        Returns:
            dict: {元ファイル名: [生成されたファイル名のリスト]}
        """
        source_dir = source_dir or self.settings.documents_dir
        output_dir = output_dir or self.settings.documents_dir_optimized

        # 出力ディレクトリを作成
        output_dir.mkdir(parents=True, exist_ok=True)

        results: dict[str, list[str]] = {}

        # .mdファイルを処理
        for file_path in source_dir.glob("*.md"):
            print(f"Processing: {file_path.name}", flush=True)
            content = file_path.read_text(encoding="utf-8")

            generated_files = []

            for emp_type in self.EMPLOYEE_TYPES:
                # 従業員タイプを安全なファイル名に変換
                safe_emp_type = emp_type.replace("タイム", "")  # パートタイム → パート

                # 出力ファイル名
                output_filename = f"{file_path.stem}_{safe_emp_type}.md"
                output_path = output_dir / output_filename

                print(f"  Generating: {output_filename} ({emp_type}向け)", flush=True)

                try:
                    # LLMで再構成
                    restructured = self.preprocess_document(content, file_path.name, emp_type)

                    # 保存
                    output_path.write_text(restructured, encoding="utf-8")
                    generated_files.append(output_filename)
                    print(f"  ✓ Saved: {output_filename}", flush=True)

                except Exception as e:
                    print(f"  ✗ Error processing {output_filename}: {e}", flush=True)

            results[file_path.name] = generated_files

        return results

    def preprocess_single_document(
        self,
        filename: str,
        source_dir: Optional[Path] = None,
        output_dir: Optional[Path] = None,
    ) -> list[str]:
        """
        単一のドキュメントを処理

        Args:
            filename: 処理するファイル名

        Returns:
            生成されたファイル名のリスト
        """
        source_dir = source_dir or self.settings.documents_dir
        output_dir = output_dir or self.settings.documents_dir_optimized

        file_path = source_dir / filename
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        output_dir.mkdir(parents=True, exist_ok=True)

        content = file_path.read_text(encoding="utf-8")
        generated_files = []

        for emp_type in self.EMPLOYEE_TYPES:
            safe_emp_type = emp_type.replace("タイム", "")
            output_filename = f"{file_path.stem}_{safe_emp_type}.md"
            output_path = output_dir / output_filename

            print(f"Generating: {output_filename} ({emp_type}向け)", flush=True)

            try:
                restructured = self.preprocess_document(content, file_path.name, emp_type)
                output_path.write_text(restructured, encoding="utf-8")
                generated_files.append(output_filename)
                print(f"✓ Saved: {output_filename}", flush=True)
            except Exception as e:
                print(f"✗ Error: {e}", flush=True)

        return generated_files


# シングルトンインスタンス
_preprocessor: Optional[DocumentPreprocessor] = None


def get_document_preprocessor() -> DocumentPreprocessor:
    """ドキュメント前処理サービスのインスタンスを取得"""
    global _preprocessor
    if _preprocessor is None:
        _preprocessor = DocumentPreprocessor()
    return _preprocessor


# CLI用のエントリーポイント
if __name__ == "__main__":
    import sys

    preprocessor = get_document_preprocessor()

    if len(sys.argv) > 1:
        # 特定のファイルを処理
        filename = sys.argv[1]
        print(f"Processing single file: {filename}")
        result = preprocessor.preprocess_single_document(filename)
        print(f"Generated files: {result}")
    else:
        # 全ファイルを処理
        print("Processing all documents...")
        results = preprocessor.preprocess_all_documents()
        print("\n=== Summary ===")
        for original, generated in results.items():
            print(f"{original} -> {len(generated)} files")
