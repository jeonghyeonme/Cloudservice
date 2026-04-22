import React from "react";
import { createServer } from "../../lib/servers";
import FormModal from "../common/FormModal";
import { createServerFields } from "../common/entityFormConfig";

const CreateServerModal = ({ onClose }) => {
  const handleSubmit = async (values) => {
    const newServerData = {
      roomName: values.serverName,
      description: values.description,
      maxCapacity: Number(values.maxParticipants),
      isPrivate: values.privacy === "Private",
      status: "ACTIVE",
    };

    try {
      await createServer(newServerData);
      alert(`${values.serverName} 서버가 생성되었습니다!`);
      onClose();
      window.location.reload();
    } catch (error) {
      console.error("🚨 서버 생성 실패:", error);
      alert(error.message || "서버 통신 중 오류가 발생했습니다.");
    }
  };

  return (
    <FormModal
      open
      title="새로운 서버 만들기"
      description="함께 집중하고 성장할 수 있는 몰입 공간을 설계하세요."
      fields={createServerFields()}
      submitLabel="서버 생성"
      cancelLabel="취소"
      onClose={onClose}
      onSubmit={handleSubmit}
    />
  );
};

export default CreateServerModal;
