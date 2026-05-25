// ASG4 Lighting - Phong lighting, moving point light, spotlight, normal view, world, goat, and OBJ model.

let VSHADER = `
    precision mediump float;

    attribute vec3 a_Position;
    attribute vec3 a_Normal;

    uniform mat4 u_ModelMatrix;
    uniform mat4 u_ViewMatrix;
    uniform mat4 u_ProjMatrix;
    uniform mat4 u_NormalMatrix;

    varying vec3 v_Normal;
    varying vec3 v_WorldPos;

    void main() {
        vec4 worldPosition = u_ModelMatrix * vec4(a_Position, 1.0);
        v_WorldPos = worldPosition.xyz;
        v_Normal = normalize((u_NormalMatrix * vec4(a_Normal, 0.0)).xyz);
        gl_Position = u_ProjMatrix * u_ViewMatrix * worldPosition;
    }
`;

let FSHADER = `
    precision mediump float;

    uniform vec3 u_Color;
    uniform vec3 u_LightColor;
    uniform vec3 u_LightPos;
    uniform vec3 u_EyePos;

    uniform bool u_LightingOn;
    uniform bool u_NormalOn;
    uniform bool u_PointLightOn;
    uniform bool u_SpotLightOn;
    uniform bool u_ForceUnlit;
    uniform float u_SpecularStrength;

    uniform vec3 u_SpotLightPos;
    uniform vec3 u_SpotLightDir;
    uniform float u_SpotCutoff;

    varying vec3 v_Normal;
    varying vec3 v_WorldPos;

    vec3 phongPoint(vec3 lightPos, vec3 normal, vec3 viewDir, float strength) {
        vec3 toLight = lightPos - v_WorldPos;
        float dist = length(toLight);
        vec3 lightDir = normalize(toLight);

        float nDotL = max(dot(normal, lightDir), 0.0);
        float attenuation = 1.0 / (1.0 + 0.035 * dist + 0.020 * dist * dist);

        vec3 diffuse = nDotL * u_Color * u_LightColor;
        vec3 reflectDir = reflect(-lightDir, normal);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
        vec3 specular = u_SpecularStrength * spec * u_LightColor;

        return (diffuse + specular) * attenuation * strength;
    }

    void main() {
        vec3 normal = normalize(v_Normal);

        if (u_NormalOn) {
            gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
            return;
        }

        if (u_ForceUnlit || !u_LightingOn) {
            gl_FragColor = vec4(u_Color, 1.0);
            return;
        }

        vec3 viewDir = normalize(u_EyePos - v_WorldPos);
        vec3 finalColor = 0.18 * u_Color;

        if (u_PointLightOn) {
            finalColor += phongPoint(u_LightPos, normal, viewDir, 1.35);
        }

        if (u_SpotLightOn) {
            vec3 fromSpotToFrag = normalize(v_WorldPos - u_SpotLightPos);
            float spotValue = dot(fromSpotToFrag, normalize(u_SpotLightDir));
            if (spotValue > u_SpotCutoff) {
                float softEdge = smoothstep(u_SpotCutoff, u_SpotCutoff + 0.08, spotValue);
                finalColor += phongPoint(u_SpotLightPos, normal, viewDir, 0.65 * softEdge);
            }
        }

        gl_FragColor = vec4(min(finalColor, vec3(1.0)), 1.0);
    }
`;

let canvas;
let gl;
let camera;
let vertexBuffer;
let normalBuffer;
let indexBuffer;

let modelMatrix = new Matrix4();
let normalMatrix = new Matrix4();
let models = [];

let u_ModelMatrix;
let u_ViewMatrix;
let u_ProjMatrix;
let u_NormalMatrix;
let u_Color;
let u_LightColor;
let u_LightPos;
let u_EyePos;
let u_LightingOn;
let u_NormalOn;
let u_PointLightOn;
let u_SpotLightOn;
let u_ForceUnlit;
let u_SpecularStrength;
let u_SpotLightPos;
let u_SpotLightDir;
let u_SpotCutoff;

let lightingOn = true;
let normalOn = false;
let pointLightOn = true;
let spotLightOn = false;
let lightColor = [1.0, 1.0, 1.0];

// The sliders control the center of the orbit.
// The point light moves in a true horizontal XZ circle around the sphere.
// Keep Y fixed so the marker does not draw a vertical path on screen.
let lightCenter = new Vector3([0.0, 2.60, 0.0]);
let lightPos = new Vector3([3.4, 2.60, 0.0]);
let lightOrbitRadius = 3.4;
let lightSpeed = 2.75;
let pointLightMarker;

