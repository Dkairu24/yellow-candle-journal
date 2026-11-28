/** One logged trade. Optional fields are only present when you filled them in. */
export interface ShotRef {
  /** key of the image in IndexedDB and in the cloud bucket */
  k: string;
  /** caption */
  c: string;
}

export interface Trade {
  id: string;
  date: string; // YYYY-MM-DD
  pair: string;
  dir: "Long" | "Short" | string;
  tf?: string;
  /** result in R (profit divided by the amount risked) */
  r: number;
  entry?: number;
  stop?: number;
  exit?: number;
  lots?: number;
  /** older trades may still carry these */
  target?: number;
  plan?: number;
  pnl?: number;
  htf?: string;
  poi?: string;
  sweep?: string;
  trigger?: string | string[];
  disp?: string;
  fresh?: string;
  rules?: string;
  mood?: string;
  tags?: string[];
  link?: string;
  notes?: string;
  chk?: string[];
  chkS?: number;
  chkN?: number;
  /** true when the trade has at least one screenshot */
  shot?: boolean;
  shots?: ShotRef[];
  imported?: boolean;
  created?: number;
  updated?: number;
  /** only on the copies used for dollar totals: the original R result */
  rR?: number;
  [extra: string]: any;
}
