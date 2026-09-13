/**
 * WebRTC DataChannel Ephemeral Peer-to-Peer Image Streaming Engine
 * 
 * Technical Implementation:
 * - Direct peer-to-peer binary transfer over RTCDataChannel.
 * - 16KB (16384 bytes) ArrayBuffer chunking.
 * - Backpressure control: checks dataChannel.bufferedAmount to prevent queue saturation.
 * - Slices Blobs into sequential ArrayBuffers, transmits with metadata envelope.
 * - Reassembles chunks on callee/receiver side into unified Blob.
 * - Automatically persists directly to browser IndexedDB with zero cloud/server storage.
 */

import { saveEphemeralImage, EphemeralImageRecord } from '@/utils/ephemeralImageDB';

export const CHUNK_SIZE = 16 * 1024; // 16KB per chunk as specified in requirements
const BUFFER_THRESHOLD = 64 * 1024; // 64KB flow control threshold

export interface ImageTransferMeta {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  totalChunks: number;
  senderId: string;
  senderName?: string;
  peerId: string;
  caption?: string;
}

interface IncomingTransferState {
  meta: ImageTransferMeta;
  receivedChunks: ArrayBuffer[];
  receivedBytes: number;
  expectedChunks: number;
}

export type TransferProgressCallback = (transferId: string, progressPercent: number, direction: 'sending' | 'receiving') => void;
export type ImageReceivedCallback = (record: EphemeralImageRecord) => void;

class P2PImageTransferManager {
  private dataChannel: RTCDataChannel | null = null;
  private incomingTransfers: Map<string, IncomingTransferState> = new Map();
  private progressListeners: Set<TransferProgressCallback> = new Set();
  private imageReceivedListeners: Set<ImageReceivedCallback> = new Set();

