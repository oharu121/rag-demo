import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test-utils";
import { DocumentUpload } from "@/app/components/DocumentUpload";
import { UI_TEXT, UPLOAD_CONFIG } from "@/lib/constants";

describe("DocumentUpload", () => {
  it("renders upload zone with instructions", () => {
    const onUpload = vi.fn();
    render(<DocumentUpload onUpload={onUpload} isUploading={false} />);

    expect(screen.getByText(UI_TEXT.uploadInstruction)).toBeInTheDocument();
    expect(screen.getByText(UI_TEXT.uploadButton)).toBeInTheDocument();
  });

  it("shows file size limit", () => {
    const onUpload = vi.fn();
    render(<DocumentUpload onUpload={onUpload} isUploading={false} />);

    const sizeLimit = UPLOAD_CONFIG.maxFileSize / 1024 / 1024;
    expect(screen.getByText(new RegExp(`${sizeLimit}MB`))).toBeInTheDocument();
  });

  it("shows loading state when uploading", () => {
    const onUpload = vi.fn();
    render(<DocumentUpload onUpload={onUpload} isUploading={true} />);

    expect(screen.getByText("アップロード中...")).toBeInTheDocument();
    expect(screen.queryByText(UI_TEXT.uploadButton)).not.toBeInTheDocument();
  });

  it("handles file selection via input", async () => {
    const onUpload = vi.fn().mockResolvedValue(true);
    const { user } = render(
      <DocumentUpload onUpload={onUpload} isUploading={false} />
    );

    const file = new File(["test content"], "test.txt", { type: "text/plain" });
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    await user.upload(input, file);

    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it("accepts multiple files via input", async () => {
    const onUpload = vi.fn().mockResolvedValue(true);
    const { user } = render(
      <DocumentUpload onUpload={onUpload} isUploading={false} />
    );

    const files = [
      new File(["content1"], "file1.txt", { type: "text/plain" }),
      new File(["content2"], "file2.md", { type: "text/markdown" }),
    ];
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    await user.upload(input, files);

    expect(onUpload).toHaveBeenCalledTimes(2);
    expect(onUpload).toHaveBeenNthCalledWith(1, files[0]);
    expect(onUpload).toHaveBeenNthCalledWith(2, files[1]);
  });

  it("handles drag over state", () => {
    const onUpload = vi.fn();
    const { container } = render(
      <DocumentUpload onUpload={onUpload} isUploading={false} />
    );

    // Find the outer drop zone div (has onDragOver handler)
    const dropZone = container.querySelector(".border-dashed")!;

    fireEvent.dragOver(dropZone, {
      dataTransfer: { files: [], types: ["Files"] },
    });

    // Should show "ここにドロップ" text when dragging
    expect(screen.getByText("ここにドロップ")).toBeInTheDocument();
  });

  it("handles drag leave state", () => {
    const onUpload = vi.fn();
    const { container } = render(
      <DocumentUpload onUpload={onUpload} isUploading={false} />
    );

    const dropZone = container.querySelector(".border-dashed")!;

    fireEvent.dragOver(dropZone, {
      dataTransfer: { files: [], types: ["Files"] },
    });

    expect(screen.getByText("ここにドロップ")).toBeInTheDocument();

    fireEvent.dragLeave(dropZone, {
      dataTransfer: { files: [], types: ["Files"] },
    });

    // Should go back to normal text
    expect(screen.getByText(UI_TEXT.uploadInstruction)).toBeInTheDocument();
  });

  it("handles file drop", async () => {
    const onUpload = vi.fn().mockResolvedValue(true);
    const { container } = render(
      <DocumentUpload onUpload={onUpload} isUploading={false} />
    );

    const dropZone = container.querySelector(".border-dashed")!;
    const file = new File(["test content"], "test.txt", { type: "text/plain" });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    // Wait for async handler
    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(file);
    });
  });

  it("filters non-txt/md files on drop", async () => {
    const onUpload = vi.fn().mockResolvedValue(true);
    const { container } = render(
      <DocumentUpload onUpload={onUpload} isUploading={false} />
    );

    const dropZone = container.querySelector(".border-dashed")!;

    const txtFile = new File(["test"], "test.txt", { type: "text/plain" });
    const mdFile = new File(["# md"], "test.md", { type: "text/markdown" });
    const pdfFile = new File(["pdf"], "test.pdf", { type: "application/pdf" });
    const jpgFile = new File(["img"], "test.jpg", { type: "image/jpeg" });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [txtFile, pdfFile, mdFile, jpgFile],
      },
    });

    // Only txt and md files should be uploaded
    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledTimes(2);
    });
    expect(onUpload).toHaveBeenNthCalledWith(1, txtFile);
    expect(onUpload).toHaveBeenNthCalledWith(2, mdFile);
  });

  it("accepts .txt and .md file types in input", () => {
    const onUpload = vi.fn();
    render(<DocumentUpload onUpload={onUpload} isUploading={false} />);

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    expect(input.accept).toBe(".txt,.md");
  });

  it("allows multiple file selection", () => {
    const onUpload = vi.fn();
    render(<DocumentUpload onUpload={onUpload} isUploading={false} />);

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    expect(input.multiple).toBe(true);
  });
});
