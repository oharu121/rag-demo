import { describe, it, expect } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDocuments } from "@/hooks/useDocuments";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";
import { API_CONFIG, UPLOAD_CONFIG } from "@/lib/constants";

const baseUrl = API_CONFIG.baseUrl;

describe("useDocuments", () => {
  it("loads documents on mount", async () => {
    const { result } = renderHook(() => useDocuments());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.documents).toHaveLength(2);
  });

  it("separates sample and uploaded documents", async () => {
    const { result } = renderHook(() => useDocuments());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sampleDocuments).toHaveLength(1);
    expect(result.current.sampleDocuments[0].type).toBe("sample");
    expect(result.current.uploadedDocuments).toHaveLength(1);
    expect(result.current.uploadedDocuments[0].type).toBe("uploaded");
  });

  it("validates file type before upload - rejects invalid types", async () => {
    const { result } = renderHook(() => useDocuments());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const invalidFile = new File(["content"], "test.pdf", {
      type: "application/pdf",
    });

    let uploadResult: boolean = true;
    await act(async () => {
      uploadResult = await result.current.upload(invalidFile);
    });

    expect(uploadResult).toBe(false);
    expect(result.current.error).toContain("テキストファイル");
  });

  it("validates file size before upload - rejects large files", async () => {
    const { result } = renderHook(() => useDocuments());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Create file larger than 1MB
    const largeContent = "x".repeat(UPLOAD_CONFIG.maxFileSize + 1);
    const largeFile = new File([largeContent], "large.txt", {
      type: "text/plain",
    });

    let uploadResult: boolean = true;
    await act(async () => {
      uploadResult = await result.current.upload(largeFile);
    });

    expect(uploadResult).toBe(false);
    expect(result.current.error).toContain("1MB");
  });

  it("uploads valid .txt file successfully", async () => {
    const { result } = renderHook(() => useDocuments());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const validFile = new File(["test content"], "test.txt", {
      type: "text/plain",
    });

    let uploadResult: boolean = false;
    await act(async () => {
      uploadResult = await result.current.upload(validFile);
    });

    expect(uploadResult).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("uploads valid .md file successfully", async () => {
    const { result } = renderHook(() => useDocuments());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const validFile = new File(["# Markdown"], "readme.md", {
      type: "text/markdown",
    });

    let uploadResult: boolean = false;
    await act(async () => {
      uploadResult = await result.current.upload(validFile);
    });

    expect(uploadResult).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("tracks isUploading state", async () => {
    const { result } = renderHook(() => useDocuments());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Initially not uploading
    expect(result.current.isUploading).toBe(false);

    const file = new File(["test"], "test.txt", { type: "text/plain" });

    await act(async () => {
      await result.current.upload(file);
    });

    // After upload completes, isUploading should be false
    expect(result.current.isUploading).toBe(false);
  });

  it("removes document successfully", async () => {
    const { result } = renderHook(() => useDocuments());

    await waitFor(() => {
      expect(result.current.documents.length).toBeGreaterThan(0);
    });

    let removeResult: boolean = false;
    await act(async () => {
      removeResult = await result.current.remove("1");
    });

    expect(removeResult).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("handles remove error", async () => {
    server.use(
      http.delete(`${baseUrl}/api/documents/:id`, () => {
        return HttpResponse.json({ detail: "Cannot delete" }, { status: 400 });
      })
    );

    const { result } = renderHook(() => useDocuments());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let removeResult: boolean = true;
    await act(async () => {
      removeResult = await result.current.remove("1");
    });

    expect(removeResult).toBe(false);
    expect(result.current.error).toBe("Cannot delete");
  });

  it("rebuilds vectorstore successfully", async () => {
    const { result } = renderHook(() => useDocuments());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let rebuildResult: { status: string } | null = null;
    await act(async () => {
      rebuildResult = await result.current.rebuild();
    });

    expect(rebuildResult).not.toBeNull();
    expect(rebuildResult!.status).toBe("success");
  });

  it("tracks isRebuilding state", async () => {
    const { result } = renderHook(() => useDocuments());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Initially not rebuilding
    expect(result.current.isRebuilding).toBe(false);

    await act(async () => {
      await result.current.rebuild();
    });

    // After rebuild completes
    expect(result.current.isRebuilding).toBe(false);
  });

  it("handles rebuild error", async () => {
    server.use(
      http.post(`${baseUrl}/api/documents/rebuild`, () => {
        return HttpResponse.json({ detail: "Rebuild failed" }, { status: 500 });
      })
    );

    const { result } = renderHook(() => useDocuments());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let rebuildResult: { status: string } | null = { status: "pending" };
    await act(async () => {
      rebuildResult = await result.current.rebuild();
    });

    expect(rebuildResult).toBeNull();
    expect(result.current.error).toBe("Rebuild failed");
  });

  it("clears error with clearError", async () => {
    const { result } = renderHook(() => useDocuments());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Trigger an error
    const invalidFile = new File(["content"], "test.pdf", {
      type: "application/pdf",
    });
    await act(async () => {
      await result.current.upload(invalidFile);
    });

    expect(result.current.error).toBeTruthy();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it("handles fetch error on mount", async () => {
    server.use(
      http.get(`${baseUrl}/api/documents`, () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const { result } = renderHook(() => useDocuments());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.documents).toEqual([]);
  });
});
