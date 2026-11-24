import * as THREE from 'three';

/* Reusable cel-shading for any glTF character (not used by the current avatar, which ships
 * with its own flat comic shading). Kept as a tool: see applyToon(). */

/**
 * TOON ART CONTROLS — outline, bands, shadow tint and light direction.
 * Colors are sRGB hex. Bands are evaluated on N·L (0 = facing away, 1 = facing light).
 */
export const toonArt = {
  bands: [
    { from: 0.0, color: '#8a6f7a' }, // shadow — warm violet-brown tint, not grey
    { from: 0.2, color: '#d9c6b6' }, // midtone
    { from: 0.62, color: '#ffffff' }, // light
  ],
  keyLight: { color: '#fff1d6', intensity: 2.6, direction: [-0.85, 0.75, 0.75] as [number, number, number] },
  /** Flat fill so eyes and features never fall into pure shadow. */
  fill: { color: '#f3e6d6', intensity: 0.95 },
  outline: {
    color: '#16130f',
    /** Screen-space thickness. Cover is large, portrait is small and tight. */
    thickness: { cover: 0.006, portrait: 0.0035 },
    /** Materials that never get an outline (keeps eyes and lashes readable). */
    skipMaterials: ['Std_Eye_R', 'Std_Eye_L', 'Std_Cornea_R', 'Std_Cornea_L', 'Std_Tearline_R', 'Std_Tearline_L', 'Std_Eyelash', 'UpperTeeth', 'LowerTeeth', 'Std_Tongue', 'Std_Nails'],
  },
  /** Normal maps add noisy micro-banding under toon light; off for a cleaner comic read. */
  useNormalMaps: false,
  /** Per-material fixes discovered while inspecting the placeholder. */
  materialOverrides: {
    // Hair cards: transparency is baked into the diffuse alpha but the glTF says OPAQUE.
    GoZMesh_Default_Material: { alphaTest: 0.45, transparent: false },
    Std_Eyelash: { alphaTest: 0.25, transparent: false },
    Std_Cornea_R: { depthWrite: false },
    Std_Cornea_L: { depthWrite: false },
  } as Record<string, { alphaTest?: number; transparent?: boolean; depthWrite?: boolean; visible?: boolean }>,
};

type ToonArt = typeof toonArt;

/** Builds the 3-band gradient. RGB (not just luminance) so the shadow band is tinted. */
export function makeBandTexture(art: ToonArt = toonArt): THREE.DataTexture {
  const width = 256;
  const data = new Uint8Array(width * 4);
  const bands = [...art.bands].sort((a, b) => a.from - b.from);
  for (let i = 0; i < width; i++) {
    const t = i / (width - 1);
    let band = bands[0];
    for (const b of bands) if (t >= b.from) band = b;
    const c = new THREE.Color(band.color); // sRGB hex -> linear working space
    data.set([c.r * 255, c.g * 255, c.b * 255, 255], i * 4);
  }
  const tex = new THREE.DataTexture(data, width, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export interface ToonReport {
  converted: string[];
  transparent: string[];
  textured: string[];
}

/**
 * Replaces each PBR material with a MeshToonMaterial that keeps the original
 * base colour, texture, vertex colours and alpha behaviour. Geometry, skeleton
 * and animation are untouched. Returns a report used by /lab/avatar.
 */
export function applyToon(root: THREE.Object3D, outlineThickness: number, art: ToonArt = toonArt): ToonReport {
  const gradientMap = makeBandTexture(art);
  const report: ToonReport = { converted: [], transparent: [], textured: [] };
  const cache = new Map<THREE.Material, THREE.Material>();

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const convert = (src: THREE.Material): THREE.Material => {
      if (cache.has(src)) return cache.get(src)!;
      const m = src as THREE.MeshStandardMaterial;
      const o = art.materialOverrides[m.name] ?? {};
      const toon = new THREE.MeshToonMaterial({
        name: m.name,
        color: m.color?.clone() ?? new THREE.Color('#ffffff'),
        map: m.map ?? null,
        gradientMap,
        vertexColors: m.vertexColors,
        transparent: o.transparent ?? m.transparent,
        opacity: m.opacity,
        alphaTest: o.alphaTest ?? m.alphaTest,
        side: m.side,
        depthWrite: o.depthWrite ?? m.depthWrite,
        emissive: m.emissive?.clone(),
        emissiveMap: m.emissiveMap ?? null,
        normalMap: art.useNormalMaps ? m.normalMap ?? null : null,
        alphaMap: m.alphaMap ?? null,
      });
      if (o.visible === false) toon.visible = false;
      const skip = art.outline.skipMaterials.includes(m.name) || toon.transparent;
      toon.userData.outlineParameters = {
        thickness: outlineThickness,
        color: new THREE.Color(art.outline.color).toArray(),
        alpha: 1,
        visible: !skip,
        keepAlive: true,
      };
      report.converted.push(m.name);
      if (toon.transparent || toon.alphaTest > 0) report.transparent.push(m.name);
      if (toon.map) report.textured.push(m.name);
      cache.set(src, toon);
      return toon;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(convert) : convert(mesh.material);
    mesh.frustumCulled = false; // skinned bounds on this asset are unreliable at tiny scale
  });
  return report;
}

/** Normalizes any model to a known height with feet at y=0 and centred on x/z. */
export function normalizeModel(root: THREE.Object3D, height: number): void {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root, true);
  const size = box.getSize(new THREE.Vector3());
  const s = height / (size.y || 1);
  root.scale.multiplyScalar(s);
  root.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(root, true);
  const c = b2.getCenter(new THREE.Vector3());
  root.position.x -= c.x;
  root.position.z -= c.z;
  root.position.y -= b2.min.y;
}
