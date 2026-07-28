// src/utils/fotos.js

export function comprimirFoto(file, lado = 256) {
  return new Promise((res, rej) => {
    const fr = new FileReader();

    fr.onerror = () => rej(new Error("lectura"));

    fr.onload = () => {
      const img = new Image();

      img.onerror = () => rej(new Error("imagen"));

      img.onload = () => {
        const side = Math.min(img.width, img.height);

        const cv = document.createElement("canvas");
        cv.width = lado;
        cv.height = lado;

        cv
          .getContext("2d")
          .drawImage(
            img,
            (img.width - side) / 2,
            (img.height - side) / 2,
            side,
            side,
            0,
            0,
            lado,
            lado
          );

        res(cv.toDataURL("image/jpeg", 0.72));
      };

      img.src = fr.result;
    };

    fr.readAsDataURL(file);
  });
}