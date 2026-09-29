<script lang="ts">
  import { draggable } from "$lib/actions/draggable.js";
  import { fly } from "svelte/transition";
  import { highlight } from "$lib/stores/highlight.js";

  let {
    folderId,
    label,
    kind,
    count,
    position,
    onOpen,
    onDragEnd,
  }: {
    folderId: string;
    label: string;
    kind: "found" | "lost" | "resolved";
    count: number;
    position: { x: number; y: number };
    onOpen: () => void;
    onDragEnd: (x: number, y: number) => void;
  } = $props();

  let isSelected = $state(false);

  // Icon folder bersinar bila memuat item yang di-highlight Satpam AI
  const hasHighlight = $derived(
    !!$highlight && $highlight.itemIds.length > 0 && count > 0
  );

  function handleClick() {
    isSelected = false;
    onOpen();
  }
</script>

<div
  id={folderId}
  class="desktop-icon {hasHighlight ? 'icon-glow' : ''}"
  style="left: {position.x}px; top: {position.y}px;"
  use:draggable={{ itemId: folderId, containerId: "board-container", onDragEnd }}
  transition:fly={{ y: -30, duration: 400 }}
  role="button"
  tabindex="0"
  onkeydown={(e) => { if (e.key === "Enter") onOpen(); }}
  aria-label="Folder {label}"
>
  <!-- Area ikon folder: klik = buka folder (contextmenu = seleksi ala desktop) -->
  <button
    type="button"
    class="icon-click"
    onclick={handleClick}
    oncontextmenu={(e) => { e.preventDefault(); isSelected = true; }}
    title="{label} ({count} file)"
  >
    <!-- SVG Folder Icon Win95 Asli (pixel-perfect, outline hitam, kuning bevel) -->
    <svg
      width="72"
      height="58"
      viewBox="0 0 32 26"
      shape-rendering="crispEdges"
      class="{isSelected ? 'icon-selected-img' : ''}"
      aria-hidden="true"
    >
      <!-- Outline hitam dasar folder -->
      <rect x="1" y="3" width="30" height="22" fill="#000000" />
      <!-- Tab folder (kiri atas) -->
      <rect x="1" y="1" width="14" height="4" fill="#000000" />

      <!-- Bevel terang atas folder -->
      <rect x="2" y="6" width="28" height="2" fill="#ffe9a8" />
      <rect x="2" y="4" width="12" height="2" fill="#ffe9a8" />
      <!-- Sisi kiri terang -->
      <rect x="2" y="6" width="1" height="18" fill="#ffe9a8" />

      <!-- Body kuning utama folder -->
      <rect x="3" y="8" width="27" height="16" fill="#ffce4b" />
      <rect x="2" y="6" width="28" height="2" fill="#ffd985" />

      <!-- Bevel gelap bawah + kanan -->
      <rect x="3" y="23" width="27" height="1" fill="#c79100" />
      <rect x="29" y="8" width="1" height="16" fill="#c79100" />

      <!-- Highlight tipis kedua pada tepi atas -->
      <rect x="3" y="8" width="25" height="1" fill="#fff3c4" />

      <!-- Tab kuning di atas outline -->
      <rect x="2" y="2" width="12" height="2" fill="#ffd985" />
      <rect x="2" y="3" width="1" height="3" fill="#ffe9a8" />
    </svg>

    <!-- Label desktop ala Win95: di bawah icon -->
    <span
      class="desktop-label font-pixel {isSelected ? 'label-selected' : ''}"
    >
      {label}
    </span>
  </button>
</div>

<style>
  .desktop-icon {
    position: absolute;
    width: 108px;
    user-select: none;
    cursor: grab;
    z-index: 10;
  }

  .desktop-icon:active {
    cursor: grabbing;
    z-index: 100;
  }

  .icon-click {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: none;
    padding: 6px 4px;
    cursor: pointer;
    width: 100%;
  }

  .icon-click:focus-visible {
    outline: 2px dashed #ffffff;
    outline-offset: 2px;
  }

  /* Label desktop Win95: putih dengan shadow hitam tipis */
  .desktop-label {
    display: block;
    width: 100%;
    text-align: center;
    color: #ffffff;
    font-size: 9px;
    font-weight: bold;
    line-height: 1.35;
    padding: 2px 4px;
    letter-spacing: 0.5px;
    text-shadow: 1px 1px 0 #000000;
    word-wrap: break-word;
    white-space: pre-line;
    background: transparent;
    border: 1px dotted transparent;
    transition: background 0.1s ease, border-color 0.1s ease;
  }

  /* Seleksi ala desktop: highlight biru dengan teks putih */
  .label-selected {
    background: #2563eb;
    border: 1px dotted rgba(255, 255, 255, 0.8);
    text-shadow: none;
  }

  .icon-selected-img {
    filter: brightness(0.92) saturate(1.1);
  }

  /* Glow saat memuat item yang di-highlight AI */
  .icon-glow svg {
    filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.95));
  }
</style>
