// Shaders

// Input: an array of points comes from javascript.
// In this example, think of this array as the variable a_Position;
// Q: Why a_Position is not an array?
// A: Because the GPU process every vertex in parallel
// The language that we use to write the shaders is called GLSL

// Output: sends "an array of points" to the rasterizer.
var VERTEX_SHADER = `
    precision mediump float;

    attribute vec3 a_Position;
    attribute vec3 a_Color;
    attribute vec2 a_UV;

    varying vec3 v_Color;
    varying vec2 v_UV;

    uniform mat4 u_ModelMatrix;
    uniform mat4 u_viewMatrix;
    uniform mat4 u_projectionMatrix;

    void main() {
        v_Color = a_Color;
        v_UV = a_UV;
        gl_Position = u_projectionMatrix * u_viewMatrix * u_ModelMatrix * vec4(a_Position, 1.0);
    }
`;

// Input: a fragment (a grid of pixels) comes from the rasterizer.
// It doesn't have vertices as input
// Ouput: a color goes to HTML canvas.
var FRAGMENT_SHADER = `
    precision mediump float;

    varying vec3 v_Color;
    varying vec2 v_UV;

    uniform vec4 u_BaseColor;
    uniform float u_TexColorWeight;
    uniform int u_TextureChoice;
    uniform sampler2D u_Sampler0;
    uniform sampler2D u_Sampler1;
    uniform sampler2D u_Sampler2;
    uniform sampler2D u_Sampler3;

    void main() {
        vec4 texColor;
        if (u_TextureChoice == 0) {
            texColor = texture2D(u_Sampler0, v_UV);
        } else if (u_TextureChoice == 1) {
            texColor = texture2D(u_Sampler1, v_UV);
        } else if (u_TextureChoice == 2) {
            texColor = texture2D(u_Sampler2, v_UV);
        } else if (u_TextureChoice == 3) {
            texColor = texture2D(u_Sampler3, v_UV);
        } else {
            texColor = vec4(v_Color, 1.0);
        }
        gl_FragColor = mix(u_BaseColor, texColor, u_TexColorWeight);
    }
`;

var gl;
var canvas;
var camera;
var cubeBuffer;
var keys = {};
var shapes = [];
var walls = [];
var map = [];
var textureMap = [];
var lastTime = 0;
var lastMouseX = null;
var textureCount = 4;
var u_ModelMatrix;
var u_viewMatrix;
var u_projectionMatrix;
var u_BaseColor;
var u_TexColorWeight;
var u_TextureChoice;
var cubeVertexCount = 0;
var cubeVertices;
var a_Position;
var a_Color;
var a_UV;
var floatSize;
var identityMatrix;
var gameStatus;
var gameWon = false;
var goalX = -10;
var goalZ = -10;

function makeObject(tx, ty, tz, sx, sy, sz, textureChoice, texWeight, color) {
    let c = new cube();
    c.translate(tx, ty, tz);
    c.scale(sx, sy, sz);
    c.textureChoice = textureChoice;
    c.texWeight = texWeight;
    c.baseColor = color;
    return c;
}

