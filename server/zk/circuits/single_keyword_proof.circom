pragma circom 2.1.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";

/*
 * SingleKeywordProof Circuit (ZKP v2)
 * ------------------------------------
 * Membuktikan bahwa prover mengetahui SATU keyword rahasia
 * yang di-hash Poseidon menghasilkan nilai yang sama dengan
 * salah satu commitment yang tersimpan di server.
 *
 * Prover membuktikan:
 *   Poseidon(secret) == target_hash
 *
 * Tanpa pernah mengungkapkan nilai secret.
 *
 * Perbedaan dari v1 (OwnershipProof):
 * - v1: 3 keyword sekaligus, AND-gate kaku, perlu dummy padding
 * - v2: 1 keyword per proof, dijalankan berulang, tidak ada dummy
 *
 * Sirkuit ini dipanggil M×N kali di frontend:
 *   untuk setiap keyword claimer × setiap commitment reporter
 *   Jika berhasil = keyword tersebut cocok dengan commitment itu.
 */
template SingleKeywordProof() {

    // ---------------------------------------------------------------
    // Private input — hanya diketahui oleh pengklaim (prover)
    // Nilai ini TIDAK pernah dikirim ke server
    // ---------------------------------------------------------------
    signal input secret;       // field element dari keyword pengklaim

    // ---------------------------------------------------------------
    // Public input — tersimpan di server sejak report phase
    // Siapapun bisa melihat nilai ini (bukan rahasia)
    // ---------------------------------------------------------------
    signal input target_hash;  // commitment[i] dari pelapor

    // ---------------------------------------------------------------
    // Hitung Poseidon hash dari secret
    // ---------------------------------------------------------------
    component h = Poseidon(1);
    h.inputs[0] <== secret;

    // ---------------------------------------------------------------
    // Constraint utama: hasil hash HARUS sama dengan target_hash
    // Kalau tidak sama → constraint gagal → proof tidak bisa digenerate
    // ---------------------------------------------------------------
    h.out === target_hash;
}

// target_hash adalah public input (diketahui verifier)
// secret tetap private (tidak disebutkan di sini)
component main {public [target_hash]} = SingleKeywordProof();
