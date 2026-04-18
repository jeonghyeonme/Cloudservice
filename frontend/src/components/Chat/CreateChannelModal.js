import React from "react";
import FormModal from "../common/FormModal";

const channelFields = [
  {
    name: "name",
    label: "Channel Name",
    placeholder: "예: 공지사항, 시험 일정, 문제 풀이",
    required: true,
  },
  {
    name: "topic",
    label: "Channel Topic",
    type: "textarea",
    placeholder: "이 채널에서 다룰 주제나 운영 목적을 간단히 적어주세요.",
    helperText: "입력한 내용은 채널 상단 안내 문구로 표시됩니다.",
  },
];

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
      fields={channelFields}
      submitLabel="채널 생성"
      cancelLabel="취소"
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
};

export default CreateChannelModal;
