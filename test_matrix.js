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

const ep = new THREE.Vector3(1, 0, 0);
const mid = new THREE.Vector3(0, 1, 0);

// We want ep to be (0, 1, 0)
// We want mid to be (0, 0, -1)

const e = new THREE.Euler(-Math.PI/2, 0, Math.PI/2, 'XYZ');
console.log("ep mapped:", ep.applyEuler(e));
console.log("mid mapped:", mid.applyEuler(e));
