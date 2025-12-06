import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { ChatInput } from "@/app/components/ChatInput";
import { UI_TEXT } from "@/lib/constants";

describe("ChatInput", () => {
  it("renders input field and send button", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    expect(
      screen.getByPlaceholderText(UI_TEXT.inputPlaceholder)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "送信" })).toBeInTheDocument();
  });

  it("calls onSend when clicking send button with text", async () => {
    const onSend = vi.fn();
    const { user } = render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText(UI_TEXT.inputPlaceholder);
    await user.type(input, "Hello World");
    await user.click(screen.getByRole("button", { name: "送信" }));

    expect(onSend).toHaveBeenCalledWith("Hello World");
  });

  it("calls onSend when pressing Enter", async () => {
    const onSend = vi.fn();
    const { user } = render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText(UI_TEXT.inputPlaceholder);
    await user.type(input, "Hello{Enter}");

    expect(onSend).toHaveBeenCalledWith("Hello");
  });

  it("does not call onSend when pressing Shift+Enter (for new line)", async () => {
    const onSend = vi.fn();
    const { user } = render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText(UI_TEXT.inputPlaceholder);
    await user.type(input, "Hello");
    await user.keyboard("{Shift>}{Enter}{/Shift}");

    expect(onSend).not.toHaveBeenCalled();
  });

  it("clears input after sending", async () => {
    const onSend = vi.fn();
    const { user } = render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText(
      UI_TEXT.inputPlaceholder
    ) as HTMLTextAreaElement;
    await user.type(input, "Hello{Enter}");

    expect(input.value).toBe("");
  });

  it("trims whitespace from message", async () => {
    const onSend = vi.fn();
    const { user } = render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText(UI_TEXT.inputPlaceholder);
    await user.type(input, "  Hello World  {Enter}");

    expect(onSend).toHaveBeenCalledWith("Hello World");
  });

  it("does not send empty messages", async () => {
    const onSend = vi.fn();
    const { user } = render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText(UI_TEXT.inputPlaceholder);
    await user.type(input, "{Enter}");

    expect(onSend).not.toHaveBeenCalled();
  });

  it("does not send whitespace-only messages", async () => {
    const onSend = vi.fn();
    const { user } = render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText(UI_TEXT.inputPlaceholder);
    await user.type(input, "   {Enter}");

    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables input when disabled prop is true", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled />);

    const input = screen.getByPlaceholderText(UI_TEXT.inputPlaceholder);
    expect(input).toBeDisabled();
  });

  it("does not send when disabled even with text", async () => {
    const onSend = vi.fn();
    const { user } = render(<ChatInput onSend={onSend} disabled />);

    // Input is disabled, so we can't type
    // Clicking the button shouldn't work either
    await user.click(screen.getByRole("button", { name: "送信" }));

    expect(onSend).not.toHaveBeenCalled();
  });

  it("shows keyboard shortcuts hint", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    expect(screen.getByText("Enter")).toBeInTheDocument();
    expect(screen.getByText("Shift + Enter")).toBeInTheDocument();
    expect(screen.getByText("で送信")).toBeInTheDocument();
    expect(screen.getByText("で改行")).toBeInTheDocument();
  });
});