function getTexturedCubeVertices() {
    return new Float32Array([
        1, -1,  1, 1, 1, 1, 0, 0,
        1, -1, -1, 1, 1, 1, 1, 0,
        1,  1, -1, 1, 1, 1, 1, 1,
        1, -1,  1, 1, 1, 1, 0, 0,
        1,  1, -1, 1, 1, 1, 1, 1,
        1,  1,  1, 1, 1, 1, 0, 1,

        -1, -1, -1, 1, 1, 1, 0, 0,
        -1, -1,  1, 1, 1, 1, 1, 0,
        -1,  1,  1, 1, 1, 1, 1, 1,
        -1, -1, -1, 1, 1, 1, 0, 0,
        -1,  1,  1, 1, 1, 1, 1, 1,
        -1,  1, -1, 1, 1, 1, 0, 1,

        1,  1, 1, 1, 1, 1, 0, 1,
        -1,  1, 1, 1, 1, 1, 1, 1,
        -1, -1, 1, 1, 1, 1, 1, 0,
        1,  1, 1, 1, 1, 1, 0, 1,
        -1, -1, 1, 1, 1, 1, 1, 0,
        1, -1, 1, 1, 1, 1, 0, 0,

        1, -1, -1, 1, 1, 1, 1, 0,
        -1, -1, -1, 1, 1, 1, 0, 0,
        -1,  1, -1, 1, 1, 1, 0, 1,
        1, -1, -1, 1, 1, 1, 1, 0,
        -1,  1, -1, 1, 1, 1, 0, 1,
        1,  1, -1, 1, 1, 1, 1, 1,

        1, 1, -1, 1, 1, 1, 1, 0,
        -1, 1, -1, 1, 1, 1, 0, 0,
        -1, 1,  1, 1, 1, 1, 0, 1,
        1, 1, -1, 1, 1, 1, 1, 0,
        -1, 1,  1, 1, 1, 1, 0, 1,
        1, 1,  1, 1, 1, 1, 1, 1,

        1, -1, -1, 1, 1, 1, 1, 1,
        -1, -1, -1, 1, 1, 1, 0, 1,
        -1, -1,  1, 1, 1, 1, 0, 0,
        1, -1, -1, 1, 1, 1, 1, 1,
        -1, -1,  1, 1, 1, 1, 0, 0,
        1, -1,  1, 1, 1, 1, 1, 0,
    ]);
}

function makeMesh(vertices, textureChoice, texWeight, color) {
    let mesh = {
        isMesh: true,
        buffer: gl.createBuffer(),
        vertexCount: vertices.length / 8,
        textureChoice: textureChoice,
        texWeight: texWeight,
        baseColor: color
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    return mesh;
}

function bindAttributes() {
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 8 * floatSize, 0);
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, 8 * floatSize, 3 * floatSize);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 8 * floatSize, 6 * floatSize);
}

function appendTransformedCube(out, tx, ty, tz, sx, sy, sz) {
    let src = cubeVertices;
    for (let i = 0; i < src.length; i += 8) {
        out.push(
            src[i] * sx + tx,
            src[i + 1] * sy + ty,
            src[i + 2] * sz + tz,
            src[i + 3],
            src[i + 4],
            src[i + 5],
            src[i + 6],
            src[i + 7]
        );
    }
}

function createPatternTexture(unit, kind) {
    let texCanvas = document.createElement("canvas");
    texCanvas.width = 128;
    texCanvas.height = 128;
    let ctx = texCanvas.getContext("2d");

    if (kind == 0) {
        ctx.fillStyle = "#7b6a58";
        ctx.fillRect(0, 0, 128, 128);
        ctx.strokeStyle = "#332a22";
        ctx.lineWidth = 4;
        for (let y = 0; y < 128; y += 32) {
            for (let x = (y / 32) % 2 ? -32 : 0; x < 128; x += 64) {
                ctx.strokeRect(x, y, 64, 32);
            }
        }
    } else if (kind == 1) {
        ctx.fillStyle = "#3d8f50";
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = "#58b96b";
        for (let i = 0; i < 70; i++) ctx.fillRect(Math.random() * 128, Math.random() * 128, 8, 8);
    } else if (kind == 2) {
        ctx.fillStyle = "#4f4f55";
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = "#707077";
        for (let i = 0; i < 60; i++) ctx.fillRect(Math.random() * 128, Math.random() * 128, 10, 10);
    } else {
        let sky = ctx.createLinearGradient(0, 0, 0, 128);
        sky.addColorStop(0, "#68aaf3");
        sky.addColorStop(1, "#d8efff");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.beginPath();
        ctx.arc(36, 35, 15, 0, Math.PI * 2);
        ctx.arc(54, 32, 20, 0, Math.PI * 2);
        ctx.arc(75, 39, 14, 0, Math.PI * 2);
        ctx.fill();
    }

    let texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texCanvas);
    gl.generateMipmap(gl.TEXTURE_2D);
}

function loadImageTexture(unit, src, done) {
    let texture = gl.createTexture();
    let img = new Image();
    img.onload = function() {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        done();
    };
    img.onerror = done;
    img.src = src;
}

