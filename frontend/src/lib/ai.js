import { request } from "./request";

export function analyzeResource({ serverId, s3ObjectKey, fileType, fileName, requestId }) {
  return request("/ai/analyze", {
    method: "POST",
    body: JSON.stringify({
      serverId,
      s3ObjectKey,
      fileType,
      fileName,
      requestId,
    }),
  });
}
