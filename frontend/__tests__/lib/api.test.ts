import { describe, it, expect } from "vitest";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";
import { API_CONFIG } from "@/lib/constants";
import {
  checkHealth,
  fetchDocuments,
  uploadDocument,
  deleteDocument,
  fetchDocumentContent,
  rebuildVectorstore,
  parseSourcesFromAPI,
} from "@/lib/api";

const baseUrl = API_CONFIG.baseUrl;

describe("API Client", () => {
  describe("checkHealth", () => {
    it("returns health data when server is healthy", async () => {
      const health = await checkHealth();

      expect(health.status).toBe("healthy");
      expect(health.model_loaded).toBe(true);
      expect(health.vectorstore_ready).toBe(true);
      expect(health.document_count).toBe(3);
    });

    it("throws error when health check fails", async () => {
      server.use(
        http.get(`${baseUrl}/api/health`, () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      await expect(checkHealth()).rejects.toThrow("Health check failed");
    });
  });

  describe("fetchDocuments", () => {
    it("returns transformed document list with camelCase properties", async () => {
      const docs = await fetchDocuments();

      expect(docs).toHaveLength(2);
      expect(docs[0]).toEqual({
        id: "1",
        filename: "sample.txt",
        type: "sample",
        status: "ready",
        lineCount: 100,
      });
      expect(docs[1]).toEqual({
        id: "2",
        filename: "uploaded.md",
        type: "uploaded",
        status: "ready",
        lineCount: 50,
      });
    });

    it("throws error when fetch fails", async () => {
      server.use(
        http.get(`${baseUrl}/api/documents`, () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      await expect(fetchDocuments()).rejects.toThrow("Failed to fetch documents");
    });
  });

  describe("uploadDocument", () => {
    it("uploads file and returns response", async () => {
      const file = new File(["test content"], "test.txt", { type: "text/plain" });
      const result = await uploadDocument(file);

      expect(result.id).toBe("new-doc");
      expect(result.filename).toBe("test.txt");
      expect(result.status).toBe("ready");
    });

    it("throws error with detail message when upload fails", async () => {
      server.use(
        http.post(`${baseUrl}/api/documents/upload`, () => {
          return HttpResponse.json({ detail: "File too large" }, { status: 400 });
        })
      );

      const file = new File(["test"], "test.txt", { type: "text/plain" });
      await expect(uploadDocument(file)).rejects.toThrow("File too large");
    });
  });

  describe("deleteDocument", () => {
    it("deletes document successfully", async () => {
      await expect(deleteDocument("1")).resolves.toBeUndefined();
    });

    it("throws error when delete fails", async () => {
      server.use(
        http.delete(`${baseUrl}/api/documents/:id`, () => {
          return HttpResponse.json({ detail: "Not found" }, { status: 404 });
        })
      );

      await expect(deleteDocument("999")).rejects.toThrow("Not found");
    });
  });

  describe("fetchDocumentContent", () => {
    it("returns document content with camelCase properties", async () => {
      const result = await fetchDocumentContent("1");

      expect(result.content).toBe("This is the document content.\nLine 2\nLine 3");
      expect(result.filename).toBe("sample.txt");
      expect(result.lineCount).toBe(3);
    });

    it("throws error when fetch fails", async () => {
      server.use(
        http.get(`${baseUrl}/api/documents/:id/content`, () => {
          return HttpResponse.json({ detail: "Not found" }, { status: 404 });
        })
      );

      await expect(fetchDocumentContent("999")).rejects.toThrow("Not found");
    });
  });

  describe("rebuildVectorstore", () => {
    it("returns rebuild result", async () => {
      const result = await rebuildVectorstore();

      expect(result.status).toBe("success");
      expect(result.chunk_count).toBe(50);
      expect(result.message).toBe("Rebuild complete");
    });

    it("throws error when rebuild fails", async () => {
      server.use(
        http.post(`${baseUrl}/api/documents/rebuild`, () => {
          return HttpResponse.json({ detail: "Rebuild failed" }, { status: 500 });
        })
      );

      await expect(rebuildVectorstore()).rejects.toThrow("Rebuild failed");
    });
  });

  describe("parseSourcesFromAPI", () => {
    it("transforms snake_case to camelCase", () => {
      const apiSources = [
        {
          filename: "test.txt",
          start_line: 1,
          end_line: 10,
          content_preview: "preview text",
        },
        {
          filename: "another.md",
          start_line: 20,
          end_line: 30,
          content_preview: "another preview",
        },
      ];

      const result = parseSourcesFromAPI(apiSources);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        filename: "test.txt",
        startLine: 1,
        endLine: 10,
        contentPreview: "preview text",
      });
      expect(result[1]).toEqual({
        filename: "another.md",
        startLine: 20,
        endLine: 30,
        contentPreview: "another preview",
      });
    });

    it("handles empty array", () => {
      const result = parseSourcesFromAPI([]);
      expect(result).toEqual([]);
    });
  });
});
