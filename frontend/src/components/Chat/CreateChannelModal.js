import React from "react";
import FormModal from "../common/FormModal";
import { createChannelFields } from "../common/entityFormConfig";

const CreateChannelModal = ({
  open,
  serverName,
  onClose,
  onSubmit,
}) => {
  return (
    <FormModal
      open={open}
      title="채널 만들기"
      description={`${serverName || "현재 서버"} 안에서 새로운 대화 흐름을 시작하세요.`}
      fields={createChannelFields()}
      submitLabel="채널 생성"
      cancelLabel="취소"
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
};

export default CreateChannelModal;
