export interface GridLayout {
  columns: number;
  rowsPerPage: number;
  perPage: number;
  cardWidth: number;
  cardHeight: number;
  gapX: number;
  gapY: number;
  startX: number;
  startY: number;
  pageWidth: number;
  getPos: (index: number) => { x: number; y: number };
}

/**
 * Menghitung tata letak grid kartu pada papan secara presisi dan dinamis.
 *
 * Layout bersifat PAGINATED: kartu mengisi kolom lalu baris di satu halaman.
 * Jika melebihi kapasitas halaman (columns x rowsPerPage), kartu berikutnya
 * diletakkan di halaman selanjutnya (offset horizontal sebesar lebar papan),
 * sehingga papan bergeser ke samping (swipe) alih-alih scroll ke bawah.
 *
 * @param boardWidth  lebar papan (px)
 * @param boardHeight tinggi papan (px); dipakai untuk menentukan jumlah baris
 */
export function calculateGridLayout(boardWidth: number, boardHeight = 520): GridLayout {
  const cardWidth = 152;
  const cardHeight = 205;
  const minPadding = 16;
  const bottomPadding = 90; // ruang untuk avatar Satpam di bawah
  const minGapX = 14;
  const gapY = 24;
  const startY = 70;

  // Hitung jumlah kolom maksimal yang muat:
  // cols * cardWidth + (cols - 1) * minGapX <= boardWidth - 2 * minPadding
  const columns = Math.max(
    1,
    Math.floor((boardWidth - 2 * minPadding + minGapX) / (cardWidth + minGapX))
  );

  // Hitung jumlah baris yang muat dalam satu halaman
  const usableHeight = boardHeight - startY - bottomPadding;
  const rowsPerPage = Math.max(
    1,
    Math.floor((usableHeight + gapY) / (cardHeight + gapY))
  );
  const perPage = Math.max(1, columns * rowsPerPage);

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

  const pageWidth = Math.max(boardWidth, 1);

  return {
    columns,
    rowsPerPage,
    perPage,
    cardWidth,
    cardHeight,
    gapX,
    gapY,
    startX,
    startY,
    pageWidth,
    getPos: (index: number) => {
      const page = Math.floor(index / perPage);
      const inPage = index % perPage;
      const col = inPage % columns;
      const row = Math.floor(inPage / columns);
      const x = Math.round(page * pageWidth + startX + col * (cardWidth + gapX));
      const y = Math.round(startY + row * (cardHeight + gapY));
      return { x, y };
    },
  };
}

/**
 * Mencari posisi grid terbaik berikutnya untuk item baru yang akan ditambahkan.
 * Mulai memindai dari slot halaman PERTAMA agar barang baru selalu tampil
 * di halaman pertama bila masih ada ruang.
 */
export function getNextAvailablePosition(
  existingItems: Array<{ x: number; y: number }>,
  boardWidth: number,
  boardHeight = 520
): { x: number; y: number } {
  const layout = calculateGridLayout(boardWidth, boardHeight);

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