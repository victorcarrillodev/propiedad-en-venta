#!/usr/bin/env python3
"""Genera versiones optimizadas para web de fotos, planos y videos.

Los originales en assets/ no se modifican. Todo lo generado vive en
assets/web/ y la lista de medios se escribe en js/media.js.

Uso (desde la raíz del repo):
    python3 tools/optimizar_medios.py            # solo genera lo que falte
    python3 tools/optimizar_medios.py --forzar   # regenera todo

Requiere: Pillow (con soporte WebP) y ffmpeg.
"""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageOps

RAIZ = Path(__file__).resolve().parent.parent
ASSETS = RAIZ / "assets"
WEB = ASSETS / "web"
FORZAR = "--forzar" in sys.argv

# Fotos destacadas (retocadas). La primera es también la portada.
DESTACADAS = [
    ("nuevo/Gemini_Generated_Image_mhxer7mhxer7mhxe.jpg", "Nave principal de tabique"),
    ("nuevo/Gemini_Generated_Image_lj3ctlj3ctlj3ctl.jpg", "Nave con ventanales y patio frontal"),
    ("nuevo/Gemini_Generated_Image_cdzew7cdzew7cdze.jpg", "Vía férrea con las naves al fondo"),
    ("nuevo/Gemini_Generated_Image_lfuow4lfuow4lfuo.jpg", "Patio de maniobras con firme de concreto"),
    ("nuevo/Gemini_Generated_Image_r2uqokr2uqokr2uq.jpg", "Muros de tabique de las antiguas instalaciones"),
]

PLANOS = [
    "Ubicación regional en Colima",
    "Ubicación en la zona urbana",
    "Contexto del barrio y vialidades",
    "Polígonos y colindancias inmediatas",
    "Polígonos sobre imagen satelital",
    "Detalle de los tres polígonos",
    "Linderos del conjunto",
]


def necesita(destino: Path, origen: Path) -> bool:
    return FORZAR or not destino.exists() or destino.stat().st_mtime < origen.stat().st_mtime


def abrir(origen: Path) -> Image.Image:
    im = Image.open(origen)
    im = ImageOps.exif_transpose(im)
    return im.convert("RGB")


def webp(im: Image.Image, destino: Path, ancho: int, calidad: int) -> tuple[int, int]:
    destino.parent.mkdir(parents=True, exist_ok=True)
    if im.width > ancho:
        alto = round(im.height * ancho / im.width)
        im = im.resize((ancho, alto), Image.LANCZOS)
    im.save(destino, "WEBP", quality=calidad, method=6)
    return im.size


def variantes(origen: Path, base: Path, tamanos: dict[str, tuple[int, int]]) -> dict:
    """tamanos: sufijo -> (ancho máximo, calidad). Devuelve rutas y medidas."""
    salida = {}
    im = None
    for sufijo, (ancho, calidad) in tamanos.items():
        destino = base.with_name(f"{base.name}{sufijo}.webp")
        if necesita(destino, origen):
            im = im or abrir(origen)
            w, h = webp(im, destino, ancho, calidad)
        else:
            with Image.open(destino) as ya:
                w, h = ya.size
        salida[sufijo] = {"src": destino.relative_to(RAIZ).as_posix(), "w": w, "h": h}
    return salida


def orden_whatsapp(p: Path):
    """'6.36.27 PM.jpeg' va antes que '6.36.27 PM (1).jpeg' (orden de captura)."""
    m = re.search(r"at (\d+)\.(\d+)\.(\d+) (AM|PM)(?: \((\d+)\))?", p.name)
    if not m:
        return (999, 0, 0, 0, p.name)
    h, mi, s, ampm, n = m.groups()
    return (int(h) % 12 + (12 if ampm == "PM" else 0), int(mi), int(s), int(n or 0), p.name)


def fotos():
    salida = []
    originales = sorted((ASSETS / "galeria").glob("*.jp*g"), key=orden_whatsapp)
    for i, origen in enumerate(originales, 1):
        v = variantes(origen, WEB / "galeria" / f"foto-{i:02d}",
                      {"": (1600, 70), "-md": (1024, 70), "-sm": (400, 62)})
        salida.append({"src": v[""]["src"], "md": v["-md"]["src"], "thumb": v["-sm"]["src"],
                       "w": v[""]["w"], "h": v[""]["h"]})
    print(f"  galería: {len(salida)} fotos")
    return salida


