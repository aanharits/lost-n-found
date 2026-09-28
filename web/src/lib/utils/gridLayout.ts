export interface GridLayout {
  columns: number;
  cardWidth: number;
  cardHeight: number;
  gapX: number;
  gapY: number;
  startX: number;
  startY: number;
  getPos: (index: number) => { x: number; y: number };
}

/**
 * Menghitung tata letak grid kartu pada papan secara presisi dan dinamis
 * agar tidak ada ruang kosong canggung di samping kartu terakhir pada baris.
 */
export function calculateGridLayout(boardWidth: number): GridLayout {
  const cardWidth = 152;
  const cardHeight = 205;
  const minPadding = 16;
  const minGapX = 14;
  const gapY = 24;
  const startY = 70;

  // Hitung jumlah kolom maksimal yang muat:
  // cols * cardWidth + (cols - 1) * minGapX <= boardWidth - 2 * minPadding
  const columns = Math.max(
    1,
    Math.floor((boardWidth - 2 * minPadding + minGapX) / (cardWidth + minGapX))
  );

  let gapX = minGapX;
  let startX = minPadding;

  if (columns > 1) {
    const totalCardsWidth = columns * cardWidth;
    const availableSpace = boardWidth - 2 * minPadding - totalCardsWidth;
    if (availableSpace > 0) {
      const calculatedGap = availableSpace / (columns - 1);
      // Batasi gap maksimal agar kartu tidak terlalu renggang jika board sangat lebar
      if (calculatedGap > 22) {
        gapX = 20;
        const totalUsed = totalCardsWidth + (columns - 1) * gapX;
        startX = Math.max(minPadding, Math.round((boardWidth - totalUsed) / 2));
      } else {
        gapX = calculatedGap;
        startX = minPadding;
      }
    }
  } else {
    startX = Math.max(minPadding, Math.round((boardWidth - cardWidth) / 2));
  }

  return {
    columns,
    cardWidth,
    cardHeight,
    gapX,
    gapY,
    startX,
    startY,
    getPos: (index: number) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = Math.round(startX + col * (cardWidth + gapX));
      const y = Math.round(startY + row * (cardHeight + gapY));
      return { x, y };
    },
  };
}

/**
 * Mencari posisi grid terbaik berikutnya untuk item baru yang akan ditambahkan.
 */
export function getNextAvailablePosition(
  existingItems: Array<{ x: number; y: number }>,
  boardWidth: number
): { x: number; y: number } {
  const layout = calculateGridLayout(boardWidth);

  // Cari slot grid terdekat yang belum ditempati kartu lain (overlap threshold 45px)
  for (let i = 0; i <= existingItems.length; i++) {
    const pos = layout.getPos(i);
    const isOccupied = existingItems.some(
      (item) => Math.abs(item.x - pos.x) < 45 && Math.abs(item.y - pos.y) < 45
    );
    if (!isOccupied) {
      return pos;
    }
  }

  return layout.getPos(existingItems.length);
}
