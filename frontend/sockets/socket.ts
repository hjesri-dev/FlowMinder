import { io } from "socket.io-client";
import { BACKEND_URL } from "../config/constants"

export const socket = io(BACKEND_URL, {
  path: "/socket.io",
  transports: ["websocket", "polling"],
  withCredentials: true,
  autoConnect: true,
});
