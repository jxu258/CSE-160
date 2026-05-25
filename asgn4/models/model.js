class Model {
    constructor(color) {
        this.vertices = new Float32Array([]);
        this.indices = new Uint16Array([]);
        this.normals = new Float32Array([]);

        this.color = color;
        this.translate = [0.0, 0.0, 0.0];
        this.rotate = [0.0, 0.0, 0.0];
        this.scale = [1.0, 1.0, 1.0];

        this.forceUnlit = false;
        this.specularStrength = 0.25;
        this.loaded = true;
    }

    setScale(x, y, z) {
        this.scale[0] = x;
        this.scale[1] = y;
        this.scale[2] = z;
    }

    setRotate(x, y, z) {
        this.rotate[0] = x;
        this.rotate[1] = y;
        this.rotate[2] = z;
    }

    setTranslate(x, y, z) {
        this.translate[0] = x;
        this.translate[1] = y;
        this.translate[2] = z;
    }
}

class Wedge extends Model {
    constructor(color) {
        super(color);
        this.buildGeometry();
    }

    addTriangle(vertices, normals, indices, p0, p1, p2) {
        let n = this.faceNormal(p0, p1, p2);
        let start = indices.length;
        vertices.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]);
        normals.push(n[0], n[1], n[2], n[0], n[1], n[2], n[0], n[1], n[2]);
        indices.push(start, start + 1, start + 2);
    }

    faceNormal(p0, p1, p2) {
        let ux = p1[0] - p0[0];
        let uy = p1[1] - p0[1];
        let uz = p1[2] - p0[2];
        let vx = p2[0] - p0[0];
        let vy = p2[1] - p0[1];
        let vz = p2[2] - p0[2];
        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;
        let len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (len === 0) return [0, 1, 0];
        return [nx / len, ny / len, nz / len];
    }

    buildGeometry() {
        let vertices = [];
        let normals = [];
        let indices = [];

        let a = [-1, -1, 1];
        let b = [1, -1, 1];
        let c = [1, -1, -1];
        let d = [-1, -1, -1];
        let top = [0, 1, 0];

        this.addTriangle(vertices, normals, indices, a, b, c);
        this.addTriangle(vertices, normals, indices, a, c, d);
        this.addTriangle(vertices, normals, indices, a, top, b);
        this.addTriangle(vertices, normals, indices, b, top, c);
        this.addTriangle(vertices, normals, indices, c, top, d);
        this.addTriangle(vertices, normals, indices, d, top, a);

        this.vertices = new Float32Array(vertices);
        this.normals = new Float32Array(normals);
        this.indices = new Uint16Array(indices);
    }
}
