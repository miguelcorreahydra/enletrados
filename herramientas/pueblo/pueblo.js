// El pueblo de Enletrados en vista isométrica, armado con piezas de Kenney «Sketch Town» (CC0, www.kenney.nl).
// Es una isla de maqueta de 10×10; el mar se dibuja aparte, en SVG, debajo de la imagen.
// Cuadrícula: x crece hacia abajo a la derecha, y hacia abajo a la izquierda. La esquina de arriba es (0, 0).
// Cada lugar del juego (1 a 10) marca sus piezas. Las piezas con «d» (1 a 6) son los detalles de su escena: aparecen en
// los niveles 1, 4, 8, 13, 20 y 30 de ese lugar. Los efectos de luz de cada escena están en «efectos» (ver escenas.js).
"use strict";
const N = 10;
const piezas = [], lugares = {}, efectos = {};
const poner = (x, y, z, t, id, d) => { piezas.push({ x, y, z, t, l: id || 0, d: d || 0 }); if (id) (lugares[id] = lugares[id] || []).push([x, y, z]); };
// efecto de luz: tipo, casilla [x, y, z] donde se ancla y, si hace falta, otra casilla («hasta»)
const efecto = (id, d, tipo, en, extra) => { (efectos[id] = efectos[id] || []).push(Object.assign({ d, tipo, en }, extra || {})); };

// ---------- terreno ----------
const fuera = (x, y) => (x === 0 && y === 0) || (x === 0 && y === 9) || (x === 9 && y === 9) || (x === 9 && y === 8);
const calle = (x, y) => x === 5 && y >= 2;                 // calle principal: baja hacia la izquierda
const cruce = (x, y) => y === 5 && x >= 2 && x <= 8;        // calle que va al puerto
for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
  if (fuera(x, y)) continue;
  const t = calle(x, y) && cruce(x, y) ? "grass_pathCrossing_N" : calle(x, y) ? "grass_path_N" : cruce(x, y) ? "grass_path_E" : "grass_center_N";
  poner(x, y, 0, t);
}

// ---------- 1 · la panadería: al frente, donde empieza el juego ----------
poner(6, 8, 1, "building_doorBeige_S", 1); poner(6, 8, 2, "roof_gableBrown_S", 1);
efecto(1, 1, "ventanas", [6, 8, 1]);
poner(7, 9, 1, "tree_single_N", 1, 2);
poner(7, 8, 1, "fence_woodCorner_N", 1, 3); poner(8, 8, 1, "fence_wood_E", 1, 3);
poner(6, 9, 1, "furrow_crop_N", 1, 4);
efecto(1, 5, "humo", [6, 8, 2]);
efecto(1, 6, "guirnalda", [6, 8, 1.6], { hasta: [8, 8, 1] });

// ---------- 2 · la plaza de las flores: pozo, flores y árboles ----------
poner(3, 4, 1, "well_N", 2);
efecto(2, 1, "agua", [3, 4, 1]);
poner(2, 4, 1, "furrow_crop_N", 2, 2); poner(4, 4, 1, "furrow_crop_N", 2, 2);
poner(4, 3, 1, "tree_single_N", 2, 3); poner(2, 3, 1, "tree_single_N", 2, 3);
poner(3, 3, 1, "furrow_crop_N", 2, 4);
efecto(2, 5, "mariposas", [3, 4, 2]);
efecto(2, 6, "guirnalda", [2, 3, 2], { hasta: [4, 3, 2] });

// ---------- 3 · la calle principal: casas a los dos lados ----------
const casaCalle = (x, y, pisos, techo, lado, d) => {
  for (let z = 1; z <= pisos; z++) poner(x, y, z, (z === 1 ? "building_doorWindows_" : "building_windows_") + lado, 3, d);
  poner(x, y, pisos + 1, techo + "_" + lado, 3, d);
};
casaCalle(4, 6, 2, "roof_slantBeige", "W"); casaCalle(6, 6, 2, "roof_slantGreen", "E");
efecto(3, 1, "ventanas", [4, 6, 1]); efecto(3, 1, "ventanas", [6, 6, 2]);
casaCalle(4, 7, 2, "roof_slantBrown", "W", 2);
casaCalle(6, 7, 1, "roof_slantPurple", "E", 3);
poner(4, 8, 1, "tree_single_N", 3, 4);
efecto(3, 5, "guirnalda", [4, 6, 3], { hasta: [6, 6, 3] });
efecto(3, 6, "farolitos", [5, 6, 0], { hasta: [5, 8, 0] });

// ---------- 4 · el puerto: casa del pescador y muelle que entra al mar ----------
poner(9, 3, 1, "building_door_E", 4); poner(9, 3, 2, "roof_slantBrown_E", 4);
poner(9, 5, 0.02, "bridge_E", 4); poner(10, 5, -0.2, "bridge_E", 4); poner(11, 5, -0.2, "bridge_E", 4);
efecto(4, 1, "farolitos", [9, 5, 0], { hasta: [11, 5, -0.2] });
poner(9, 4, 1, "fence_woodDouble_N", 4, 2);
poner(8, 4, 1, "rocks_dirt_N", 4, 3);
efecto(4, 4, "aves", [9, 3, 4]);
efecto(4, 5, "barca", [10, 4, -0.4]);
efecto(4, 6, "guirnalda", [9, 3, 2], { hasta: [10, 5, 0] });

