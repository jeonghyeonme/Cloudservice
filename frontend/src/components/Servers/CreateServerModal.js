import React from "react";
import { createServer } from "../../lib/servers";
import FormModal from "../common/FormModal";

const serverFields = [
  {
    name: "serverName",
    label: "Group Name",
    placeholder: "예: 양자 컴퓨팅 심화 학습",
    required: true,
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "이 서버의 목표와 주요 학습 분야를 정의하세요...",
  },
  {
    name: "privacy",
    label: "Privacy Level",
    type: "toggle",
    width: "half",
    defaultValue: "Public",
    options: [
      { value: "Public", label: "공개" },
      { value: "Private", label: "비공개" },
    ],
  },
  {
    name: "serverPassword",
    label: "Server Password",
    type: "password",
    width: "half",
    placeholder: "비밀번호 입력",
    showIf: (values) => values.privacy === "Private",
    required: true,
  },
  {
    name: "maxParticipants",
    label: "Max Participants",
    type: "select",
    width: "half",
    defaultValue: 12,
    options: [
      { value: 5, label: "5명" },
      { value: 12, label: "12명" },
      { value: 20, label: "20명" },
    ],
  },
  {
    name: "coverImage",
    label: "Upload Cover Image",
    type: "file",
    placeholder: "파일을 드래그하거나 클릭하여 브라우징하세요",
  },
];

const CreateServerModal = ({ onClose }) => {
  const handleSubmit = async (values) => {
    const isPrivate = values.privacy === "Private";

    if(isPrivate && !values.serverPassword) {
      alert("비공개 서버는 비밀번호 설정이 필수입니다!");
      return;
    }

    const newServerData = {
      serverName: values.serverName,
      description: values.description,
      maxCapacity: Number(values.maxParticipants),
      isPrivate: isPrivate,
      roomPassword: isPrivate ? values.serverPassword : "",
      status: "ACTIVE",
      // isPrivate: values.privacy === "Private",
    };

    try {
      await createServer(newServerData);
      alert(`${values.serverName} 서버가 생성되었습니다!`);
      onClose();
      window.location.reload();
    } catch (error) {
      console.error("서버 생성 실패:", error);
      alert(error.message || "서버 통신 중 오류가 발생했습니다.");
    }
  };

  return (
    <FormModal
      open
      title="새로운 서버 만들기"
      description="함께 집중하고 성장할 수 있는 몰입 공간을 설계하세요."
      fields={serverFields}
      submitLabel="서버 생성"
      cancelLabel="취소"
      onClose={onClose}
      onSubmit={handleSubmit}
    />
  );
};

export default CreateServerModal;