import React from "react";
import FormModal from "./FormModal";

function EntitySettingsModal({
  open,
  entityType,
  entityName,
  description,
  fields,
  submitLabel = "설정 저장",
  cancelLabel = "취소",
  onClose,
  onSubmit,
}) {
  const resolvedTitle =
    entityType === "channel" ? "채널 설정" : "서버 설정";

  return (
    <FormModal
      open={open}
      title={resolvedTitle}
      description={
        description ||
        `${entityName || "현재 항목"}의 정보를 수정하고 저장할 수 있습니다.`
      }
      fields={fields}
      submitLabel={submitLabel}
      cancelLabel={cancelLabel}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

export default EntitySettingsModal;