let spotLightPos = new Vector3([0.0, 3.6, 0.0]);
let spotLightDir = new Vector3([0.0, -1.0, 0.0]);
let spotLightMarker;

let g_startTime = performance.now();
let cameraOrbitAngle = 0;

function initBuffer(attributeName, n) {
    let buffer = gl.createBuffer();
    if (!buffer) {
        console.log("Failed to create buffer.");
        return null;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    let attribute = gl.getAttribLocation(gl.program, attributeName);
    gl.vertexAttribPointer(attribute, n, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attribute);
    return buffer;
}

function addModel(color, shapeType) {
    let model = null;
    if (shapeType === "cube") model = new Cube(color);
    if (shapeType === "sphere") model = new Sphere(color);
    if (shapeType === "wedge") model = new Wedge(color);

    if (model) models.push(model);
    return model;
}

function drawModel(model) {
    if (!model || model.loaded === false) return;

    modelMatrix.setIdentity();
    modelMatrix.translate(model.translate[0], model.translate[1], model.translate[2]);
    modelMatrix.rotate(model.rotate[0], 1, 0, 0);
    modelMatrix.rotate(model.rotate[1], 0, 1, 0);
    modelMatrix.rotate(model.rotate[2], 0, 0, 1);
    modelMatrix.scale(model.scale[0], model.scale[1], model.scale[2]);

    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

    gl.uniform3f(u_Color, model.color[0], model.color[1], model.color[2]);
    gl.uniform1i(u_ForceUnlit, model.forceUnlit ? 1 : 0);
    gl.uniform1f(u_SpecularStrength, model.specularStrength);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, model.normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indices, gl.STATIC_DRAW);

    gl.drawElements(gl.TRIANGLES, model.indices.length, gl.UNSIGNED_SHORT, 0);
}

function makeCube(color, tx, ty, tz, sx, sy, sz, rx, ry, rz) {
    let c = addModel(color, "cube");
    c.setTranslate(tx, ty, tz);
    c.setScale(sx, sy, sz);
    c.setRotate(rx || 0, ry || 0, rz || 0);
    return c;
}

function makeSphere(color, tx, ty, tz, sx, sy, sz) {
    let s = addModel(color, "sphere");
    s.setTranslate(tx, ty, tz);
    s.setScale(sx, sy, sz);
    return s;
}

function makeWedge(color, tx, ty, tz, sx, sy, sz, rx, ry, rz) {
    let w = addModel(color, "wedge");
    w.setTranslate(tx, ty, tz);
    w.setScale(sx, sy, sz);
    w.setRotate(rx || 0, ry || 0, rz || 0);
    return w;
}

function buildWorld() {
    let ground = makeCube([0.28, 0.55, 0.24], 0, -0.12, 0, 9.0, 0.12, 9.0);
    ground.specularStrength = 0.02;

    let backWall = makeCube([0.50, 0.35, 0.23], 0, 2.0, -9.0, 9.0, 2.0, 0.12);
    backWall.specularStrength = 0.02;

    let leftWall = makeCube([0.46, 0.31, 0.21], -9.0, 2.0, 0, 0.12, 2.0, 9.0);
    leftWall.specularStrength = 0.02;

    let blocks = [
        [-4.9, 0.45, 3.2], [-3.7, 0.45, 3.2], [-2.5, 0.45, 3.2],
        [3.4, 0.45, -1.9], [4.4, 0.45, -1.9], [4.4, 1.35, -1.9]
    ];
    for (let p of blocks) {
        makeCube([0.48, 0.50, 0.55], p[0], p[1], p[2], 0.48, 0.48, 0.48);
    }
}

