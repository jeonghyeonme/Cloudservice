import { request } from "./request";

/**
 * S3 업로드용 Pre-signed URL 발급
 */
export function getUploadUrl(fileName, fileType) {
  const params = new URLSearchParams({ fileName, fileType });
  return request(`/resources/upload-url?${params}`, {
    method: "GET",
  });
}

/**
 * 업로드한 파일의 메타데이터를 Rooms 테이블에 저장
 */
export function saveFileMetadata(roomId, metadata) {
  return request(`/rooms/${roomId}/files`, {
    method: "POST",
    body: JSON.stringify(metadata),
  });
}

/**
 * 외부 URL을 Rooms 테이블의 links 배열에 저장 (OG 메타데이터 자동 스크랩)
 */
export function saveLink(roomId, url) {
  return request(`/rooms/${roomId}/links`, {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

/**
 * 파일 업로드 전체 플로우
 * 1. 백엔드에서 Pre-signed URL 발급
 * 2. S3에 직접 PUT (인증 헤더 없이)
 * 3. 업로드된 파일의 메타데이터를 DB에 저장
 *
 * @param {string} roomId - 업로드 대상 스터디룸 ID
 * @param {File} file - 업로드할 파일 객체
 * @returns {Promise<object>} 저장된 파일 메타데이터
 */
export async function uploadFile(roomId, file) {
  // 1. Pre-signed URL 발급
  const { uploadUrl, fileUrl, s3ObjectKey } = await getUploadUrl(
    file.name,
    file.type || "application/octet-stream"
  );

  // 2. S3에 직접 업로드 (Authorization 헤더 절대 포함 금지)
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
  });

  if (!uploadResponse.ok) {
    throw new Error("S3 파일 업로드에 실패했습니다.");
  }

  // 3. 메타데이터 DB 저장
  const result = await saveFileMetadata(roomId, {
    fileName: file.name,
    fileUrl,
    fileType: file.type,
    s3ObjectKey,
  });

  return result.file;
}