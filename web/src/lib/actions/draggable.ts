import type { Action } from 'svelte/action';
import { getSocket } from '$lib/socket.js';

interface DraggableParams {
  itemId: string;
  containerId: string;
  onDragEnd?: (x: number, y: number) => void;
}

// Svelte action untuk menangani interaksi drag & drop kartu barang di papan
export const draggable: Action<HTMLElement, DraggableParams> = (node, params) => {
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  // Mengambil elemen kontainer papan
  function getContainer(): HTMLElement | null {
    return document.getElementById(params.containerId);
  }

  // Memulai proses drag saat pointer ditekan di area kartu non-tombol
  function onPointerDown(e: PointerEvent) {
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'button') return;
    if ((e.target as HTMLElement).closest('button')) return;

    isDragging = true;
    startX = e.clientX - node.offsetLeft;
    startY = e.clientY - node.offsetTop;

    node.classList.add('is-dragging');
    node.style.zIndex = '100';
    node.style.cursor = 'grabbing';
    node.setPointerCapture(e.pointerId);

    e.preventDefault();
  }

  // Memperbarui posisi koordinat kartu selama pointer digerakkan
  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return;
    e.preventDefault();

    const container = getContainer();
    if (!container) return;

    let newX = e.clientX - startX;
    let newY = e.clientY - startY;

    const containerRect = container.getBoundingClientRect();

    // Batasi pergerakan kartu agar tetap di dalam batas kontainer papan
    if (newX < 0) newX = 0;
    if (newX + node.offsetWidth > containerRect.width - 14) {
      newX = containerRect.width - node.offsetWidth - 14;
    }
    if (newY < 0) newY = 0;

    node.style.left = `${newX}px`;
    node.style.top = `${newY}px`;
  }

  // Mengakhiri drag dan broadcast koordinat baru melalui socket
  function onPointerUp(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;

    node.classList.remove('is-dragging');
    node.style.zIndex = '10';
    node.style.cursor = 'grab';

    const x = parseInt(node.style.left, 10) || 0;
    const y = parseInt(node.style.top, 10) || 0;

    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('item_move', { id: params.itemId, x, y });
    }

    params.onDragEnd?.(x, y);
  }

  node.addEventListener('pointerdown', onPointerDown);
  node.addEventListener('pointermove', onPointerMove);
  node.addEventListener('pointerup', onPointerUp);
  node.addEventListener('pointercancel', onPointerUp);

  return {
    // Memperbarui parameter action
    update(newParams: DraggableParams) {
      params = newParams;
    },
    // Membersihkan event listener saat elemen dihancurkan
    destroy() {
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onPointerUp);
      node.removeEventListener('pointercancel', onPointerUp);
    },
  };
};
