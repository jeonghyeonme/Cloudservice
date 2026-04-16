import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { getMyRooms } from "../lib/rooms";

const RoomContext = createContext(null);
/**
 * @title 방 입장 퇴장 추적 및 동작 관리 컨텍스트
 */

export const RoomProvider = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const [joinedRooms, setJoinedRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);

  const upsertJoinedRoom = useCallback((room) => {
    if (!room?.roomId) {
      return;
    }

    const normalizedRoom = {
      roomId: room.roomId,
      roomName: room.roomName || room.title || "",
    };

    setJoinedRooms((prevRooms) => {
      const existingIndex = prevRooms.findIndex(
        (prevRoom) => prevRoom.roomId === normalizedRoom.roomId,
      );

      if (existingIndex === -1) {
        return [...prevRooms, normalizedRoom];
      }

      return prevRooms.map((prevRoom, index) =>
        index === existingIndex ? { ...prevRoom, ...normalizedRoom } : prevRoom,
      );
    });
  }, []);

  const clearJoinedRooms = useCallback(() => {
    setJoinedRooms([]);
    setActiveRoomId(null);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      clearJoinedRooms();
      return;
    }

    let isMounted = true;

    getMyRooms()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        const rooms = Array.isArray(data?.items) ? data.items : [];
        setJoinedRooms(
          rooms.map((room) => ({
            roomId: room.roomId,
            roomName: room.roomName || room.title || "",
          })),
        );
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        console.error("내 스터디룸 목록을 불러오지 못했습니다.", error);
        setJoinedRooms([]);
      });

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, clearJoinedRooms]);

  const value = useMemo(
    () => ({
      joinedRooms,
      activeRoomId,
      setActiveRoomId,
      upsertJoinedRoom,
      clearJoinedRooms,
    }),
    [joinedRooms, activeRoomId, upsertJoinedRoom, clearJoinedRooms],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};

export const useRooms = () => {
  const context = useContext(RoomContext);

  if (!context) {
    throw new Error("useRooms must be used within a RoomProvider");
  }

  return context;
};
