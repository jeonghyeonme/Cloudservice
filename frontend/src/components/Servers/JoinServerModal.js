import React from "react";
import FormModal from "../common/FormModal";

const joinFields = [
  {
    name: "password", // 백엔드 joinServer.js가 'password'라는 키를 기다리고 있으므로 이름을 맞춤.
    label: "Server Password",
    type: "password", // 입력 시 '****'로 가려지게 설정
    placeholder: "비밀번호를 입력하세요",
    required: true,
  },
];

const JoinServerModal = ({ serverName, onClose, onSubmit }) => {
  const handleSubmit = async (values) => {
    // 폼에서 입력받은 { password: "..." } 값을 부모의 API 호출 함수로 전달
    await onSubmit(values.password);
  };

  return (
    <FormModal
      open
      title={`'${serverName}' 서버 참가`}
      description="이 서버는 비공개입니다. 접근을 위해 비밀번호를 입력해주세요."
      fields={joinFields}
      submitLabel="입장하기"
      cancelLabel="취소"
      onClose={onClose}
      onSubmit={handleSubmit}
    />
  );
};

export default JoinServerModal;