def destacadas():
    salida = []
    for i, (ruta, alt) in enumerate(DESTACADAS, 1):
        origen = ASSETS / ruta
        v = variantes(origen, WEB / "destacadas" / f"destacada-{i}", {"": (1200, 80), "-sm": (720, 74)})
        salida.append({"src": v[""]["src"], "thumb": v["-sm"]["src"], "w": v[""]["w"], "h": v[""]["h"], "alt": alt})
    # Imagen para compartir en WhatsApp/redes (1200x630).
    og = WEB / "og.jpg"
    origen = ASSETS / DESTACADAS[0][0]
    if necesita(og, origen):
        ImageOps.fit(abrir(origen), (1200, 630), Image.LANCZOS, centering=(0.5, 0.55)).save(
            og, "JPEG", quality=82, optimize=True, progressive=True
        )
    print(f"  destacadas: {len(salida)}")
    return salida


def planos():
    salida = []
    descargas = ASSETS / "descargas"
    descargas.mkdir(parents=True, exist_ok=True)
    for i, titulo in enumerate(PLANOS, 1):
        origen = ASSETS / "pdf-preview" / f"p{i}-1.png"
        v = variantes(origen, WEB / "planos" / f"plano-{i}", {"": (1400, 80), "-sm": (520, 72)})
        pdf_origen = next(RAIZ.glob(f"ANTIGUA INSTALACIONES DEL TREN P-{i} *.pdf"), None)
        pdf = None
        if pdf_origen and pdf_origen.read_bytes()[:4] == b"%PDF":
            pdf_destino = descargas / f"plano-{i}.pdf"
            if necesita(pdf_destino, pdf_origen):
                shutil.copyfile(pdf_origen, pdf_destino)
            pdf = pdf_destino.relative_to(RAIZ).as_posix()
        salida.append({"src": v[""]["src"], "thumb": v["-sm"]["src"], "w": v[""]["w"], "h": v[""]["h"],
                       "titulo": titulo, "pdf": pdf})
    kmz = RAIZ / "POLIGONOS COLIMA.kmz"
    if kmz.exists() and kmz.read_bytes()[:2] == b"PK":
        shutil.copyfile(kmz, descargas / "poligonos-colima.kmz")
    print(f"  planos: {len(salida)}")
    return salida


def videos():
    salida = []
    originales = sorted((ASSETS / "video").glob("*.mp4"), key=lambda p: re.sub(r"\D", "", p.name).zfill(3))
    for i, origen in enumerate(originales, 1):
        destino = WEB / "video" / f"recorrido-{i}.mp4"
        poster = WEB / "video" / f"recorrido-{i}.webp"
        destino.parent.mkdir(parents=True, exist_ok=True)
        if necesita(destino, origen):
            subprocess.run([
                "ffmpeg", "-v", "error", "-y", "-i", str(origen),
                "-vf", "scale=-2:720", "-c:v", "libx264", "-preset", "slow", "-crf", "27",
                "-profile:v", "high", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", str(destino),
            ], check=True)
        if necesita(poster, origen):
            cuadro = poster.with_suffix(".png")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "2", "-i", str(origen),
                            "-frames:v", "1", "-vf", "scale=-2:720", str(cuadro)], check=True)
            webp(abrir(cuadro), poster, 960, 72)
            cuadro.unlink()
        duracion = float(subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(destino)],
            capture_output=True, text=True, check=True).stdout)
        salida.append({"src": destino.relative_to(RAIZ).as_posix(), "poster": poster.relative_to(RAIZ).as_posix(),
                       "duracion": round(duracion)})
    print(f"  videos: {len(salida)}")
    return salida


def main():
    print("Optimizando medios…")
    datos = {
        "DESTACADAS": destacadas(),
        "GALLERY": fotos(),
        "PLANOS": planos(),
        "VIDEOS": videos(),
    }
    lineas = ["// Generado por tools/optimizar_medios.py — no editar a mano."]
    for nombre, valor in datos.items():
        lineas.append(f"window.{nombre} = {json.dumps(valor, ensure_ascii=False, indent=1)};")
    (RAIZ / "js" / "media.js").write_text("\n".join(lineas) + "\n", encoding="utf-8")
    print("Listo: js/media.js actualizado.")


if __name__ == "__main__":
    main()
