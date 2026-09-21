// @ts-ignore — circomlibjs tidak menyertakan deklarasi tipe
import { buildPoseidon } from 'circomlibjs';

type PoseidonFn = ((inputs: any[]) => any) & { F: { toString: (v: any) => string } };

let poseidonPromise: Promise<PoseidonFn> | null = null;

// Menginisialisasi Poseidon sekali saja dan membagikan promise-nya.
// buildPoseidon() relatif mahal; membangunnya per request menambah latensi
// pada setiap laporan barang, jadi cukup sekali di sini.
export function getPoseidon(): Promise<PoseidonFn> {
  if (!poseidonPromise) {
    poseidonPromise = buildPoseidon() as Promise<PoseidonFn>;
  }
  return poseidonPromise;
}

// Menghitung commitment Poseidon (string) dari sebuah field element BigInt
export async function poseidonCommitment(field: bigint): Promise<string> {
  const poseidon = await getPoseidon();
  return poseidon.F.toString(poseidon([field]));
}
