import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Tipe data profil pemain
export interface Player {
  name: string;
  npm: string;
  contact: string;
  gender: 'male' | 'female';
}

// Store reaktif pemain yang disinkronkan dengan storage browser
function createPlayerStore() {
  let initial: Player | null = null;

  // Muat data profil yang tersimpan sebelumnya di browser
  if (browser) {
    const saved = sessionStorage.getItem('lf_player') || localStorage.getItem('lf_player');
    if (saved) {
      try {
        initial = JSON.parse(saved);
      } catch {
        initial = null;
      }
    }
  }

  const { subscribe, set, update } = writable<Player | null>(initial);

  return {
    subscribe,
    // Simpan profil pemain ke sessionStorage dan localStorage
    set: (player: Player | null) => {
      if (browser) {
        if (player) {
          sessionStorage.setItem('lf_player', JSON.stringify(player));
          localStorage.setItem('lf_player', JSON.stringify(player));
        } else {
          sessionStorage.removeItem('lf_player');
          localStorage.removeItem('lf_player');
        }
      }
      set(player);
    },
    update,
    // Hapus sesi login pemain dari storage browser
    logout: () => {
      if (browser) {
        sessionStorage.removeItem('lf_player');
        localStorage.removeItem('lf_player');
      }
      set(null);
    },
  };
}

export const currentPlayer = createPlayerStore();
