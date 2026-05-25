class ObjModel extends Model {
    constructor(color) {
        super(color);
        this.loaded = false;
    }

    load(url) {
        return fetch(url)
            .then(response => response.text())
            .then(text => {
                this.parse(text);
                this.loaded = true;
                return this;
            });
    }

    parse(text) {
        let positions = [];
        let sourceNormals = [];
        let triangles = [];

        let lines = text.split(/\r?\n/);
        for (let rawLine of lines) {
            let line = rawLine.trim();
            if (line.length === 0 || line[0] === '#') continue;

            let parts = line.split(/\s+/);
            if (parts[0] === 'v') {
                positions.push([Number(parts[1]), Number(parts[2]), Number(parts[3])]);
            } else if (parts[0] === 'vn') {
                sourceNormals.push([Number(parts[1]), Number(parts[2]), Number(parts[3])]);
            } else if (parts[0] === 'f') {
                let face = [];
                for (let i = 1; i < parts.length; i++) {
                    let tokens = parts[i].split('/');
                    face.push({
                        p: parseInt(tokens[0], 10) - 1,
                        n: tokens.length >= 3 && tokens[2] !== '' ? parseInt(tokens[2], 10) - 1 : -1
                    });
                }

                for (let i = 1; i < face.length - 1; i++) {
                    triangles.push([face[0], face[i], face[i + 1]]);
                }
            }
        }

        let vertices = [];
        let normals = [];
        let indices = [];

        for (let tri of triangles) {
            let fallbackNormal = this.faceNormal(positions[tri[0].p], positions[tri[1].p], positions[tri[2].p]);
            for (let v of tri) {
                let p = positions[v.p];
                let n = v.n >= 0 && v.n < sourceNormals.length ? sourceNormals[v.n] : fallbackNormal;
                vertices.push(p[0], p[1], p[2]);
                normals.push(n[0], n[1], n[2]);
                indices.push(indices.length);
            }
        }

        this.vertices = new Float32Array(vertices);
        this.normals = new Float32Array(normals);
        this.indices = new Uint16Array(indices);
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
}
