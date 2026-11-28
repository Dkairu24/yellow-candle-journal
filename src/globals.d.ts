// Libraries loaded from a CDN in index.html (see the script tags there).
declare const anime: any;
interface Window {
  supabase: any;
  anime?: any;
  msCrypto?: Crypto;
}
