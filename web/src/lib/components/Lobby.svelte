<script lang="ts">
  import { currentPlayer, type Player } from '$lib/stores/player.js';
  import { currentScene } from '$lib/stores/ui.js';
  import Avatar from './Avatar.svelte';
  import { fade, fly } from 'svelte/transition';

  let selectedGender: 'male' | 'female' | null = $state(null);
  let name = $state('');
  let npm = $state('');
  let contact = $state('');
  let errorMsg = $state('');

  // Memilih gender karakter yang akan digunakan
  function pickGender(gender: 'male' | 'female') {
    selectedGender = gender;
  }


  // Validasi form lobby dan simpan profil ke store player
  function submitLobby() {
    if (!selectedGender) {
      errorMsg = 'Pilih karakter dulu!';
      return;
    }
    if (!name.trim() || !npm.trim() || !contact.trim()) {
      errorMsg = 'Nama, NPM, dan Kontak wajib diisi!';
      return;
    }
    errorMsg = '';

    const player: Player = {
      name: name.trim(),
      npm: npm.trim(),
      contact: contact.trim(),
      gender: selectedGender,
    };

    currentPlayer.set(player);
    currentScene.set('board');
  }
</script>

<div class="lobby-scene" transition:fade={{ duration: 300 }}>
  <div class="lobby-content lobby-panel">
    <!-- Judul pemilihan karakter -->
    <div class="text-center mb-2">
      <h2 class="font-pixel text-2xl md:text-3xl text-white mb-2" style="text-shadow: 4px 4px 0 #000;">
        PILIH KARAKTER
      </h2>
      <p class="text-yellow-300 font-bold text-sm" style="text-shadow: 2px 2px 0 #000;">
        Klik karakter, isi data, masuk ke dunia!
      </p>
    </div>

    <!-- Pilihan kartu karakter -->
    <div class="flex flex-row gap-4 justify-center items-stretch flex-wrap mb-3">
      <!-- Karakter Laki-laki -->
      <button
        class="char-card {selectedGender === 'male' ? 'char-card-selected' : 'char-card-dim'}"
        onclick={() => pickGender('male')}
        type="button"
      >
        {#if selectedGender === 'male'}
          <div class="char-card-ribbon font-pixel" transition:fly={{ y: -10, duration: 200 }}>DIPILIH</div>
        {/if}
        <p class="font-pixel text-[9px] text-center mb-1" style="text-shadow: 1px 1px 0 rgba(0,0,0,0.3);">
          LAKI-LAKI
        </p>
        <div class="char-avatar-wrapper lobby-avatar-float">
          <Avatar gender="male" />
        </div>
      </button>

      <!-- Karakter Perempuan -->
      <button
        class="char-card {selectedGender === 'female' ? 'char-card-selected' : 'char-card-dim'}"
        onclick={() => pickGender('female')}
        type="button"
      >
        {#if selectedGender === 'female'}
          <div class="char-card-ribbon font-pixel" transition:fly={{ y: -10, duration: 200 }}>DIPILIH</div>
        {/if}
        <p class="font-pixel text-[9px] text-center mb-1" style="text-shadow: 1px 1px 0 rgba(0,0,0,0.3);">
          PEREMPUAN
        </p>
        <div class="char-avatar-wrapper lobby-avatar-float">
          <Avatar gender="female" />
        </div>
      </button>
    </div>

    <!-- Form data identitas user -->
    <div class="mc-modal-box p-4 max-w-md w-full flex flex-col gap-2">

      <div class="flex flex-col gap-1">
        <label for="lobby-name" class="mc-form-label">Nama</label>
        <input
          id="lobby-name"
          type="text"
          bind:value={name}
          class="mc-input font-sans font-bold"
          placeholder="Nama kamu..."
        />
      </div>

      <div class="flex gap-2">
        <div class="flex flex-col gap-1 flex-1">
          <label for="lobby-npm" class="mc-form-label">NPM</label>
          <input
            id="lobby-npm"
            type="text"
            bind:value={npm}
            class="mc-input font-sans font-bold"
            placeholder="NPM..."
          />
        </div>
        <div class="flex flex-col gap-1 flex-1">
          <label for="lobby-contact" class="mc-form-label">Kontak (WA)</label>
          <input
            id="lobby-contact"
            type="text"
            bind:value={contact}
            class="mc-input font-sans font-bold"
            placeholder="6281234567890"
          />
        </div>
      </div>

      {#if errorMsg}
        <div
          class="bg-red-200 border-4 border-red-600 p-2 text-red-800 text-xs font-sans font-bold text-center"
          transition:fly={{ y: -5, duration: 200 }}
        >
          {errorMsg}
        </div>
      {/if}

      <button
        onclick={submitLobby}
        class="mc-btn bg-green-500 hover:bg-green-600 text-white font-pixel text-[11px] py-3 px-4 rounded w-full lobby-enter-btn"
        style="text-shadow: 1px 1px 0 #000;"
      >
        Masuk ke Board
      </button>
    </div>
  </div>
</div>