// ---------- 5 · el mirador: un cerro al fondo, con baranda y una torre en ruinas ----------
for (const [x, y, h] of [[1, 0, 2], [2, 0, 3], [3, 0, 2], [1, 1, 1], [2, 1, 2], [3, 1, 1], [4, 0, 1], [0, 1, 1]]) {
  for (let z = 1; z <= h; z++) poner(x, y, z, z === h ? "cliff_top_N" : "dirt_center_N", 5);
}
poner(1, 0, 3, "fence_wood_N", 5, 1);
poner(3, 0, 3, "tree_single_N", 5, 2);
poner(2, 0, 4, "castle_endRuined_S", 5, 3);
efecto(5, 4, "aves", [2, 1, 4]);
efecto(5, 5, "nubes", [2, 0, 6]);
efecto(5, 6, "arcoiris", [2, 0, 4]);

// ---------- 6 · la estación de tren: abajo a la derecha ----------
poner(8, 6, 1, "building_doorWindows_S", 6); poner(8, 7, 1, "building_windows_S", 6);
poner(8, 6, 2, "roof_gableGreen_S", 6); poner(8, 7, 2, "roof_gableGreen_S", 6);
efecto(6, 1, "ventanas", [8, 6, 1]); efecto(6, 1, "ventanas", [8, 7, 1]);
poner(9, 6, 1, "fence_wood_E", 6, 2); poner(9, 7, 1, "fence_wood_E", 6, 2);
efecto(6, 3, "reloj", [8, 6, 2]);
poner(7, 6, 1, "tree_single_N", 6, 4);
efecto(6, 5, "humo", [8, 7, 2]);
efecto(6, 6, "guirnalda", [8, 6, 2], { hasta: [8, 7, 2] });

// ---------- 7 · el kiosco de música ----------
poner(7, 2, 1, "structure_arch_N", 7); poner(7, 2, 2, "roof_pointPurple_N", 7);
efecto(7, 1, "farolitos", [6, 2, 1.6], { hasta: [8, 2, 1.6] });
poner(8, 2, 1, "tree_single_N", 7, 2);
efecto(7, 3, "notas", [7, 2, 3]);
poner(6, 2, 1, "furrow_crop_N", 7, 4); poner(7, 3, 1, "furrow_crop_N", 7, 4);
efecto(7, 5, "guirnalda", [7, 2, 2], { hasta: [8, 2, 2] });
efecto(7, 6, "bandera", [7, 2, 3]);

// ---------- 8 · las casas del barrio: abajo a la izquierda ----------
const casa = (x, y, techo, d) => { poner(x, y, 1, "building_door_S", 8, d); poner(x, y, 2, techo, 8, d); };
casa(2, 9, "roof_gableBrown_S"); casa(3, 8, "roof_pointGreen_S");
efecto(8, 1, "ventanas", [2, 9, 1]); efecto(8, 1, "ventanas", [3, 8, 1]);
casa(4, 9, "roof_gablePurple_S", 2);
casa(2, 7, "roof_roundBrown_S", 3);
efecto(8, 4, "humo", [3, 8, 2]);
poner(3, 9, 1, "furrow_crop_N", 8, 5);
efecto(8, 6, "guirnalda", [2, 9, 2], { hasta: [3, 8, 2] });

// ---------- 9 · el sendero del bosque: a la izquierda ----------
for (const [x, y, t] of [[0, 3, "tree_pineLarge_N"], [0, 5, "tree_multiple_N"], [0, 7, "tree_pineLarge_N"], [0, 2, "tree_pine_N"]]) poner(x, y, 1, t, 9);
efecto(9, 1, "luciernagas", [1, 5, 1]);
poner(1, 4, 1, "tree_pine_N", 9, 2); poner(1, 6, 1, "tree_pine_N", 9, 2);
poner(1, 2, 1, "tree_pineLarge_N", 9, 3);
poner(1, 5, 1, "rocks_grass_N", 9, 4);
poner(1, 8, 1, "tree_pine_N", 9, 5); poner(0, 8, 1, "tree_multiple_N", 9, 5);
poner(1, 7, 1, "building_door_S", 9, 6); poner(1, 7, 2, "roof_roundGreen_S", 9, 6);

// ---------- 10 · el faro y el observatorio: la punta derecha ----------
poner(9, 0, 1, "castle_tower_N", 10); poner(9, 0, 2, "castle_tower_N", 10); poner(9, 0, 3, "castle_towerBeige_N", 10); poner(9, 0, 4, "roof_pointBeige_N", 10);
efecto(10, 1, "faro", [9, 0, 3]);
poner(8, 0, 1, "castle_tower_N", 10, 2); poner(8, 0, 2, "roof_roundedPurple_N", 10, 2);
poner(9, 1, 1, "rocks_grass_N", 10, 3);
efecto(10, 4, "estrellas", [8, 1, 5]);
efecto(10, 5, "luna", [7, 0, 5]);
efecto(10, 6, "fugaz", [8, 0, 6]);

module.exports = { piezas, lugares, efectos, N };
