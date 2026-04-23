export const PRIVACY_OPTIONS = [
  { value: "Public", label: "공개" },
  { value: "Private", label: "비공개" },
];

export const CAPACITY_OPTIONS = [
  { value: 5, label: "5명" },
  { value: 12, label: "12명" },
  { value: 20, label: "20명" },
];

export function createServerFields(defaultValues = {}) {
  return [
    {
      name: "serverName",
      label: "Group Name",
      placeholder: "예: 양자 컴퓨팅 심화 학습",
      required: true,
      defaultValue: defaultValues.serverName || "",
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      placeholder: "이 서버의 목표와 주요 학습 분야를 정의하세요...",
      defaultValue: defaultValues.description || "",
    },
    {
      name: "privacy",
      label: "Privacy Level",
      type: "toggle",
      width: "half",
      defaultValue: defaultValues.privacy || "Public",
      options: PRIVACY_OPTIONS,
    },
    {
      name: "serverPassword",
      label: "Server Password",
      type: "password",
      width: "half",
      placeholder: "비밀번호 입력",
      showIf: (values) => values.privacy === "Private",
      required: true,
      defaultValue: "",
    },
    {
      name: "maxParticipants",
      label: "Max Participants",
      type: "select",
      width: "half",
      defaultValue: defaultValues.maxParticipants ?? 12,
      options: CAPACITY_OPTIONS,
    },
    {
      name: "coverImage",
      label: "Upload Cover Image",
      type: "file",
      placeholder: "파일을 드래그하거나 클릭하여 브라우징하세요",
      helperText: defaultValues.coverImageName
        ? `현재 등록된 이미지: ${defaultValues.coverImageName}`
        : undefined,
    },
  ];
}

export function createChannelFields(defaultValues = {}) {
  return [
    {
      name: "name",
      label: "Channel Name",
      placeholder: "예: 공지사항, 시험 일정, 문제 풀이",
      required: true,
      defaultValue: defaultValues.name || "",
    },
    {
      name: "topic",
      label: "Channel Topic",
      type: "textarea",
      placeholder: "이 채널에서 다룰 주제나 운영 목적을 간단히 적어주세요.",
      helperText: "입력한 내용은 채널 상단 안내 문구로 표시됩니다.",
      defaultValue: defaultValues.topic || "",
    },
  ];
}

export function createServerDefaultValues(server = {}) {
  return {
    serverName: server.roomName || server.title || "",
    description: server.description || "",
    privacy: server.isPrivate ? "Private" : "Public",
    maxParticipants: Number(server.maxCapacity) || 12,
    coverImageName: server.coverImageName || server.imageUrl || server.coverImage || "",
  };
}

export function createChannelDefaultValues(channel = {}) {
  return {
    name: channel.name || channel.label || "",
    topic: channel.topic || "",
  };
}