function initTextures(done) {
    createPatternTexture(1, 1);
    createPatternTexture(2, 2);
    createPatternTexture(3, 3);
    gl.uniform1i(gl.getUniformLocation(gl.program, "u_Sampler0"), 0);
    gl.uniform1i(gl.getUniformLocation(gl.program, "u_Sampler1"), 1);
    gl.uniform1i(gl.getUniformLocation(gl.program, "u_Sampler2"), 2);
    gl.uniform1i(gl.getUniformLocation(gl.program, "u_Sampler3"), 3);
    loadImageTexture(0, "textures/block.jpg", done);
}

function generateMap() {
    map = [];
    textureMap = [];
    for (let z = 0; z < 32; z++) {
        let row = [];
        let textureRow = [];
        for (let x = 0; x < 32; x++) {
            let border = x == 0 || z == 0 || x == 31 || z == 31;
            let maze = (x % 8 == 0 && z > 4 && z < 27) || (z % 10 == 0 && x > 6 && x < 25);
            let opening = (x == 8 && z > 8 && z < 16) || (z == 10 && x > 12 && x < 20) || (x == 24 && z > 17);
            let h = border ? 4 : (maze && !opening ? 1 + ((x + z) % 4) : 0);
            row.push(h);
            let stackTextures = [];
            for (let y = 0; y < h; y++) {
                stackTextures.push(((x + z + y) % 5 == 0) ? 2 : 0);
            }
            textureRow.push(stackTextures);
        }
        map.push(row);
        textureMap.push(textureRow);
    }
}

function rebuildWorld() {
    shapes = [];
    walls = [];

    shapes.push(makeObject(0, 0, 0, 80, 80, 80, 3, 0.35, [0.35, 0.63, 0.95, 1]));
    addTerrain();

    let wallBatches = {
        0: [],
        2: []
    };
    for (let z = 0; z < 32; z++) {
        for (let x = 0; x < 32; x++) {
            let height = map[z][x];
            for (let y = 0; y < height; y++) {
                let tex = textureMap[z][x][y] == undefined ? 0 : textureMap[z][x][y];
                appendTransformedCube(wallBatches[tex], x - 16 + 0.5, y + 0.5, z - 16 + 0.5, 0.5, 0.5, 0.5);
            }
        }
    }
    if (wallBatches[0].length > 0) shapes.push(makeMesh(wallBatches[0], 0, 1.0, [0.7, 0.65, 0.58, 1]));
    if (wallBatches[2].length > 0) shapes.push(makeMesh(wallBatches[2], 2, 1.0, [0.58, 0.58, 0.62, 1]));

    addAnimal(10, 0, -9);
    addGoal(goalX, 0, goalZ);
}

function addTerrain() {
    let vertices = [];
    for (let z = 0; z < 32; z++) {
        for (let x = 0; x < 32; x++) {
            let x0 = x - 16;
            let x1 = x0 + 1;
            let z0 = z - 16;
            let z1 = z0 + 1;
            let h00 = -0.12 + Math.sin(x * 0.55) * Math.cos(z * 0.35) * 0.08;
            let h10 = -0.12 + Math.sin((x + 1) * 0.55) * Math.cos(z * 0.35) * 0.08;
            let h01 = -0.12 + Math.sin(x * 0.55) * Math.cos((z + 1) * 0.35) * 0.08;
            let h11 = -0.12 + Math.sin((x + 1) * 0.55) * Math.cos((z + 1) * 0.35) * 0.08;
            vertices.push(
                x0, h00, z0, 0.25, 0.75, 0.25, x / 4, z / 4,
                x1, h10, z0, 0.35, 0.85, 0.35, (x + 1) / 4, z / 4,
                x0, h01, z1, 0.28, 0.78, 0.28, x / 4, (z + 1) / 4,
                x1, h10, z0, 0.35, 0.85, 0.35, (x + 1) / 4, z / 4,
                x1, h11, z1, 0.26, 0.72, 0.26, (x + 1) / 4, (z + 1) / 4,
                x0, h01, z1, 0.28, 0.78, 0.28, x / 4, (z + 1) / 4
            );
        }
    }
    shapes.push(makeMesh(vertices, 1, 1.0, [0.35, 0.72, 0.34, 1]));
}

