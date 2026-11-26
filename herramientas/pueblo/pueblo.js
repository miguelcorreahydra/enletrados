// El pueblo de Enletrados en vista isométrica, armado con piezas de Kenney «Sketch Town» (CC0, www.kenney.nl).
// Es una isla de maqueta de 10×10; el mar se dibuja aparte, en SVG, debajo de la imagen.
// Cuadrícula: x crece hacia abajo a la derecha, y hacia abajo a la izquierda. La esquina de arriba es (0, 0).
// Cada lugar del juego (1 a 10) marca sus casillas para encenderlo o apagarlo en la portada.
"use strict";
const N = 10;
const piezas = [], lugares = {};
const poner = (x, y, z, t, id) => { piezas.push({ x, y, z, t, l: id || 0 }); if (id) (lugares[id] = lugares[id] || []).push([x, y, z]); };

// ---------- terreno ----------
const fuera = (x, y) => (x === 0 && y === 0) || (x === 0 && y === 9) || (x === 9 && y === 9) || (x === 9 && y === 8);
const calle = (x, y) => x === 5 && y >= 2;                 // calle principal: baja hacia la izquierda
const cruce = (x, y) => y === 5 && x >= 2 && x <= 8;        // calle que va al puerto
for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
  if (fuera(x, y)) continue;
  const t = calle(x, y) && cruce(x, y) ? "grass_pathCrossing_N" : calle(x, y) ? "grass_path_N" : cruce(x, y) ? "grass_path_E" : "grass_center_N";
  poner(x, y, 0, t);
}

// ---------- 5 · el mirador: un cerro al fondo, con baranda y una torre en ruinas ----------
for (const [x, y, h] of [[1, 0, 2], [2, 0, 3], [3, 0, 2], [1, 1, 1], [2, 1, 2], [3, 1, 1], [4, 0, 1], [0, 1, 1]]) {
  for (let z = 1; z <= h; z++) poner(x, y, z, z === h ? "cliff_top_N" : "dirt_center_N", 5);
}
poner(2, 0, 4, "castle_endRuined_S", 5); poner(1, 0, 3, "fence_wood_N", 5); poner(3, 0, 3, "tree_single_N", 5);

// ---------- 10 · el faro y el observatorio: la punta derecha ----------
poner(9, 0, 1, "castle_tower_N", 10); poner(9, 0, 2, "castle_tower_N", 10); poner(9, 0, 3, "castle_towerBeige_N", 10); poner(9, 0, 4, "roof_pointBeige_N", 10);
poner(8, 0, 1, "castle_tower_N", 10); poner(8, 0, 2, "roof_roundedPurple_N", 10);
poner(9, 1, 1, "rocks_grass_N", 10);

// ---------- 4 · el puerto: casa del pescador y muelle que entra al mar ----------
poner(9, 3, 1, "building_door_E", 4); poner(9, 3, 2, "roof_slantBrown_E", 4);
poner(9, 5, 0.02, "bridge_E", 4); poner(10, 5, -0.2, "bridge_E", 4); poner(11, 5, -0.2, "bridge_E", 4);
poner(9, 4, 1, "fence_woodDouble_N", 4);

// ---------- 7 · el kiosco de música ----------
poner(7, 2, 1, "structure_arch_N", 7); poner(7, 2, 2, "roof_pointPurple_N", 7);
poner(8, 2, 1, "tree_single_N", 7);

// ---------- 2 · la plaza de las flores: pozo, flores y árboles ----------
poner(3, 4, 1, "well_N", 2); poner(3, 3, 1, "furrow_cropWheat_N", 2); poner(2, 4, 1, "furrow_crop_N", 2);
poner(4, 3, 1, "tree_single_N", 2); poner(2, 3, 1, "tree_single_N", 2);

// ---------- 3 · la calle principal: casas a los dos lados ----------
for (const [x, y, pisos, techo, lado] of [[4, 6, 2, "roof_slantBeige", "W"], [4, 7, 2, "roof_slantBrown", "W"], [6, 6, 2, "roof_slantGreen", "E"], [6, 7, 1, "roof_slantPurple", "E"]]) {
  for (let z = 1; z <= pisos; z++) poner(x, y, z, (z === 1 ? "building_doorWindows_" : "building_windows_") + lado, 3);
  poner(x, y, pisos + 1, techo + "_" + lado, 3);
}

// ---------- 9 · el sendero del bosque: a la izquierda ----------
for (const [x, y, t] of [[0, 3, "tree_pineLarge_N"], [1, 4, "tree_pine_N"], [0, 5, "tree_multiple_N"], [0, 7, "tree_pineLarge_N"], [1, 6, "tree_pine_N"],
  [0, 2, "tree_pine_N"], [1, 8, "tree_pine_N"], [0, 8, "tree_multiple_N"], [1, 2, "tree_pineLarge_N"]]) poner(x, y, 1, t, 9);

// ---------- 8 · las casas del barrio: abajo a la izquierda ----------
for (const [x, y, techo] of [[2, 9, "roof_gableBrown_S"], [3, 8, "roof_pointGreen_S"], [4, 9, "roof_gablePurple_S"], [2, 7, "roof_roundBrown_S"]]) {
  poner(x, y, 1, "building_door_S", 8); poner(x, y, 2, techo, 8);
}

// ---------- 6 · la estación de tren: abajo a la derecha ----------
poner(8, 6, 1, "building_doorWindows_S", 6); poner(8, 7, 1, "building_windows_S", 6);
poner(8, 6, 2, "roof_gableGreen_S", 6); poner(8, 7, 2, "roof_gableGreen_S", 6);
poner(9, 6, 1, "fence_wood_E", 6); poner(9, 7, 1, "fence_wood_E", 6);

// ---------- 1 · la panadería: al frente, donde empieza el juego ----------
poner(6, 8, 1, "building_doorBeige_S", 1); poner(6, 8, 2, "roof_gableBrown_S", 1);
poner(7, 9, 1, "tree_single_N", 1); poner(7, 8, 1, "fence_woodCorner_N", 1);

module.exports = { piezas, lugares, N };