  /**
   * Bind an active RTCDataChannel (caller or receiver)
   */
  public bindDataChannel(channel: RTCDataChannel, myUserId: string, otherUserId: string) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.close();
      } catch {}
    }

    this.dataChannel = channel;
    this.dataChannel.binaryType = 'arraybuffer';

    this.dataChannel.onopen = () => {
      console.log('[WebRTC DataChannel] P2P Image Channel is OPEN');
    };

    this.dataChannel.onclose = () => {
      console.log('[WebRTC DataChannel] P2P Image Channel is CLOSED');
      this.incomingTransfers.clear();
    };

    this.dataChannel.onerror = (err) => {
      console.error('[WebRTC DataChannel] P2P Image Channel error:', err);
    };

    this.dataChannel.onmessage = (event) => {
      this.handleIncomingMessage(event.data, myUserId, otherUserId);
    };
  }

  /**
   * Check if channel is connected and ready to send
   */
  public isReady(): boolean {
    return this.dataChannel !== null && this.dataChannel.readyState === 'open';
  }

  public onProgress(cb: TransferProgressCallback): () => void {
    this.progressListeners.add(cb);
    return () => this.progressListeners.delete(cb);
  }

  public onImageReceived(cb: ImageReceivedCallback): () => void {
    this.imageReceivedListeners.add(cb);
    return () => this.imageReceivedListeners.delete(cb);
  }

  private notifyProgress(transferId: string, percent: number, direction: 'sending' | 'receiving') {
    this.progressListeners.forEach((cb) => {
      try { cb(transferId, percent, direction); } catch {}
    });
  }

  private notifyImageReceived(record: EphemeralImageRecord) {
    this.imageReceivedListeners.forEach((cb) => {
      try { cb(record); } catch {}
    });
  }

  /**
   * Send an image file peer-to-peer over the DataChannel in 16KB ArrayBuffer chunks
   */
  public async sendImage(
    file: File | Blob,
    filename: string,
    senderId: string,
    peerId: string,
    senderName?: string,
    caption?: string
  ): Promise<EphemeralImageRecord> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('P2P DataChannel is not currently open. Both peers must be connected.');
    }

    const transferId = `p2p-img-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const size = file.size;
    const mimeType = file.type || 'image/jpeg';
    const totalChunks = Math.ceil(size / CHUNK_SIZE);

    const meta: ImageTransferMeta = {
      id: transferId,
      filename,
      mimeType,
      size,
      totalChunks,
      senderId,
      senderName,
      peerId,
      caption,
    };

    // 1. Send Header Meta Packet as JSON string
    this.dataChannel.send(JSON.stringify({
      protocol: 'GGD_P2P_IMAGE',
      event: 'META',
      data: meta,
    }));

    // 2. Read File as ArrayBuffer and slice into 16KB chunks
    const arrayBuffer = await file.arrayBuffer();
    let offset = 0;
    let chunkIndex = 0;

    while (offset < size) {
      // Flow control backpressure: Wait if bufferedAmount exceeds threshold
      if (this.dataChannel.bufferedAmount > BUFFER_THRESHOLD) {
        await new Promise<void>((resolve) => {
          if (!this.dataChannel) return resolve();
          this.dataChannel.onbufferedamountlow = () => {
            if (this.dataChannel) this.dataChannel.onbufferedamountlow = null;
            resolve();
          };
        });
      }

      const chunk = arrayBuffer.slice(offset, offset + CHUNK_SIZE);
      this.dataChannel.send(chunk);

      offset += chunk.byteLength;
      chunkIndex++;

      const percent = Math.min(100, Math.round((offset / size) * 100));
      this.notifyProgress(transferId, percent, 'sending');
    }

    // 3. Send End Packet
    this.dataChannel.send(JSON.stringify({
      protocol: 'GGD_P2P_IMAGE',
      event: 'COMPLETE',
      transferId,
    }));

    // 4. Save to sender's own local IndexedDB immediately
    const savedRecord = await saveEphemeralImage({
      id: transferId,
      peerId,
      senderId,
      senderName,
      blob: file,
      filename,
      mimeType,
      size,
      timestamp: Date.now(),
      isMine: true,
      caption,
    });

    return savedRecord;
  }

  /**
   * Handle incoming DataChannel packet
   */
  private async handleIncomingMessage(
    payload: string | ArrayBuffer,
    myUserId: string,
    otherUserId: string
  ) {
    if (typeof payload === 'string') {
      try {
        const msg = JSON.parse(payload);
        if (msg.protocol !== 'GGD_P2P_IMAGE') return;

        if (msg.event === 'META') {
          const meta = msg.data as ImageTransferMeta;
          this.incomingTransfers.set(meta.id, {
            meta,
            receivedChunks: [],
            receivedBytes: 0,
            expectedChunks: meta.totalChunks,
          });
          this.notifyProgress(meta.id, 0, 'receiving');
        } else if (msg.event === 'COMPLETE') {
          const transferId = msg.transferId as string;
          const transfer = this.incomingTransfers.get(transferId);
          if (!transfer) return;

          // Reassemble incoming chunks into a unified Blob
          const assembledBlob = new Blob(transfer.receivedChunks, {
            type: transfer.meta.mimeType || 'image/jpeg',
          });

          // Save directly into local IndexedDB
          const record = await saveEphemeralImage({
            id: transferId,
            peerId: otherUserId,
            senderId: transfer.meta.senderId || otherUserId,
            senderName: transfer.meta.senderName,
            blob: assembledBlob,
            filename: transfer.meta.filename || 'p2p-image.jpg',
            mimeType: transfer.meta.mimeType,
            size: assembledBlob.size,
            timestamp: Date.now(),
            isMine: false,
            caption: transfer.meta.caption,
          });

          this.notifyProgress(transferId, 100, 'receiving');
          this.notifyImageReceived(record);
          this.incomingTransfers.delete(transferId);
        }
      } catch (err) {
        console.warn('[WebRTC DataChannel] Failed parsing incoming text message:', err);
      }
    } else if (payload instanceof ArrayBuffer) {
      // Chunk packet: find the active incoming transfer
      // In sequential transfer, the first item in map is the active transfer
      const activeTransfer = Array.from(this.incomingTransfers.values())[0];
      if (!activeTransfer) return;

      activeTransfer.receivedChunks.push(payload);
      activeTransfer.receivedBytes += payload.byteLength;

      const percent = Math.min(
        100,
        Math.round((activeTransfer.receivedBytes / activeTransfer.meta.size) * 100)
      );
      this.notifyProgress(activeTransfer.meta.id, percent, 'receiving');
    }
  }

  /**
   * Teardown and reset
   */
  public destroy() {
    if (this.dataChannel) {
      try { this.dataChannel.close(); } catch {}
      this.dataChannel = null;
    }
    this.incomingTransfers.clear();
    this.progressListeners.clear();
    this.imageReceivedListeners.clear();
  }
}

export const p2pImageTransfer = new P2PImageTransferManager();
