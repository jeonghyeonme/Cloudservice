export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_UPLOAD_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "hwp",
  "csv",
  "xls",
  "xlsx",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
];

export const UPLOAD_POLICY_LABEL = `${ALLOWED_UPLOAD_EXTENSIONS.join(", ")} / 최대 10MB`;

export function getFileExtension(fileName = "") {
  const segments = fileName.split(".");
  return segments.length > 1 ? segments.pop().toLowerCase() : "";
}

export function validateUploadFile(file) {
  if (!file) {
    return { ok: false, message: "파일이 선택되지 않았습니다." };
  }

  const extension = getFileExtension(file.name);

  if (!ALLOWED_UPLOAD_EXTENSIONS.includes(extension)) {
    return {
      ok: false,
      message: `지원하지 않는 파일 형식입니다. 허용 형식: ${ALLOWED_UPLOAD_EXTENSIONS.join(", ")}`,
    };
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return {
      ok: false,
      message: "10MB 이하의 파일만 업로드 가능합니다.",
    };
  }

  return { ok: true, extension };
}
