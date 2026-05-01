// src/hooks/useSocket.js
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

let sharedSocket = null;

function getSocket() {
  if (!sharedSocket) {
    sharedSocket = io('/', { autoConnect: true, transports: ['websocket', 'polling'] });
  }
  return sharedSocket;
}

/**
 * Subscribe to a specific auction room.
 * @param {string|number} auctionId
 * @param {{ onBidUpdate, onBidWithdrawn, onAuctionEnded }} handlers
 */
export function useAuctionSocket(auctionId, handlers = {}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!auctionId) return;
    const socket = getSocket();

    socket.emit('join_auction', auctionId);

    const onBidUpdate    = (data) => handlersRef.current.onBidUpdate?.(data);
    const onBidWithdrawn = (data) => handlersRef.current.onBidWithdrawn?.(data);
    const onAuctionEnded = (data) => {
      if (String(data.auctionId) === String(auctionId)) {
        handlersRef.current.onAuctionEnded?.(data);
      }
    };

    socket.on('bid_update',    onBidUpdate);
    socket.on('bid_withdrawn', onBidWithdrawn);
    socket.on('auction_ended', onAuctionEnded);

    return () => {
      socket.emit('leave_auction', auctionId);
      socket.off('bid_update',    onBidUpdate);
      socket.off('bid_withdrawn', onBidWithdrawn);
      socket.off('auction_ended', onAuctionEnded);
    };
  }, [auctionId]);
}

/**
 * Returns a stable emit function.
 */
export function useSocketEmit() {
  return useCallback((event, data) => getSocket().emit(event, data), []);
}
