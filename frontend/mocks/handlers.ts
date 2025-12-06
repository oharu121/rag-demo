import { http, HttpResponse, delay } from "msw";
import { API_CONFIG } from "@/lib/constants";

const baseUrl = API_CONFIG.baseUrl;

export const handlers = [
  // Health check
  http.get(`${baseUrl}/api/health`, () => {
    return HttpResponse.json({
      status: "healthy",
      model_loaded: true,
      vectorstore_ready: true,
      document_count: 3,
    });
  }),

  // Documents list
  http.get(`${baseUrl}/api/documents`, () => {
    return HttpResponse.json({
      documents: [
        {
          id: "1",
          filename: "sample.txt",
          type: "sample",
          status: "ready",
          line_count: 100,
        },
        {
          id: "2",
          filename: "uploaded.md",
          type: "uploaded",
          status: "ready",
          line_count: 50,
        },
      ],
      total: 2,
    });
  }),

  // Get document content
  http.get(`${baseUrl}/api/documents/:id/content`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id,
      filename: id === "1" ? "sample.txt" : "uploaded.md",
      content: "This is the document content.\nLine 2\nLine 3",
      line_count: 3,
    });
  }),

  // Upload document
  http.post(`${baseUrl}/api/documents/upload`, async () => {
    await delay(100);
    return HttpResponse.json({
      id: "new-doc",
      filename: "test.txt",
      status: "ready",
      message: "Upload successful",
    });
  }),

  // Delete document
  http.delete(`${baseUrl}/api/documents/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Rebuild vectorstore
  http.post(`${baseUrl}/api/documents/rebuild`, async () => {
    await delay(100);
    return HttpResponse.json({
      status: "success",
      chunk_count: 50,
      message: "Rebuild complete",
    });
  }),

  // Chat SSE endpoint
  http.post(`${baseUrl}/api/chat`, async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode('event: token\ndata: {"token":"Hello"}\n\n')
        );
        await delay(50);
        controller.enqueue(
          encoder.encode('event: token\ndata: {"token":" World"}\n\n')
        );
        await delay(50);
        controller.enqueue(
          encoder.encode(
            'event: sources\ndata: {"sources":[{"filename":"sample.txt","start_line":1,"end_line":10,"content_preview":"preview"}]}\n\n'
          )
        );
        controller.enqueue(
          encoder.encode('event: done\ndata: {"processing_time_ms":100}\n\n')
        );
        controller.close();
      },
    });

    return new HttpResponse(stream, {
      headers: { "Content-Type": "text/event-stream" },
    });
  }),
];
