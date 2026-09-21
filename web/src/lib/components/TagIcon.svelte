<script lang="ts">
  let {
    tag = 'lainnya',
    size = 40,
    className = '',
    fallback = '📦'
  }: {
    tag?: string;
    size?: number;
    className?: string;
    fallback?: string;
  } = $props();

  const normalized = $derived((tag || '').toLowerCase().replace(/[\s-]+/g, '_'));
</script>

<div
  class="tag-icon-container inline-flex items-center justify-center select-none {className}"
  style="width: {size}px; height: {size}px;"
>
  {#if normalized === 'hp'}
    <!-- 8-Bit Smartphone -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <rect x="6" y="2" width="12" height="20" rx="2" fill="#1e293b" stroke="#0f172a" stroke-width="2" />
      <rect x="8" y="5" width="8" height="13" fill="#38bdf8" />
      <rect x="10" y="3" width="4" height="1" fill="#94a3b8" />
      <circle cx="12" cy="19.5" r="1" fill="#f8fafc" />
    </svg>
  {:else if normalized === 'laptop'}
    <!-- 8-Bit Laptop -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <rect x="5" y="4" width="14" height="11" rx="1" fill="#334155" stroke="#0f172a" stroke-width="2" />
      <rect x="7" y="6" width="10" height="7" fill="#60a5fa" />
      <path d="M2 17h20v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2z" fill="#64748b" stroke="#0f172a" stroke-width="2" />
      <rect x="10" y="17" width="4" height="1" fill="#cbd5e1" />
    </svg>
  {:else if normalized === 'tws'}
    <!-- 8-Bit TWS Earbuds & Case -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <rect x="5" y="7" width="14" height="13" rx="3" fill="#f8fafc" stroke="#0f172a" stroke-width="2" />
      <line x1="5" y1="12" x2="19" y2="12" stroke="#0f172a" stroke-width="2" />
      <circle cx="12" cy="15" r="1" fill="#22c55e" />
      <rect x="8" y="3" width="3" height="4" rx="1" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5" />
      <rect x="13" y="3" width="3" height="4" rx="1" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5" />
    </svg>
  {:else if normalized === 'casan'}
    <!-- 8-Bit Charger & Cable -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <rect x="7" y="8" width="10" height="10" rx="1" fill="#e2e8f0" stroke="#0f172a" stroke-width="2" />
      <rect x="9" y="3" width="2" height="5" fill="#94a3b8" />
      <rect x="13" y="3" width="2" height="5" fill="#94a3b8" />
      <path d="M12 18v3h-4" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" />
    </svg>
  {:else if normalized === 'kalkulator'}
    <!-- 8-Bit Calculator -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <rect x="5" y="3" width="14" height="18" rx="2" fill="#475569" stroke="#0f172a" stroke-width="2" />
      <rect x="7" y="5" width="10" height="4" fill="#a7f3d0" stroke="#0f172a" stroke-width="1" />
      <!-- buttons -->
      <circle cx="8" cy="12" r="1" fill="#f8fafc" />
      <circle cx="12" cy="12" r="1" fill="#f8fafc" />
      <circle cx="16" cy="12" r="1" fill="#f8fafc" />
      <circle cx="8" cy="15" r="1" fill="#f8fafc" />
      <circle cx="12" cy="15" r="1" fill="#f8fafc" />
      <circle cx="16" cy="15" r="1" fill="#f8fafc" />
      <rect x="7" y="17.5" width="6" height="1.5" fill="#f8fafc" />
      <circle cx="16" cy="18" r="1" fill="#f59e0b" />
    </svg>
  {:else if normalized === 'smartwatch'}
    <!-- 8-Bit Smartwatch -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <rect x="9" y="2" width="6" height="4" fill="#f97316" stroke="#0f172a" stroke-width="1.5" />
      <rect x="9" y="18" width="6" height="4" fill="#f97316" stroke="#0f172a" stroke-width="1.5" />
      <rect x="6" y="6" width="12" height="12" rx="2" fill="#1e293b" stroke="#0f172a" stroke-width="2" />
      <rect x="8" y="8" width="8" height="8" fill="#38bdf8" />
      <line x1="12" y1="9" x2="12" y2="12" stroke="#0f172a" stroke-width="1.5" />
      <line x1="12" y1="12" x2="14" y2="12" stroke="#0f172a" stroke-width="1.5" />
    </svg>
  {:else if normalized === 'kacamata'}
    <!-- 8-Bit Glasses -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <rect x="3" y="9" width="7" height="6" rx="1" fill="#38bdf8" stroke="#0f172a" stroke-width="2" />
      <rect x="14" y="9" width="7" height="6" rx="1" fill="#38bdf8" stroke="#0f172a" stroke-width="2" />
      <path d="M10 11h4" stroke="#0f172a" stroke-width="2" />
      <path d="M3 10L1 9M21 10l2-1" stroke="#0f172a" stroke-width="2" />
    </svg>
  {:else if normalized === 'jaket'}
    <!-- 8-Bit Jacket/Hoodie -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <path d="M8 4h8l4 4v12h-4v-7h-8v7H4V8l4-4z" fill="#f43f5e" stroke="#0f172a" stroke-width="2" />
      <line x1="12" y1="6" x2="12" y2="20" stroke="#0f172a" stroke-width="2" />
      <rect x="11" y="9" width="2" height="3" fill="#facc15" />
    </svg>
  {:else if normalized === 'sepatu'}
    <!-- 8-Bit Sneaker -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <path d="M3 13l5-4h4v3h5l4 3v3H3v-5z" fill="#06b6d4" stroke="#0f172a" stroke-width="2" />
      <path d="M3 18h18v2H3z" fill="#f8fafc" stroke="#0f172a" stroke-width="2" />
      <circle cx="10" cy="11" r="1" fill="#f8fafc" />
      <circle cx="13" cy="11" r="1" fill="#f8fafc" />
    </svg>
  {:else if normalized === 'tas'}
    <!-- 8-Bit Backpack -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <rect x="6" y="6" width="12" height="14" rx="3" fill="#8b5cf6" stroke="#0f172a" stroke-width="2" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="#0f172a" stroke-width="2" />
      <rect x="8" y="12" width="8" height="6" rx="1" fill="#c084fc" stroke="#0f172a" stroke-width="1.5" />
    </svg>
  {:else if normalized === 'perhiasan'}
    <!-- 8-Bit Diamond Ring -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <circle cx="12" cy="14" r="6" stroke="#f59e0b" stroke-width="2.5" fill="none" />
      <path d="M9 5h6l2 3-5 4-5-4 2-3z" fill="#38bdf8" stroke="#0f172a" stroke-width="1.5" />
    </svg>
  {:else if normalized === 'kaos_kaki'}
    <!-- 8-Bit Socks -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <path d="M7 4h6v8l4 3v4l-4 2-6-3V4z" fill="#ec4899" stroke="#0f172a" stroke-width="2" />
      <rect x="7" y="4" width="6" height="2" fill="#fbcfe8" />
    </svg>
  {:else if normalized === 'topi'}
    <!-- 8-Bit Cap -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <path d="M4 14a8 8 0 0116 0v2H4v-2z" fill="#ef4444" stroke="#0f172a" stroke-width="2" />
      <path d="M18 16h5v1a1 1 0 01-1 1h-4v-2z" fill="#b91c1c" stroke="#0f172a" stroke-width="1.5" />
      <circle cx="12" cy="6" r="1.5" fill="#facc15" />
    </svg>
  {:else if normalized === 'kunci'}
    <!-- 8-Bit Key -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <circle cx="8" cy="12" r="5" fill="#fbbf24" stroke="#0f172a" stroke-width="2" />
      <circle cx="8" cy="12" r="2" fill="#fefce8" stroke="#0f172a" stroke-width="1.5" />
      <path d="M13 12h8v3h-2v-2h-2v2h-2v-3z" fill="#fbbf24" stroke="#0f172a" stroke-width="2" />
    </svg>
  {:else if normalized === 'helm'}
    <!-- 8-Bit Helmet -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <path d="M4 14a8 8 0 0116 0v4H4v-4z" fill="#0284c7" stroke="#0f172a" stroke-width="2" />
      <rect x="11" y="11" width="9" height="5" rx="1" fill="#1e293b" stroke="#0f172a" stroke-width="1.5" />
    </svg>
  {:else if normalized === 'dompet'}
    <!-- 8-Bit Wallet -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <rect x="4" y="6" width="16" height="12" rx="2" fill="#92400e" stroke="#0f172a" stroke-width="2" />
      <path d="M4 10h16" stroke="#0f172a" stroke-width="1.5" />
      <rect x="14" y="10" width="5" height="4" rx="1" fill="#d97706" stroke="#0f172a" stroke-width="1.5" />
      <circle cx="16.5" cy="12" r="0.8" fill="#fef3c7" />
    </svg>
  {:else if normalized === 'tempat_makan'}
    <!-- 8-Bit Lunchbox / Tumbler -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <rect x="5" y="8" width="14" height="12" rx="2" fill="#10b981" stroke="#0f172a" stroke-width="2" />
      <rect x="4" y="6" width="16" height="3" rx="1" fill="#34d399" stroke="#0f172a" stroke-width="1.5" />
      <rect x="9" y="11" width="6" height="5" rx="1" fill="#f8fafc" />
    </svg>
  {:else if normalized === 'buku'}
    <!-- 8-Bit Book -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <rect x="5" y="4" width="14" height="16" rx="1" fill="#2563eb" stroke="#0f172a" stroke-width="2" />
      <path d="M5 4h3v16H5z" fill="#1d4ed8" stroke="#0f172a" stroke-width="1.5" />
      <line x1="10" y1="8" x2="16" y2="8" stroke="#f8fafc" stroke-width="1.5" />
      <line x1="10" y1="12" x2="16" y2="12" stroke="#f8fafc" stroke-width="1.5" />
    </svg>
  {:else if normalized === 'alat_tulis'}
    <!-- 8-Bit Pencil -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <path d="M16 3l5 5-11 11H5v-5L16 3z" fill="#facc15" stroke="#0f172a" stroke-width="2" />
      <path d="M5 19l3-1-2-2-1 3z" fill="#0f172a" />
      <rect x="15" y="4" width="2" height="7" transform="rotate(45 15 4)" fill="#ef4444" />
    </svg>
  {:else if normalized === 'make_up'}
    <!-- 8-Bit Lipstick -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <rect x="8" y="11" width="8" height="10" rx="1" fill="#1e293b" stroke="#0f172a" stroke-width="2" />
      <path d="M10 11V5l4-2v8H10z" fill="#f43f5e" stroke="#0f172a" stroke-width="2" />
      <rect x="8" y="11" width="8" height="2" fill="#f59e0b" />
    </svg>
  {:else if normalized === 'ktm'}
    <!-- 8-Bit KTM Card -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <rect x="3" y="5" width="18" height="14" rx="2" fill="#059669" stroke="#0f172a" stroke-width="2" />
      <rect x="5" y="8" width="5" height="6" fill="#f8fafc" stroke="#0f172a" stroke-width="1" />
      <line x1="12" y1="9" x2="18" y2="9" stroke="#f8fafc" stroke-width="1.5" />
      <line x1="12" y1="12" x2="17" y2="12" stroke="#facc15" stroke-width="1.5" />
    </svg>
  {:else if normalized === 'ktp'}
    <!-- 8-Bit KTP Card -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <rect x="3" y="5" width="18" height="14" rx="2" fill="#0284c7" stroke="#0f172a" stroke-width="2" />
      <rect x="5" y="8" width="5" height="6" fill="#f8fafc" stroke="#0f172a" stroke-width="1" />
      <line x1="12" y1="9" x2="18" y2="9" stroke="#f8fafc" stroke-width="1.5" />
      <line x1="12" y1="12" x2="16" y2="12" stroke="#f8fafc" stroke-width="1.5" />
    </svg>
  {:else if normalized === 'sim'}
    <!-- 8-Bit SIM Driver License -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <rect x="3" y="5" width="18" height="14" rx="2" fill="#dc2626" stroke="#0f172a" stroke-width="2" />
      <rect x="5" y="8" width="5" height="6" fill="#f8fafc" stroke="#0f172a" stroke-width="1" />
      <line x1="12" y1="9" x2="18" y2="9" stroke="#f8fafc" stroke-width="1.5" />
      <line x1="12" y1="12" x2="18" y2="12" stroke="#f8fafc" stroke-width="1.5" />
    </svg>
  {:else if normalized === 'atm'}
    <!-- 8-Bit ATM Card -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <rect x="3" y="5" width="18" height="14" rx="2" fill="#4f46e5" stroke="#0f172a" stroke-width="2" />
      <rect x="6" y="8" width="3" height="3" fill="#facc15" stroke="#0f172a" stroke-width="1" />
      <line x1="3" y1="13" x2="21" y2="13" stroke="#0f172a" stroke-width="2" />
    </svg>
  {:else if normalized === 'kartu_praktikum'}
    <!-- 8-Bit Lab Badge -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <rect x="4" y="6" width="16" height="14" rx="2" fill="#d97706" stroke="#0f172a" stroke-width="2" />
      <circle cx="12" cy="4" r="2" fill="#78350f" stroke="#0f172a" stroke-width="1.5" />
      <rect x="7" y="10" width="10" height="6" fill="#fef3c7" stroke="#0f172a" stroke-width="1" />
    </svg>
  {:else}
    <!-- 8-Bit Mystery Mystery Box / Fallback -->
    {#if fallback && fallback !== '📦'}
      <span class="text-2xl leading-none">{fallback}</span>
    {:else}
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
        <rect x="4" y="4" width="16" height="16" rx="2" fill="#eab308" stroke="#0f172a" stroke-width="2" />
        <path d="M10 8a2 2 0 114 0c0 1.5-2 1.5-2 3v1" stroke="#0f172a" stroke-width="2" stroke-linecap="round" />
        <circle cx="12" cy="15.5" r="1" fill="#0f172a" />
      </svg>
    {/if}
  {/if}
</div>

<style>
  .pixel-art {
    image-rendering: pixelated;
    shape-rendering: crispEdges;
  }
</style>
