let Math_hypot = Math.hypot;

let pos = {x:0, y:0, z:0};
let p1 = {x:0, y:10, z:0};
let d1 = Math_hypot(p1.x - pos.x, p1.y - pos.y, p1.z - pos.z);
console.log(d1);

let p2 = {x:1, y:1, z:1};
let d2 = Math_hypot(p2.x - pos.x, p2.y - pos.y, p2.z - pos.z);
console.log(d2);
