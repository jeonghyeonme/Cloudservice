import { useState } from "react";

function clampContextMenuPosition(event) {
  const menuWidth = 212;
  const menuHeight = 176;
  const padding = 12;
  const x = Math.min(event.clientX, window.innerWidth - menuWidth - padding);
  const y = Math.min(event.clientY, window.innerHeight - menuHeight - padding);

  return {
    x: Math.max(padding, x),
    y: Math.max(padding, y),
  };
}

function useChatOverlayState() {
  const [contextMenu, setContextMenu] = useState(null);
  const [settingsModal, setSettingsModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  const openContextMenu = (event, config) => {
    setContextMenu({
      ...config,
      position: clampContextMenuPosition(event),
    });
  };

  const closeContextMenu = () => setContextMenu(null);
  const openSettingsModal = (config) => setSettingsModal(config);
  const closeSettingsModal = () => setSettingsModal(null);
  const openConfirmModal = (config) => setConfirmModal(config);
  const closeConfirmModal = () => setConfirmModal(null);

  return {
    contextMenu,
    settingsModal,
    confirmModal,
    openContextMenu,
    closeContextMenu,
    openSettingsModal,
    closeSettingsModal,
    openConfirmModal,
    closeConfirmModal,
  };
}

export default useChatOverlayState;
