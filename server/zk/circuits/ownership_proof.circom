pragma circom 2.1.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";

/*
 * OwnershipProof Circuit
 * ----------------------
 * Membuktikan bahwa prover mengetahui 3 keyword rahasia
 * yang masing-masing di-hash Poseidon menghasilkan nilai
 * yang sama dengan commitment yang tersimpan di server.
 *
 * Prover (pengklaim) membuktikan:
 *   Poseidon(secret_1) == hash_1
 *   Poseidon(secret_2) == hash_2
 *   Poseidon(secret_3) == hash_3
 *
 * Tanpa pernah mengungkapkan nilai secret_1, secret_2, secret_3.
 *
 * Catatan:
 * - secret_i adalah field element hasil konversi keyword via keccak256 % BN254
 * - hash_i adalah Poseidon(secret_i) yang dihitung saat report phase
 * - Jika pelapor hanya punya 2 keyword, secret_3 diisi nilai dummy yang
 *   sama di kedua sisi (pelapor & pengklaim): stringToFieldElement("__empty__")
 */
template OwnershipProof() {

    // ---------------------------------------------------------------
    // Private inputs — hanya diketahui oleh pengklaim (prover)
    // Nilai ini TIDAK pernah dikirim ke server
    // ---------------------------------------------------------------
    signal input secret_1;
    signal input secret_2;
    signal input secret_3;

    // ---------------------------------------------------------------
    // Public inputs — tersimpan di server sejak report phase
    // Siapapun bisa melihat nilai ini (bukan rahasia)
    // ---------------------------------------------------------------
    signal input hash_1;
    signal input hash_2;
    signal input hash_3;

    // ---------------------------------------------------------------
    // Hitung Poseidon hash dari masing-masing secret
    // Poseidon(1) berarti 1 input
    // ---------------------------------------------------------------
    component h1 = Poseidon(1);
    component h2 = Poseidon(1);
    component h3 = Poseidon(1);

    h1.inputs[0] <== secret_1;
    h2.inputs[0] <== secret_2;
    h3.inputs[0] <== secret_3;

    // ---------------------------------------------------------------
    // Constraint utama: hasil hash HARUS sama dengan commitment server
    // Kalau tidak sama → proof invalid → klaim ditolak
    // ---------------------------------------------------------------
    hash_1 === h1.out;
    hash_2 === h2.out;
    hash_3 === h3.out;
}

// Deklarasi main: hash_1, hash_2, hash_3 adalah public input
// secret_1, secret_2, secret_3 tetap private (tidak perlu disebutkan)
component main {public [hash_1, hash_2, hash_3]} = OwnershipProof();
