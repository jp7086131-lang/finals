import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_BASE } from '../api/client';

const refreshEvents = [
  'orders:new',
  'orders:created',
  'orders:updated',
  'orders:assigned',
  'orders:status',
  'riders:assigned',
  'riders:delivery-status',
  'riders:refresh',
  'payments:confirmed',
  'payments:proof-uploaded',
];

export default function useRealtime({ token, loadData, setNotice, onEvent }) {
  useEffect(() => {
    if (!token) return undefined;

    const socket = io(SOCKET_BASE, { auth: { token } });

    socket.on('socket:ready', () => setNotice('Realtime updates connected.'));
    refreshEvents.forEach((eventName) => socket.on(eventName, (payload) => {
      loadData();
      onEvent?.(eventName, payload);
    }));
    socket.on('connect_error', (error) => setNotice(`Realtime connection failed: ${error.message}`));

    return () => {
      refreshEvents.forEach((eventName) => socket.off(eventName));
      socket.disconnect();
    };
  }, [token, loadData, onEvent, setNotice]);
}
