const THREE = {
  Vector3: class Vector3 {
    constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
    applyEuler(euler) {
      const {x,y,z} = this;
      const {x: ex, y: ey, z: ez, order} = euler;
      const cos = Math.cos, sin = Math.sin;
      let out = new Vector3(x,y,z);
      const applyX = (v) => { let y1=v.y, z1=v.z; v.y=y1*cos(ex)-z1*sin(ex); v.z=y1*sin(ex)+z1*cos(ex); };
      const applyY = (v) => { let x1=v.x, z1=v.z; v.x=x1*cos(ey)+z1*sin(ey); v.z=-x1*sin(ey)+z1*cos(ey); };
      const applyZ = (v) => { let x1=v.x, y1=v.y; v.x=x1*cos(ez)-y1*sin(ez); v.y=x1*sin(ez)+y1*cos(ez); };
      for (let axis of order) {
        if (axis==='X') applyX(out);
        if (axis==='Y') applyY(out);
        if (axis==='Z') applyZ(out);
      }
      return out;
    }
  },
  Euler: class Euler {
    constructor(x=0,y=0,z=0,order='XYZ'){this.x=x;this.y=y;this.z=z;this.order=order;}
  }
};

const stringEnd = new THREE.Vector3(1, 0, 0); // Should become vertical (Y)
const handle = new THREE.Vector3(0, 1, 0); // Should become forward (-Z)

const eulers = [
  new THREE.Euler(0, -Math.PI/2, Math.PI/2, 'XYZ'),
  new THREE.Euler(-Math.PI/2, 0, Math.PI/2, 'XYZ'),
  new THREE.Euler(0, 0, Math.PI/2, 'XYZ'),
];

for(let euler of eulers) {
    let p1 = stringEnd.applyEuler(euler);
    let p2 = handle.applyEuler(euler);
    console.log(euler, "\n  StringEnd:", p1, "\n  Handle:", p2);
}
