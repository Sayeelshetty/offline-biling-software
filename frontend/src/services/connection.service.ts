import type {
  SyncConnectionStatus,
} from "../../../shared/types/sync";

type ConnectionListener = (
  status: SyncConnectionStatus
) => void;

function getConnectionStatus(): SyncConnectionStatus {
  return navigator.onLine
    ? "ONLINE"
    : "OFFLINE";
}

function subscribeToConnectionChanges(
  listener: ConnectionListener
) {
  const handleOnline = () => {
    listener("ONLINE");
  };

  const handleOffline = () => {
    listener("OFFLINE");
  };

  window.addEventListener(
    "online",
    handleOnline
  );

  window.addEventListener(
    "offline",
    handleOffline
  );

  return () => {
    window.removeEventListener(
      "online",
      handleOnline
    );

    window.removeEventListener(
      "offline",
      handleOffline
    );
  };
}

const connectionService = {
  getConnectionStatus,
  subscribeToConnectionChanges,
};

export default connectionService;