function addAnimal(x, y, z) {
    shapes.push(makeObject(x, y + 0.45, z, 0.45, 0.35, 0.65, -1, 0.0, [0.95, 0.72, 0.42, 1]));
    shapes.push(makeObject(x, y + 0.95, z - 0.55, 0.32, 0.32, 0.32, -1, 0.0, [0.95, 0.72, 0.42, 1]));
    shapes.push(makeObject(x - 0.35, y + 1.25, z - 0.62, 0.12, 0.2, 0.12, -1, 0.0, [0.75, 0.45, 0.28, 1]));
    shapes.push(makeObject(x + 0.35, y + 1.25, z - 0.62, 0.12, 0.2, 0.12, -1, 0.0, [0.75, 0.45, 0.28, 1]));
    for (let lx of [-0.28, 0.28]) {
        for (let lz of [-0.35, 0.35]) shapes.push(makeObject(x + lx, y - 0.05, z + lz, 0.12, 0.35, 0.12, -1, 0.0, [0.55, 0.33, 0.21, 1]));
    }
}

function addGoal(x, y, z) {
    shapes.push(makeObject(x, y + 0.55, z, 0.35, 0.35, 0.35, -1, 0.0, [1.0, 0.88, 0.2, 1]));
    shapes.push(makeObject(x, y + 1.05, z, 0.18, 0.18, 0.18, -1, 0.0, [1.0, 0.95, 0.55, 1]));
}

function draw(geometry) {
    if (geometry.isMesh) {
        gl.bindBuffer(gl.ARRAY_BUFFER, geometry.buffer);
        bindAttributes();
        gl.uniformMatrix4fv(u_ModelMatrix, false, identityMatrix.elements);
        gl.uniform4fv(u_BaseColor, new Float32Array(geometry.baseColor || [1, 1, 1, 1]));
        gl.uniform1f(u_TexColorWeight, geometry.texWeight == undefined ? 1.0 : geometry.texWeight);
        gl.uniform1i(u_TextureChoice, geometry.textureChoice == undefined ? 0 : geometry.textureChoice);
        gl.drawArrays(gl.TRIANGLES, 0, geometry.vertexCount);
        return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    bindAttributes();
    geometry.modelMatrix.setIdentity();
    geometry.modelMatrix.multiply(geometry.translationMatrix);
    geometry.modelMatrix.multiply(geometry.rotationMatrix);
    geometry.modelMatrix.multiply(geometry.scaleMatrix);
    gl.uniformMatrix4fv(u_ModelMatrix, false, geometry.modelMatrix.elements);
    gl.uniform4fv(u_BaseColor, new Float32Array(geometry.baseColor || [1, 1, 1, 1]));
    gl.uniform1f(u_TexColorWeight, geometry.texWeight == undefined ? 1.0 : geometry.texWeight);
    gl.uniform1i(u_TextureChoice, geometry.textureChoice == undefined ? 0 : geometry.textureChoice);

    gl.drawArrays(gl.TRIANGLES, 0, cubeVertexCount);
}

function animate(now) {
    let dt = Math.min((now - lastTime) / 16.67, 3) || 1;
    lastTime = now;

    if (keys["KeyW"] || keys["ArrowUp"]) camera.moveForward(0.16 * dt);
    if (keys["KeyS"] || keys["ArrowDown"]) camera.moveBackwards(0.16 * dt);
    if (keys["KeyA"] || keys["ArrowLeft"]) camera.moveLeft(0.16 * dt);
    if (keys["KeyD"] || keys["ArrowRight"]) camera.moveRight(0.16 * dt);
    if (keys["KeyQ"]) camera.panLeft(1.4 * dt);
    if (keys["KeyE"]) camera.panRight(1.4 * dt);
    
    checkGoal();

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(u_viewMatrix, false, camera.viewMatrix.elements);
    gl.uniformMatrix4fv(u_projectionMatrix, false, camera.projectionMatrix.elements);

    for (let s of shapes) draw(s);
    requestAnimationFrame(animate);
}

function checkGoal() {
    if (gameWon) return;

    let dx = camera.eye.elements[0] - goalX;
    let dz = camera.eye.elements[2] - goalZ;
    let dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 1.6) {
        gameWon = true;

        if (gameStatus) {
            gameStatus.innerHTML = "You found the gold relic! Game complete. You can still explore, add blocks with F, or remove blocks with R.";
        }
    }
}

