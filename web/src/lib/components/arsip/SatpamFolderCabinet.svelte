<script lang="ts">
  import { fly } from "svelte/transition";
  import { highlight } from "$lib/stores/highlight.js";

  // Warna aksen lebih tegas & kontras untuk strip pengganti warna hitam di samping tab
  export const FOLDER_ACCENTS: Record<string, string> = {
    found: "#16a34a",    // Hijau emerald kontras & tegas
    lost: "#2563eb",     // Biru royal kontras
    resolved: "#9333ea", // Ungu vibran
    gadget: "#0891b2",   // Cyan / Deep aqua
    pakaian: "#db2777",  // Pink / Deep rose
    personal: "#ea580c", // Orange tegas
    dokumen: "#dc2626",  // Merah kontras
  };

  let {
    folderId,
    label,
    kind,
    count,
    accentColor,
    onOpen,
  }: {
    folderId: string;
    label: string;
    kind?: string;
    count: number;
    accentColor?: string;
    onOpen: () => void;
  } = $props();

  const stripColor = $derived(
    accentColor || FOLDER_ACCENTS[kind || "found"] || FOLDER_ACCENTS.found,
  );

  let isSelected = $state(false);
  let isPressed = $state(false);

  // Icon folder bersinar bila memuat item yang di-highlight Satpam AI
  const hasHighlight = $derived(
    !!$highlight && $highlight.itemIds.length > 0 && count > 0,
  );

  // Klik = animasi tekan dulu, lalu modal terbuka (feedback ala game)
  function handleClick() {
    if (isPressed) return;
    isSelected = false;
    isPressed = true;
    setTimeout(() => {
      isPressed = false;
      onOpen();
    }, 160);
  }
</script>

<div
  id={folderId}
  class="desktop-icon {hasHighlight ? 'icon-glow' : ''}"
  transition:fly={{ y: -20, duration: 350 }}
  role="button"
  tabindex="0"
  onkeydown={(e) => {
    if (e.key === "Enter") onOpen();
  }}
  aria-label="Folder {label}"
>
  <!-- Area ikon folder: klik = buka folder (contextmenu = seleksi ala desktop) -->
  <button
    type="button"
    class="icon-click {isPressed ? 'icon-pressed' : ''}"
    onclick={handleClick}
    oncontextmenu={(e) => {
      e.preventDefault();
      isSelected = true;
    }}
    title="{label} ({count} file)"
  >
    <!-- SVG Folder Icon Win95: Bodi Kuning Asli + Strip Aksen Warna Pengganti Hitam -->
    <svg
      width="132"
      height="107"
      viewBox="0 0 32 26"
      shape-rendering="crispEdges"
      class="folder-svg {isSelected ? 'icon-selected-img' : ''}"
      aria-hidden="true"
    >
      <!-- Outline hitam dasar folder -->
      <rect x="1" y="3" width="30" height="22" fill="#000000" />
      <rect x="1" y="1" width="14" height="4" fill="#000000" />

      <!-- Strip warna per folder (menggantikan area hitam kosong di samping tab) -->
      <rect x="14" y="4" width="16" height="3" fill={stripColor} />

      <!-- Bevel terang atas folder -->
      <rect x="2" y="6" width="28" height="2" fill="#ffe9a8" />
      <rect x="2" y="4" width="12" height="2" fill="#ffe9a8" />
      <rect x="2" y="6" width="1" height="18" fill="#ffe9a8" />

      <!-- Body kuning utama folder (warna dasar tetap kuning retro) -->
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
    position: relative;
    width: 144px;
    user-select: none;
    cursor: pointer;
    z-index: 10;
    transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1);
  }

  .desktop-icon:hover {
    transform: translateY(-6px) scale(1.04);
  }

  .desktop-icon:active {
    transform: scale(0.96);
  }

  .icon-click {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: none;
    padding: 10px 6px;
    cursor: pointer;
    width: 100%;
  }

  .icon-click:focus-visible {
    outline: 3px dashed #ffffff;
    outline-offset: 2px;
  }

  /* Animasi tekan saat folder diklik: masuk ke bawah lalu modal membuka */
  .icon-pressed {
    animation: icon-press 160ms ease-in forwards;
  }

  @keyframes icon-press {
    0% {
      transform: scale(1);
    }
    55% {
      transform: scale(0.88) translateY(6px);
    }
    100% {
      transform: scale(0.94) translateY(2px);
    }
  }

  .folder-svg {
    transition: transform 0.18s ease, filter 0.18s ease;
  }

  /* Label desktop Win95: putih dengan shadow hitam tipis */
  .desktop-label {
    display: block;
    width: 100%;
    text-align: center;
    color: #ffffff;
    font-size: 11px;
    font-weight: bold;
    line-height: 1.35;
    padding: 3px 4px;
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
    filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.95));
  }
</style>
