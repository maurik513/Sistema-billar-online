// App 100% local y de un solo dispositivo: no hay servidor con el
// que sincronizar en tiempo real. Este contexto queda como un stub
// (socket siempre null) para no tener que tocar las pantallas que
// ya sabían convivir sin conexión de socket.
import { createContext, useContext } from 'react';

const SocketContext = createContext({ socket: null });

export function SocketProvider({ children }) {
  return (
    <SocketContext.Provider value={{ socket: null }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
