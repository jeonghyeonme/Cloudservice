import { request } from "./request";

export function getUploadUrl(fileName, fileType) {
  const params = new URLSearchParams({ fileName, fileType });
  return request(`/resources/upload-url?${params}`, {
    method: "GET",
  });
}

export function saveFileMetadata(serverId, metadata) {
  return request(`/servers/${serverId}/files`, {
    method: "POST",
    body: JSON.stringify(metadata),
  });
}

export function saveLink(serverId, url) {
  return request(`/servers/${serverId}/links`, {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function uploadFile(serverId, file) {
  const { uploadUrl, fileUrl, s3ObjectKey } = await getUploadUrl(
    file.name,
    file.type || "application/octet-stream"
  );

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

  const result = await saveFileMetadata(serverId, {
    fileName: file.name,
    fileUrl,
    fileType: file.type,
    s3ObjectKey,
  });

  return result.file;
}

export const deleteFile = async (serverId, fileId) => {
  return await request(`/servers/${serverId}/files/${fileId}`, {
    method: "DELETE",
  });
};

export const deleteLink = async (serverId, linkId) => {
  return await request(`/servers/${serverId}/links/${linkId}`, {
    method: "DELETE",
  });
};