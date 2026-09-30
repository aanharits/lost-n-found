<script lang="ts">
  import type { Item } from "$lib/stores/items.js";
  import { highlight, isItemHighlighted } from "$lib/stores/highlight.js";
  import { draggable } from "$lib/actions/draggable.js";
  import { fly } from "svelte/transition";
  import TagIcon from "../shared/TagIcon.svelte";
  import { formatShortCode } from "$lib/utils/shortCode.js";

  let {
    item,
    currentPlayerNpm = "",
    onClaim,
    onReviewClaims,
    onDragEnd,
    onDelete,
  }: {
    item: Item;
    currentPlayerNpm?: string;
    onClaim: () => void;
    onReviewClaims: () => void;
    onDragEnd: (x: number, y: number) => void;
    onDelete?: () => void;
  } = $props();

  let isMobile = $state(false);

  // Deteksi viewport mobile — reaktif terhadap resize
  $effect(() => {
    const update = () => {
      isMobile = window.innerWidth < 768;
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  });

  // Styling header dan klaim
  const headerClass = $derived(item.type === "found" ? "found" : "");
  const headerText = $derived(item.type === "found" ? "KETEMU" : "HILANG");
  const pendingClaims = $derived(
    (item.claims || []).filter((c) => c.status === "pending"),
  );

  // Evaluasi status highlight kartu
  const isHighlighted = $derived(isItemHighlighted(item, $highlight));
  const isDimmed = $derived(!!$highlight && !isHighlighted);

  // Cek apakah item ini milik player yang sedang login
  const isOwnItem = $derived(
    !!currentPlayerNpm &&
      !!item.reporterNpm &&
      currentPlayerNpm === item.reporterNpm,
  );

  // Klaim milik player ini (semua status). Batas = 1 klaim awal + 1 revisi.
  const myClaims = $derived(
    !!currentPlayerNpm
      ? (item.claims || []).filter((c) => c.claimantNpm === currentPlayerNpm)
      : [],
  );
  const myApprovedClaim = $derived(myClaims.find((c) => c.status === "approved"));
  const myPendingClaim = $derived(myClaims.find((c) => c.status === "pending"));

  // Masih boleh klaim/revisi: belum disetujui DAN percobaan belum habis (< 2)
  const canClaim = $derived(!myApprovedClaim && myClaims.length < 2);

  // Human-readable short ID
  const displayCode = $derived(formatShortCode(item.shortCode, item.id));
</script>

<div
  class="item-card {item.status === 'resolved'
    ? 'resolved-card'
    : ''} {isHighlighted ? 'highlighted-card' : ''} {isDimmed
    ? 'dimmed-card'
    : ''}"
  id={item.id}
  style="left: {item.x}px; top: {item.y}px;"
  use:draggable={{ itemId: item.id, containerId: "board-container", onDragEnd }}
  transition:fly={{ y: -30, duration: 400 }}
