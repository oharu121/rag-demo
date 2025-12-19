"""
仮説質問生成サービス - Hypothetical Questions Generation

LLMを使用してチャンクからユーザー視点の質問を生成します。
これにより、エイリアス問題（例：「アルバイト」vs「第2条の2に定める者」）を
インデックス時に解決できます。
"""

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.documents import Document

from app.config import get_settings


class QuestionGenerator:
    """チャンクから仮説質問を生成するサービス"""

    def __init__(self):
        self.settings = get_settings()
        self._llm = None

    def _get_llm(self) -> ChatGoogleGenerativeAI:
        """LLMインスタンスを取得（遅延初期化）"""
        if self._llm is None:
            self._llm = ChatGoogleGenerativeAI(
                model=self.settings.llm_model,
                google_api_key=self.settings.google_api_key,
                temperature=0.7,  # 多様な質問生成のため少し高めに設定
                max_retries=2,
            )
        return self._llm

    def generate_questions(self, chunk_content: str, num_questions: int = 3) -> list[str]:
        """
        チャンクの内容からユーザーが尋ねそうな質問を生成

        Args:
            chunk_content: チャンクのテキスト内容
            num_questions: 生成する質問の数

        Returns:
            生成された質問のリスト
        """
        prompt = f"""以下の社内規程の文書セクションを読んで、従業員がこの内容について尋ねそうな質問を{num_questions}個生成してください。

重要な要件：
- 質問は自然な日本語で、従業員が実際に使う言葉で作成してください
- 「第2条の2に定める者」「短期雇用者」などの法律用語は、「アルバイト」「パート」「パートタイマー」など一般的な言葉に置き換えてください
- 質問は具体的で、このテキストから回答できるものにしてください
- 各質問は1行に1つずつ記載してください
- 番号や記号は付けないでください

文書セクション：
{chunk_content}

質問："""

        try:
            response = self._get_llm().invoke(prompt)
            # Extract text content from response
            content = response.content
            if isinstance(content, list):
                # Handle case where content is a list of message parts
                content = " ".join(str(part) for part in content)
            content_text = str(content)

            # 改行で分割して空行を除去
            questions = [
                q.strip().lstrip("0123456789.）)・-　 ")  # 番号や記号を除去
                for q in content_text.strip().split('\n')
                if q.strip() and not q.strip().startswith('#')
            ]
            # 質問として有効なもののみ（?や？で終わるか、十分な長さがあるもの）
            valid_questions = [
                q for q in questions
                if len(q) > 5 and (q.endswith('？') or q.endswith('?') or len(q) > 10)
            ]
            return valid_questions[:num_questions]
        except Exception as e:
            print(f"[QuestionGenerator] Error generating questions: {e}", flush=True)
            return []

    def generate_questions_for_chunks(
        self,
        chunks: list[Document],
        num_questions: int = 3
    ) -> list[tuple[Document, list[str]]]:
        """
        複数のチャンクに対して質問を生成

        Args:
            chunks: チャンクのリスト
            num_questions: 各チャンクに対して生成する質問の数

        Returns:
            (チャンク, 質問リスト) のタプルのリスト
        """
        results = []
        total = len(chunks)

        for i, chunk in enumerate(chunks):
            print(f"[QuestionGenerator] Generating questions for chunk {i + 1}/{total}", flush=True)
            questions = self.generate_questions(chunk.page_content, num_questions)

            if questions:
                results.append((chunk, questions))
                print(f"  Generated {len(questions)} questions", flush=True)
            else:
                print(f"  Warning: No questions generated for chunk {i + 1}", flush=True)
                # 質問が生成できなかった場合は空リストで追加
                results.append((chunk, []))

        return results


# シングルトンインスタンス
_question_generator: QuestionGenerator | None = None


def get_question_generator() -> QuestionGenerator:
    """質問生成サービスのインスタンスを取得"""
    global _question_generator
    if _question_generator is None:
        _question_generator = QuestionGenerator()
    return _question_generator
