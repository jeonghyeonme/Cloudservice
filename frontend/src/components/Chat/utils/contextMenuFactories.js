export function buildServerContextMenuItems({
  canDelete,
  onOpenSettings,
  onOpenDeleteConfirm,
}) {
  return [
    {
      key: "settings",
      label: "설정",
      icon: "⚙️",
      onClick: onOpenSettings,
    },
    ...(canDelete
      ? [
          {
            key: "delete",
            label: "서버 삭제",
            icon: "🗑️",
            danger: true,
            onClick: onOpenDeleteConfirm,
          },
        ]
      : []),
  ];
}

export function buildChannelContextMenuItems({
  onOpenSettings,
  onOpenDeleteConfirm,
}) {
  return [
    {
      key: "settings",
      label: "설정",
      icon: "⚙️",
      onClick: onOpenSettings,
    },
    {
      key: "delete",
      label: "채널 삭제",
      icon: "🗑️",
      danger: true,
      onClick: onOpenDeleteConfirm,
    },
  ];
}
