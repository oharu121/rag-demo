import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import { MessageBubble } from "@/app/components/MessageBubble";
import type { Message } from "@/lib/types";

describe("MessageBubble", () => {
  it("renders user message content", () => {
    const message: Message = {
      id: "1",
      role: "user",
      content: "Hello, this is a test message",
      timestamp: new Date(),
    };

    render(<MessageBubble message={message} />);

    expect(screen.getByText("Hello, this is a test message")).toBeInTheDocument();
  });

  it("renders user message with right alignment", () => {
    const message: Message = {
      id: "1",
      role: "user",
      content: "User message",
      timestamp: new Date(),
    };

    render(<MessageBubble message={message} />);

    const wrapper = screen.getByText("User message").closest(".flex");
    expect(wrapper).toHaveClass("justify-end");
  });

  it("renders assistant message content", () => {
    const message: Message = {
      id: "1",
      role: "assistant",
      content: "Hello! I am here to help.",
      timestamp: new Date(),
    };

    render(<MessageBubble message={message} />);

    expect(screen.getByText("Hello! I am here to help.")).toBeInTheDocument();
  });

  it("renders assistant message with left alignment", () => {
    const message: Message = {
      id: "1",
      role: "assistant",
      content: "Assistant message",
      timestamp: new Date(),
    };

    render(<MessageBubble message={message} />);

    const outerWrapper = screen.getByText("Assistant message").closest(".flex.justify-start");
    expect(outerWrapper).toBeInTheDocument();
  });

  it("shows streaming cursor when isStreaming is true and has content", () => {
    const message: Message = {
      id: "1",
      role: "assistant",
      content: "Generating...",
      timestamp: new Date(),
      isStreaming: true,
    };

    render(<MessageBubble message={message} />);

    // Streaming cursor should be visible (animated cursor)
    const cursor = document.querySelector(".animate-typing-cursor");
    expect(cursor).toBeInTheDocument();
  });

  it("shows loading spinner when streaming with no content", () => {
    const message: Message = {
      id: "1",
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    render(<MessageBubble message={message} />);

    expect(screen.getByText("回答を生成中...")).toBeInTheDocument();
  });

  it("does not show cursor when not streaming", () => {
    const message: Message = {
      id: "1",
      role: "assistant",
      content: "Complete message",
      timestamp: new Date(),
      isStreaming: false,
    };

    render(<MessageBubble message={message} />);

    const cursor = document.querySelector(".animate-typing-cursor");
    expect(cursor).not.toBeInTheDocument();
  });

  it("renders inline citations in blue", () => {
    const message: Message = {
      id: "1",
      role: "assistant",
      content: "Based on [sample.txt:10-20], the answer is yes.",
      timestamp: new Date(),
      sources: [
        {
          filename: "sample.txt",
          startLine: 10,
          endLine: 20,
          contentPreview: "preview",
        },
      ],
    };

    render(<MessageBubble message={message} />);

    const citation = screen.getByText("[sample.txt:10-20]");
    expect(citation).toHaveClass("text-blue-600");
    expect(citation).toHaveClass("font-medium");
  });

  it("displays source citations section when sources are cited in content", () => {
    const message: Message = {
      id: "1",
      role: "assistant",
      content: "Info from sample.txt file.",
      timestamp: new Date(),
      sources: [
        {
          filename: "sample.txt",
          startLine: 1,
          endLine: 10,
          contentPreview: "preview",
        },
      ],
    };

    render(<MessageBubble message={message} />);

    expect(screen.getByText("参照元")).toBeInTheDocument();
  });

  it("does not display sources section when sources are not cited", () => {
    const message: Message = {
      id: "1",
      role: "assistant",
      content: "This response does not mention any files.",
      timestamp: new Date(),
      sources: [
        {
          filename: "unused.txt",
          startLine: 1,
          endLine: 10,
          contentPreview: "preview",
        },
      ],
    };

    render(<MessageBubble message={message} />);

    expect(screen.queryByText("参照元")).not.toBeInTheDocument();
  });

  it("preserves whitespace in message content", () => {
    const message: Message = {
      id: "1",
      role: "user",
      content: "Line 1\nLine 2\nLine 3",
      timestamp: new Date(),
    };

    render(<MessageBubble message={message} />);

    const contentDiv = screen.getByText(/Line 1/);
    expect(contentDiv).toHaveClass("whitespace-pre-wrap");
  });

  it("handles multiple inline citations", () => {
    const message: Message = {
      id: "1",
      role: "assistant",
      content: "See [file1.txt:1-5] and [file2.md:10-20] for details.",
      timestamp: new Date(),
      sources: [
        {
          filename: "file1.txt",
          startLine: 1,
          endLine: 5,
          contentPreview: "preview 1",
        },
        {
          filename: "file2.md",
          startLine: 10,
          endLine: 20,
          contentPreview: "preview 2",
        },
      ],
    };

    render(<MessageBubble message={message} />);

    const citation1 = screen.getByText("[file1.txt:1-5]");
    const citation2 = screen.getByText("[file2.md:10-20]");

    expect(citation1).toHaveClass("text-blue-600");
    expect(citation2).toHaveClass("text-blue-600");
  });

  it("renders message without sources", () => {
    const message: Message = {
      id: "1",
      role: "assistant",
      content: "A simple response without citations.",
      timestamp: new Date(),
    };

    render(<MessageBubble message={message} />);

    expect(
      screen.getByText("A simple response without citations.")
    ).toBeInTheDocument();
    expect(screen.queryByText("参照元")).not.toBeInTheDocument();
  });
});