>
  <!-- Pushpin 8-bit -->
  <div
    class="absolute -top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-[#140b05] shadow-[0_2px_0px_#140b05] z-30 pointer-events-none"
  >
    <div class="w-1 h-1 rounded-full bg-red-300 ml-0.5 mt-0.5"></div>
  </div>

  <!-- Badge pending claim (hanya visible untuk pelapor barang) -->
  {#if isOwnItem && pendingClaims.length > 0}
    <button
      class="claim-badge font-pixel"
      onclick={(e) => {
        e.stopPropagation();
        onReviewClaims();
      }}
      type="button"
      title="Lihat pengajuan klaim untuk barang ini"
    >
      {pendingClaims.length} KLAIM
    </button>
  {/if}

  <!-- Pita status selesai -->
  {#if item.status === "resolved"}
    <div class="resolved-ribbon font-pixel">SELESAI</div>
  {/if}

  <div
    class="card-inner-frame w-full h-full flex flex-col overflow-hidden rounded-[1px]"
  >
    <div class="card-header font-pixel {headerClass}">
      <span>{headerText}</span>
    </div>
    <div class="card-image flex items-center justify-center">
      <TagIcon
        tag={item.tag}
        fallback={item.icon}
        size={48}
        title={item.title}
      />
    </div>
    <div
      class="p-2 bg-[#fefce8] flex-grow flex flex-col justify-between min-h-0"
    >
      <div class="min-h-0 flex flex-col gap-0.5">
        <div class="flex items-center justify-between gap-2 min-w-0">
          <p
            class="font-bold text-[15px] leading-tight text-[#2c1b0f] truncate font-sans min-w-0 flex-1"
            title={item.title}
          >
            {item.title}
          </p>
          <span
            class="font-mono text-[10px] font-bold text-stone-500 shrink-0 tracking-wider select-none"
            title="ID: {displayCode}"
          >
            {displayCode}
          </span>
        </div>
        <p class="text-[10px] text-[#78350f] font-bold font-sans leading-none">
          {item.date || "-"} | {item.time || "-"}
        </p>
        <p
          class="text-[11px] text-[#451a03] font-medium font-sans truncate flex items-center gap-1 mt-0.5"
          title={item.desc}
        >
          <span class="truncate">{item.desc || "-"}</span>
        </p>
      </div>

      <!-- Tombol aksi di bagian bawah kartu -->
      {#if item.status === "resolved"}
        <button
          disabled
          class="bg-[#78716c] text-[#e7e5e4] font-pixel text-[8px] py-1.5 mt-1 w-full rounded border-2 border-[#44403c] cursor-not-allowed text-center select-none tracking-wider"
        >
          SUDAH DIKLAIM
        </button>
      {:else if isOwnItem}
        <!-- Tombol aksi hapus untuk laporan milik sendiri -->
        {#if item.status === "disputed"}
          <button
            disabled
            title="Laporan sedang dalam proses klaim / sanggah"
            type="button"
            class="bg-[#78716c] text-[#d6d3d1] font-pixel text-[7.5px] py-1.5 mt-1 w-full rounded border-2 border-[#44403c] cursor-not-allowed text-center select-none tracking-wider"
          >
            PROSES KLAIM
          </button>
        {:else}
          <button
            onclick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            type="button"
            title="Hapus laporan ini dari papan"
            class="bg-[#dc2626] hover:bg-[#b91c1c] active:translate-y-0.5 text-white font-pixel text-[8.5px] py-1.5 mt-1 w-full rounded border-2 border-[#140b05] shadow-[2px_2px_0px_#140b05] active:shadow-none cursor-pointer text-center select-none font-bold transition-all tracking-wider flex items-center justify-center"
          >
            HAPUS
          </button>
        {/if}
      {:else if myApprovedClaim}
        <button
          disabled
          title="Klaim Anda untuk barang ini sudah disetujui"
          class="bg-[#78716c] text-[#e7e5e4] font-pixel text-[7.5px] py-1.5 mt-1 w-full rounded border-2 border-[#44403c] cursor-not-allowed text-center select-none tracking-wider"
        >
          KLAIM DISETUJUI
        </button>
      {:else if !canClaim}
        <button
          disabled
          title="Kesempatan revisi klaim untuk barang ini sudah habis"
          class="bg-[#78716c] text-[#d6d3d1] font-pixel text-[7.5px] py-1.5 mt-1 w-full rounded border-2 border-[#44403c] cursor-not-allowed text-center select-none tracking-wider"
        >
          REVISI HABIS
        </button>
      {:else}
        <button
          onclick={onClaim}
          class="bg-[#0284c7] hover:bg-[#0369a1] active:translate-y-0.5 text-white font-pixel text-[8.5px] py-1.5 mt-1 w-full rounded border-2 border-[#140b05] shadow-[2px_2px_0px_#140b05] active:shadow-none cursor-pointer text-center select-none transition-all tracking-wider font-bold"
        >
          {myPendingClaim ? "REVISI KLAIM" : "KLAIM BARANG"}
        </button>
      {/if}
    </div>
  </div>
</div>