function getTargetCell() {
    let f = camera.getForward();
    let tx = camera.eye.elements[0] + f.elements[0] * 2.0;
    let tz = camera.eye.elements[2] + f.elements[2] * 2.0;
    let x = Math.floor(tx + 16);
    let z = Math.floor(tz + 16);
    if (x < 1 || x > 30 || z < 1 || z > 30) return null;
    return { x: x, z: z };
}

function addBlock() {
    let cell = getTargetCell();
    if (!cell) return;
    if (map[cell.z][cell.x] >= 4) return;
    map[cell.z][cell.x] += 1;
    textureMap[cell.z][cell.x].push(0);
    rebuildWorld();
}

function deleteBlock() {
    let cell = getTargetCell();
    if (!cell) return;
    if (map[cell.z][cell.x] <= 0) return;
    map[cell.z][cell.x] -= 1;
    textureMap[cell.z][cell.x].pop();
    rebuildWorld();
}

function keydown(ev) {
    keys[ev.code] = true;
    if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(ev.code) >= 0) {
        ev.preventDefault();
    }
    if (ev.code == "KeyF") addBlock();
    if (ev.code == "KeyR") deleteBlock();
}

function keyup(ev) {
    keys[ev.code] = false;
}

function mousemove(ev) {
    if (lastMouseX == null) {
        lastMouseX = ev.clientX;
        return;
    }
    let dx = ev.clientX - lastMouseX;
    lastMouseX = ev.clientX;
    camera.lookBy(dx, 0);
}

function main() {
    canvas = document.getElementById("webgl");
    gl = getWebGLContext(canvas);
    if (!gl) {
        console.log("Failed to get WebGL context.");
        return;
    }

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.52, 0.78, 0.98, 1.0);

    if (!initShaders(gl, VERTEX_SHADER, FRAGMENT_SHADER)) {
        console.log("Failed to compile and load shaders.");
        return;
    }

    cubeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);

    floatSize = Float32Array.BYTES_PER_ELEMENT;
    a_Position = gl.getAttribLocation(gl.program, "a_Position");
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 8 * floatSize, 0);
    gl.enableVertexAttribArray(a_Position);

    a_Color = gl.getAttribLocation(gl.program, "a_Color");
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, 8 * floatSize, 3 * floatSize);
    gl.enableVertexAttribArray(a_Color);

    a_UV = gl.getAttribLocation(gl.program, "a_UV");
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 8 * floatSize, 6 * floatSize);
    gl.enableVertexAttribArray(a_UV);

    cubeVertices = getTexturedCubeVertices();
    cubeVertexCount = cubeVertices.length / 8;
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);
    identityMatrix = new Matrix4();

    u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
    u_viewMatrix = gl.getUniformLocation(gl.program, "u_viewMatrix");
    u_projectionMatrix = gl.getUniformLocation(gl.program, "u_projectionMatrix");
    u_BaseColor = gl.getUniformLocation(gl.program, "u_BaseColor");
    u_TexColorWeight = gl.getUniformLocation(gl.program, "u_TexColorWeight");
    u_TextureChoice = gl.getUniformLocation(gl.program, "u_TextureChoice");

    camera = new Camera(canvas.width / canvas.height, 0.1, 1000);
    gameStatus = document.getElementById("gameStatus");
    generateMap();
    rebuildWorld();

    document.onkeydown = keydown;
    document.onkeyup = keyup;
    canvas.onmousemove = mousemove;
    initTextures(function() {
        requestAnimationFrame(animate);
    });
}
