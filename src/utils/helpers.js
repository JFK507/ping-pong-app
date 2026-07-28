// src/utils/helpers.js

export const shuffle = (arr) => {
  const a = [...arr];

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
};

export const vibra = (pattern) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Algunos navegadores no soportan vibración
  }
};