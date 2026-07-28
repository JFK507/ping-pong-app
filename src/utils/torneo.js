import { TARGET_QF, TARGET_SF, TIEBREAK_SET } from "../constants/config";

export const setTarget = (i) =>
  i === TIEBREAK_SET ? TARGET_QF : TARGET_SF;

export const setAdv = (i) =>
  i !== TIEBREAK_SET;

export const isWin = (x, y, target, adv) =>
  adv
    ? x >= target && x - y >= 2
    : x >= target;