function buildGoat() {
    let ox = -4.0;
    let oy = 0.45;
    let oz = 0.8;

    makeCube([0.86, 0.86, 0.82], ox, oy + 0.45, oz, 0.70, 0.32, 0.30);
    makeCube([0.78, 0.78, 0.74], ox + 0.90, oy + 0.65, oz, 0.30, 0.28, 0.25);

    makeCube([0.06, 0.06, 0.06], ox + 1.20, oy + 0.70, oz + 0.16, 0.035, 0.035, 0.035);
    makeCube([0.06, 0.06, 0.06], ox + 1.20, oy + 0.70, oz - 0.16, 0.035, 0.035, 0.035);

    makeWedge([0.76, 0.76, 0.72], ox + 0.78, oy + 0.83, oz + 0.22, 0.08, 0.16, 0.08, -45, 0, 0);
    makeWedge([0.76, 0.76, 0.72], ox + 0.78, oy + 0.83, oz - 0.22, 0.08, 0.16, 0.08, 45, 0, 0);
    makeWedge([0.55, 0.36, 0.15], ox + 0.82, oy + 1.03, oz + 0.08, 0.045, 0.20, 0.045, 0, 0, -18);
    makeWedge([0.55, 0.36, 0.15], ox + 0.82, oy + 1.03, oz - 0.08, 0.045, 0.20, 0.045, 0, 0, -18);
    makeWedge([0.60, 0.42, 0.22], ox + 1.18, oy + 0.47, oz, 0.06, 0.16, 0.06, 0, 0, -18);
    makeWedge([0.90, 0.90, 0.86], ox - 0.72, oy + 0.62, oz, 0.08, 0.22, 0.08, 0, 0, 55);

    let legs = [
        [ox - 0.42, oz + 0.18], [ox + 0.42, oz + 0.18],
        [ox - 0.42, oz - 0.18], [ox + 0.42, oz - 0.18]
    ];
    for (let p of legs) {
        makeCube([0.70, 0.70, 0.66], p[0], oy + 0.08, p[1], 0.10, 0.34, 0.10);
        makeCube([0.04, 0.04, 0.04], p[0] + 0.03, oy - 0.30, p[1], 0.13, 0.06, 0.12);
    }
}

function buildScene() {
    buildWorld();
    buildGoat();

    let redSphere = makeSphere([0.86, 0.10, 0.10], 0.0, 1.0, 0.0, 1.0, 1.0, 1.0);
    redSphere.specularStrength = 0.50;

    let blueSphere = makeSphere([0.12, 0.28, 0.88], 2.9, 0.65, -1.1, 0.55, 0.55, 0.55);
    blueSphere.specularStrength = 0.35;
    makeCube([0.62, 0.62, 0.66], 2.8, 0.55, 0.75, 0.45, 0.45, 0.45);

    let tree = new ObjModel([0.18, 0.62, 0.24]);
    tree.setTranslate(4.3, 0.0, 2.5);
    tree.setScale(0.95, 0.95, 0.95);
    tree.load("models/lowpoly_tree.obj").then(function() {
        models.push(tree);
    });

    pointLightMarker = addModel([1.0, 1.0, 1.0], "sphere");
    pointLightMarker.setScale(0.18, 0.18, 0.18);
    pointLightMarker.forceUnlit = true;

    spotLightMarker = addModel([1.0, 0.92, 0.08], "sphere");
    spotLightMarker.setScale(0.16, 0.16, 0.16);
    spotLightMarker.forceUnlit = true;
}

function updateLightPosition() {
    let seconds = (performance.now() - g_startTime) / 1000.0;
    let angle = seconds * lightSpeed;

    // Horizontal orbit only: X and Z change, Y stays fixed.
    // This makes the light clearly circle around the red sphere instead of moving vertically.
    let x = lightCenter.elements[0] + Math.cos(angle) * lightOrbitRadius;
    let y = lightCenter.elements[1];
    let z = lightCenter.elements[2] + Math.sin(angle) * lightOrbitRadius;

    lightPos = new Vector3([x, y, z]);
    pointLightMarker.setTranslate(x, y, z);

    if (spotLightOn) {
        spotLightMarker.setTranslate(spotLightPos.elements[0], spotLightPos.elements[1], spotLightPos.elements[2]);
    } else {
        spotLightMarker.setTranslate(200.0, 200.0, 200.0);
    }
}

function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    updateLightPosition();

    gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
    gl.uniformMatrix4fv(u_ProjMatrix, false, camera.projMatrix.elements);
    gl.uniform3fv(u_EyePos, camera.eye.elements);

    gl.uniform3fv(u_LightPos, lightPos.elements);
    gl.uniform3f(u_LightColor, lightColor[0], lightColor[1], lightColor[2]);

    gl.uniform1i(u_LightingOn, lightingOn ? 1 : 0);
    gl.uniform1i(u_NormalOn, normalOn ? 1 : 0);
    gl.uniform1i(u_PointLightOn, pointLightOn ? 1 : 0);
    gl.uniform1i(u_SpotLightOn, spotLightOn ? 1 : 0);

    gl.uniform3fv(u_SpotLightPos, spotLightPos.elements);
    gl.uniform3fv(u_SpotLightDir, spotLightDir.elements);
    gl.uniform1f(u_SpotCutoff, Math.cos(20.0 * Math.PI / 180.0));

    for (let model of models) {
        drawModel(model);
    }

    requestAnimationFrame(draw);
}

