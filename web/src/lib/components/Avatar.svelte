<script lang="ts">
  let { gender = 'male', bodyColor = '', size = 'normal' } = $props();

  // Menentukan class warna pakaian dan skala ukuran avatar
  let bodyClass = $derived(bodyColor || (gender === 'female' ? 'body-pink' : 'body-blue'));
  let scale = $derived(size === 'small' ? 'scale-75' : '');
</script>

<!-- Render komponen avatar pixel art Minecraft -->
<div class="mc-avatar {scale}" style="position:relative; width:120px; height:120px;">
  {#if gender === 'female'}
    <div class="female-hair">
      <div class="female-bangs"></div>
    </div>
  {:else}
    <div class="satpam-hair">
      <div class="hair-spike-1"></div>
      <div class="hair-spike-2"></div>
    </div>
  {/if}
  <div class="avatar-head">
    <div class="avatar-eye eye-left animate-look"></div>
    <div class="avatar-eye eye-right animate-look"></div>
    <div class="avatar-mouth"></div>
  </div>
  <div class="avatar-body {bodyClass}"></div>
</div>
