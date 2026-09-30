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

  // Memulai proses drag saat pointer ditekan di area kartu non-tombol.
  // Posisi dihitung relatif terhadap offsetParent (track), sehingga tetap
  // presisi meski track sedang digeser oleh pagination atau kontainer bergeser.
  function onPointerDown(e: PointerEvent) {
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'button') return;
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.button !== 0) return; // Hanya drag dengan tombol mouse utama / touch

    const origin = (node.offsetParent as HTMLElement) ?? getContainer() ?? node.parentElement;
    if (!origin) return;

    const originRect = origin.getBoundingClientRect();

    isDragging = true;
    // Jarak (offset) kursor relatif terhadap titik (0,0) kartu di dalam origin
    startX = e.clientX - originRect.left - node.offsetLeft;
    startY = e.clientY - originRect.top - node.offsetTop;

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

    const origin = (node.offsetParent as HTMLElement) ?? getContainer() ?? node.parentElement;
    const container = getContainer();
    if (!origin || !container) return;

    const originRect = origin.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    let newX = e.clientX - originRect.left - startX;
    let newY = e.clientY - originRect.top - startY;

    // Batasi pergerakan kartu agar tetap di dalam batas visual kontainer papan
    const minX = containerRect.left - originRect.left + 8;
    const maxX = containerRect.right - originRect.left - node.offsetWidth - 8;
    const minY = containerRect.top - originRect.top + 8;
    const maxY = containerRect.bottom - originRect.top - node.offsetHeight - 8;

    if (newX < minX) newX = minX;
    if (newX > maxX) newX = maxX;
    if (newY < minY) newY = minY;
    if (newY > maxY) newY = maxY;

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

    if (node.hasPointerCapture(e.pointerId)) {
      try {
        node.releasePointerCapture(e.pointerId);
      } catch {
        // Abaikan jika pointer capture telah terlepas otomatis
      }
    }

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
