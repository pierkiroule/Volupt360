import * as THREE from "three";

/** A canvas label, positioned in local sculpture space and facing the visitor. */
export function createPoeticWord({ word, text, id, position }) {
  const canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d");
  const font = '500 64px "Georgia", serif';
  ctx.font = font;
  canvas.width = Math.ceil(ctx.measureText(word).width) + 40;
  canvas.height = 112;
  ctx.font = font;
  ctx.fillStyle = "#080808";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(word, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);
  sprite.scale.set((canvas.width / canvas.height) * 1.5, 1.5, 1);
  sprite.renderOrder = 20;
  let age = 0;
  return {
    sprite,
    id,
    text,
    word,
    update(dt, fade = 1) {
      age += dt;
      material.opacity = Math.min(1, age / 1.3) * fade;
    },
    dispose() {
      texture.dispose();
      material.dispose();
      sprite.removeFromParent();
    },
  };
}