function onZoomInput(value) {
    camera.zoom(1.0 + value / 14.0);
}

function onCameraAngleInput(value) {
    cameraOrbitAngle = Number(value);
    let rad = cameraOrbitAngle * Math.PI / 180.0;
    let radius = 10.0;
    camera.lookAt(Math.sin(rad) * radius, 3.0, Math.cos(rad) * radius, 0.0, 1.0, 0.0);
}

function onLightPosInput() {
    let x = parseFloat(document.getElementById("lightXSlider").value);
    let y = parseFloat(document.getElementById("lightYSlider").value);
    let z = parseFloat(document.getElementById("lightZSlider").value);
    lightCenter = new Vector3([x, y, z]);
}

function onLightColorInput() {
    lightColor[0] = parseFloat(document.getElementById("lightRSlider").value);
    lightColor[1] = parseFloat(document.getElementById("lightGSlider").value);
    lightColor[2] = parseFloat(document.getElementById("lightBSlider").value);
}

function onLightSpeedInput(value) {
    lightSpeed = parseFloat(value);
}

function onLightRadiusInput(value) {
    lightOrbitRadius = parseFloat(value);
}

function toggleLighting() {
    lightingOn = !lightingOn;
    document.getElementById("lightingBtn").innerText = "Lighting: " + (lightingOn ? "ON" : "OFF");
}

function toggleNormals() {
    normalOn = !normalOn;
    document.getElementById("normalBtn").innerText = "Normal Visualization: " + (normalOn ? "ON" : "OFF");
}

function togglePointLight() {
    pointLightOn = !pointLightOn;
    document.getElementById("pointLightBtn").innerText = "Point Light: " + (pointLightOn ? "ON" : "OFF");
}

function toggleSpotLight() {
    spotLightOn = !spotLightOn;
    document.getElementById("spotLightBtn").innerText = "Spot Light: " + (spotLightOn ? "ON" : "OFF");
}

window.addEventListener("keydown", function(event) {
    let speed = 0.45;

    switch (event.key) {
        case "w":
        case "W":
            camera.moveForward(speed);
            break;
        case "s":
        case "S":
            camera.moveForward(-speed);
            break;
        case "a":
        case "A":
            camera.pan(5);
            break;
        case "d":
        case "D":
            camera.pan(-5);
            break;
        case "q":
        case "Q":
            camera.moveSideways(-speed);
            break;
        case "e":
        case "E":
            camera.moveSideways(speed);
            break;
    }
});

function main() {
    canvas = document.getElementById("canvas");
    gl = canvas.getContext("webgl");
    if (!gl) {
        console.log("Failed to get WebGL context.");
        return;
    }

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.02, 0.02, 0.03, 1.0);

    if (!initShaders(gl, VSHADER, FSHADER)) {
        console.log("Failed to initialize shaders.");
        return;
    }

    u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
    u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
    u_ProjMatrix = gl.getUniformLocation(gl.program, "u_ProjMatrix");
    u_NormalMatrix = gl.getUniformLocation(gl.program, "u_NormalMatrix");
    u_Color = gl.getUniformLocation(gl.program, "u_Color");
    u_LightColor = gl.getUniformLocation(gl.program, "u_LightColor");
    u_LightPos = gl.getUniformLocation(gl.program, "u_LightPos");
    u_EyePos = gl.getUniformLocation(gl.program, "u_EyePos");
    u_LightingOn = gl.getUniformLocation(gl.program, "u_LightingOn");
    u_NormalOn = gl.getUniformLocation(gl.program, "u_NormalOn");
    u_PointLightOn = gl.getUniformLocation(gl.program, "u_PointLightOn");
    u_SpotLightOn = gl.getUniformLocation(gl.program, "u_SpotLightOn");
    u_ForceUnlit = gl.getUniformLocation(gl.program, "u_ForceUnlit");
    u_SpecularStrength = gl.getUniformLocation(gl.program, "u_SpecularStrength");
    u_SpotLightPos = gl.getUniformLocation(gl.program, "u_SpotLightPos");
    u_SpotLightDir = gl.getUniformLocation(gl.program, "u_SpotLightDir");
    u_SpotCutoff = gl.getUniformLocation(gl.program, "u_SpotCutoff");

    vertexBuffer = initBuffer("a_Position", 3);
    normalBuffer = initBuffer("a_Normal", 3);
    indexBuffer = gl.createBuffer();

    camera = new Camera();
    buildScene();
    draw();
}
