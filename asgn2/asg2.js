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
    // We use a uniform for color now instead of a_Color to color whole blocks easier
    uniform mat4 u_ModelMatrix;
    uniform mat4 u_GlobalRotation; // Added for the assignment rubric requirement

    void main() {
        // Multiply in correct order for global rotation
        gl_Position = u_GlobalRotation * u_ModelMatrix * vec4(a_Position, 1.0); 
    }
`;

// Input: a fragment (a grid of pixels) comes from the rasterizer.
// It doesn't have vertices as input
// Ouput: a color goes to HTML canvas.
var FRAGMENT_SHADER = `
    precision mediump float;
    uniform vec4 u_FragColor;

    void main() {
        gl_FragColor = u_FragColor;
    }
`;

// use HTML sliders to set this variable
let GlobalRotation = 0;
// mouse control
let GlobalRotationX = 0; 
let GlobalRotationY = 0; 

let HeadAngle = 0;
let TailAngle = 0;
let UpperLegAngle = 0;
let LowerLegAngle = 0;
let HoofAngle = 0;

// Global variables
let gl;
let a_Position;
let u_ModelMatrix;
let u_GlobalRotation;
let u_FragColor;

// Buffers
let g_cubeBuffer;
let g_wedgeBuffer;

// Animation
let g_animating = false;
let g_time = 0;
let lastTime = performance.now();
let fpsCounter = 0;
let lastFpsTime = performance.now();

// Shift click
let isPoking = false;
let pokeTime = 0;

// Helper function to create cubes, I use this to replace the geometry file
function getCubeVertices() {
    let v = [];
    let p = [
        [1,1,1], [-1,1,1], [-1,-1,1], [1,-1,1], 
        [1,1,-1], [-1,1,-1], [-1,-1,-1], [1,-1,-1] 
    ];
    let faces = [
        0,1,2, 0,2,3, // front
        4,5,6, 4,6,7, // back
        1,5,6, 1,6,2, // left
        0,4,7, 0,7,3, // right
        0,1,5, 0,5,4, // top
        3,2,6, 3,6,7  // bottom
    ];
    for (let i of faces) v.push(...p[i]);
    return new Float32Array(v);
}

// Helper for ears and horns
function getWedgeVertices() {
    let v = [];
    let p = [
        [1,-1,1], [-1,-1,1], [-1,-1,-1], [1,-1,-1], 
        [0,1,0] // top point
    ];
    let faces = [
        0,1,2, 0,2,3, // bottom
        0,1,4,        // front
        1,2,4,        // left
        2,3,4,        // back
        3,0,4         // right
    ];
    for (let i of faces) v.push(...p[i]);
    return new Float32Array(v);
}


function main() {
    let canvas = document.getElementById("webgl");

    // Retrieve WebGl rendering context
    gl = getWebGLContext(canvas);
    if(!gl) {
        console.log("Failed to get WebGL context.")
        return -1;
    }

    gl.enable(gl.DEPTH_TEST);

    // A function to do all the drawing task outside of main
    gl.clearColor(0.2, 0.6, 0.8, 1.0); // changed to a nice sky blue

    // Actually clear screen
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Compile the vertex
    if(!initShaders(gl, VERTEX_SHADER, FRAGMENT_SHADER)) {
        console.log("Failed to compile and load shaders.")
        return -1;
    }

    // Specify how to read points from the array
    // Create a WebGL buffer (an array in GPU memory), which is similar
    // to a javascript Array.
    g_cubeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, getCubeVertices(), gl.STATIC_DRAW);

    g_wedgeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, g_wedgeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, getWedgeVertices(), gl.STATIC_DRAW);

    // To map this ARRAY_BUFFER to our attribute a_Position
    // in the vertex shader.
    a_Position = gl.getAttribLocation(gl.program, "a_Position");
    u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
    u_GlobalRotation = gl.getUniformLocation(gl.program, "u_GlobalRotation");
    u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");

    addActionsForHtmlUI(canvas);

    requestAnimationFrame(tick);
}

function addActionsForHtmlUI(canvas) {
    document.getElementById('animOn').onclick = function() { g_animating = true; };
    document.getElementById('animOff').onclick = function() { g_animating = false; };

    // Bind all joints to UI sliders to satisfy "Slider control of all joints in the animal"
    document.getElementById('angleSlide').addEventListener('input', function() { GlobalRotation = Number(this.value); });
    
    document.getElementById('headSlide').addEventListener('input', function() { HeadAngle = Number(this.value); });
    document.getElementById('tailSlide').addEventListener('input', function() { TailAngle = Number(this.value); });
    
    document.getElementById('upperLegSlide').addEventListener('input', function() { UpperLegAngle = Number(this.value); });
    document.getElementById('lowerLegSlide').addEventListener('input', function() { LowerLegAngle = Number(this.value); });
    document.getElementById('hoofSlide').addEventListener('input', function() { HoofAngle = Number(this.value); });

    // Mouse control
    let dragging = false;
    let lastX = -1;
    let lastY = -1;

    canvas.onmousedown = function(ev) {
        if (ev.shiftKey) { 
            isPoking = true; 
            pokeTime = 0; 
            return; 
        }
        dragging = true;
        lastX = ev.clientX; 
        lastY = ev.clientY;
    };

    canvas.onmousemove = function(ev) {
        if (dragging) {
            let dx = ev.clientX - lastX;
            let dy = ev.clientY - lastY;
            GlobalRotationX += dy * 0.5;
            GlobalRotationY += dx * 0.5;
            lastX = ev.clientX; 
            lastY = ev.clientY;
        }
    };

    canvas.onmouseup = function() { dragging = false; };
    canvas.onmouseleave = function() { dragging = false; };
}

// Tick function for amiation
function tick() {
    let now = performance.now();
    let dt = (now - lastTime) / 1000.0;
    lastTime = now;

    if (g_animating) { 
        g_time += dt; 
    }
    
    if (isPoking) {
        pokeTime += dt;
        if (pokeTime > 1.0) isPoking = false; // poke lasts 1 sec
    }

    // FPS extra credit
    fpsCounter++;
    if (now - lastFpsTime >= 1000) {
        document.getElementById('fpsIndicator').innerText = "FPS: " + fpsCounter;
        fpsCounter = 0;
        lastFpsTime = now;
    }

    renderScene();
    requestAnimationFrame(tick);
}

// geometry drawer
function drawShape(buffer, vertexCount, matrix, color) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    
    gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);
    gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
    
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
}

function renderScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let colorBody = [0.85, 0.85, 0.85, 1.0];
    let colorHead = [0.75, 0.75, 0.75, 1.0];
    let colorEye = [0.1, 0.1, 0.1, 1.0];
    let colorHorn = [0.6, 0.4, 0.2, 1.0];
    let colorTail = [0.9, 0.9, 0.9, 1.0];

    let globalRotMat = new Matrix4();
    globalRotMat.multiply(new Matrix4().setRotate(GlobalRotation, 0, 1, 0)); 
    globalRotMat.multiply(new Matrix4().setRotate(GlobalRotationX, 1, 0, 0)); 
    globalRotMat.multiply(new Matrix4().setRotate(GlobalRotationY, 0, 1, 0)); 
    gl.uniformMatrix4fv(u_GlobalRotation, false, globalRotMat.elements);

    // Draw Body
    let bodyMat = new Matrix4();
    if (isPoking) {
        bodyMat.translate(0, Math.sin(pokeTime * Math.PI) * 0.4, 0);
        bodyMat.multiply(new Matrix4().setRotate(pokeTime * 360 * 2, 0, 1, 0));
    } else if (g_animating) {
        bodyMat.translate(0, Math.sin(g_time * 3) * 0.02, 0); // breathing animation
    }

    let bDrawMat = new Matrix4(bodyMat);
    bDrawMat.scale(0.3, 0.15, 0.12);
    drawShape(g_cubeBuffer, 36, bDrawMat, colorBody); 

    // Draw Head
    let headMat = new Matrix4(bodyMat);
    headMat.translate(0.35, 0.12, 0);
    if (g_animating) {
        headMat.multiply(new Matrix4().setRotate(Math.sin(g_time * 2) * 8, 0, 0, 1)); 
    } else {
        headMat.multiply(new Matrix4().setRotate(HeadAngle, 0, 0, 1)); // Linked to slider
    }
    
    let hDrawMat = new Matrix4(headMat);
    hDrawMat.scale(0.1, 0.1, 0.08);
    drawShape(g_cubeBuffer, 36, hDrawMat, colorHead); 

    // Draw Eyes
    let eyeLMat = new Matrix4(headMat);
    eyeLMat.translate(0.08, 0.02, 0.081); 
    eyeLMat.scale(0.015, 0.015, 0.015);
    drawShape(g_cubeBuffer, 36, eyeLMat, colorEye); 

    let eyeRMat = new Matrix4(headMat);
    eyeRMat.translate(0.08, 0.02, -0.081);
    eyeRMat.scale(0.015, 0.015, 0.015);
    drawShape(g_cubeBuffer, 36, eyeRMat, colorEye);

    // Draw Ears
    let earLMat = new Matrix4(headMat);
    earLMat.translate(0.0, 0.05, 0.08);
    earLMat.multiply(new Matrix4().setRotate(-120, 1, 0, 0)); 
    earLMat.scale(0.02, 0.08, 0.03); 
    drawShape(g_wedgeBuffer, 18, earLMat, colorHead);

    let earRMat = new Matrix4(headMat);
    earRMat.translate(0.0, 0.05, -0.08);
    earRMat.multiply(new Matrix4().setRotate(120, 1, 0, 0)); 
    earRMat.scale(0.02, 0.08, 0.03); 
    drawShape(g_wedgeBuffer, 18, earRMat, colorHead);

    // Draw Goat Beard
    let beardMat = new Matrix4(headMat);
    beardMat.translate(0.08, -0.1, 0); 
    beardMat.multiply(new Matrix4().setRotate(-20, 0, 0, 1)); 
    beardMat.scale(0.02, 0.06, 0.02); 
    drawShape(g_wedgeBuffer, 18, beardMat, colorHorn);

    // Draw Horns
    let hornLMat = new Matrix4(headMat);
    hornLMat.translate(0.0, 0.1, 0.05);
    hornLMat.multiply(new Matrix4().setRotate(-20, 0, 0, 1));
    hornLMat.scale(0.02, 0.12, 0.02);
    drawShape(g_wedgeBuffer, 18, hornLMat, colorHorn); 

    let hornRMat = new Matrix4(headMat);
    hornRMat.translate(0.0, 0.1, -0.05);
    hornRMat.multiply(new Matrix4().setRotate(-20, 0, 0, 1));
    hornRMat.scale(0.02, 0.12, 0.02);
    drawShape(g_wedgeBuffer, 18, hornRMat, colorHorn);

    // Draw Tail
    let tailMat = new Matrix4(bodyMat);
    tailMat.translate(-0.3, 0.1, 0);
    if (g_animating) {
        tailMat.multiply(new Matrix4().setRotate(Math.sin(g_time * 15) * 30, 0, 0, 1)); 
    } else {
        tailMat.multiply(new Matrix4().setRotate(TailAngle, 0, 0, 1)); // Linked to slider
    }
    tailMat.multiply(new Matrix4().setRotate(60, 0, 0, 1));
    tailMat.scale(0.03, 0.08, 0.03);
    drawShape(g_wedgeBuffer, 18, tailMat, colorTail);

    // All four legs
    let fL_u = g_animating ? Math.sin(g_time * 5) * 25 : UpperLegAngle;
    let fL_l = g_animating ? -Math.max(0, Math.sin(g_time * 5 + 0.5)) * 40 : LowerLegAngle;
    let fL_h = g_animating ? Math.max(0, Math.sin(g_time * 5 + 0.8)) * 30 : HoofAngle;
    drawLegChain(bodyMat, 0.22, -0.1, 0.12, fL_u, fL_l, fL_h);

    let fR_u = g_animating ? Math.sin(g_time * 5 + Math.PI) * 25 : UpperLegAngle;
    let fR_l = g_animating ? -Math.max(0, Math.sin(g_time * 5 + Math.PI + 0.5)) * 40 : LowerLegAngle;
    let fR_h = g_animating ? Math.max(0, Math.sin(g_time * 5 + Math.PI + 0.8)) * 30 : HoofAngle;
    drawLegChain(bodyMat, 0.22, -0.1, -0.12, fR_u, fR_l, fR_h);

    let bL_u = g_animating ? Math.sin(g_time * 5 + Math.PI) * 25 : UpperLegAngle;
    let bL_l = g_animating ? Math.max(0, Math.sin(g_time * 5 + Math.PI - 0.5)) * 40 : LowerLegAngle;
    let bL_h = g_animating ? Math.max(0, Math.sin(g_time * 5 + Math.PI + 0.8)) * 30 : HoofAngle;
    drawLegChain(bodyMat, -0.22, -0.1, 0.12, bL_u, bL_l, bL_h);

    let bR_u = g_animating ? Math.sin(g_time * 5) * 25 : UpperLegAngle;
    let bR_l = g_animating ? Math.max(0, Math.sin(g_time * 5 - 0.5)) * 40 : LowerLegAngle;
    let bR_h = g_animating ? Math.max(0, Math.sin(g_time * 5 + 0.8)) * 30 : HoofAngle;
    drawLegChain(bodyMat, -0.22, -0.1, -0.12, bR_u, bR_l, bR_h);
}


// Function to draw a full leg chain
function drawLegChain(parentMat, x, y, z, upperAngle, lowerAngle, hoofAngle) {
    let colorThigh = [0.8, 0.8, 0.8, 1.0];
    let colorCalf = [0.65, 0.65, 0.65, 1.0];
    let colorHoof = [0.0, 0.0, 0.0, 1.0]; 

    // Level 1: Thigh
    let thighMat = new Matrix4(parentMat);
    thighMat.translate(x, y, z);
    thighMat.multiply(new Matrix4().setRotate(upperAngle, 0, 0, 1)); 

    let tDraw = new Matrix4(thighMat);
    tDraw.translate(0, -0.1, 0); 
    tDraw.scale(0.04, 0.1, 0.04);
    drawShape(g_cubeBuffer, 36, tDraw, colorThigh);

    // Level 2: Calf
    let calfMat = new Matrix4(thighMat);
    calfMat.translate(0, -0.2, 0); 
    calfMat.multiply(new Matrix4().setRotate(lowerAngle, 0, 0, 1));

    let cDraw = new Matrix4(calfMat);
    cDraw.translate(0, -0.08, 0);
    cDraw.scale(0.03, 0.08, 0.03);
    drawShape(g_cubeBuffer, 36, cDraw, colorCalf);

    // Level 3: Left Hoof
    let hoofLMat = new Matrix4(calfMat);
    hoofLMat.translate(0.02, -0.16, 0.02); 
    hoofLMat.multiply(new Matrix4().setRotate(hoofAngle, 0, 0, 1)); // 3rd level joint rotation
    if (isPoking) {
        hoofLMat.multiply(new Matrix4().setRotate(Math.sin(pokeTime * 30) * 45, 0, 0, 1)); 
    }
    
    let hDrawL = new Matrix4(hoofLMat);
    hDrawL.translate(0.0, -0.02, 0); 
    hDrawL.scale(0.02, 0.02, 0.02); 
    drawShape(g_cubeBuffer, 36, hDrawL, colorHoof);

    // Level 3: Right Hoof
    let hoofRMat = new Matrix4(calfMat);
    hoofRMat.translate(0.02, -0.16, -0.02); 
    hoofRMat.multiply(new Matrix4().setRotate(hoofAngle, 0, 0, 1)); // 3rd level joint rotation
    if (isPoking) {
        hoofRMat.multiply(new Matrix4().setRotate(Math.cos(pokeTime * 30) * 45, 0, 0, 1)); 
    }

    let hDrawR = new Matrix4(hoofRMat);
    hDrawR.translate(0.0, -0.02, 0); 
    hDrawR.scale(0.02, 0.02, 0.02); 
    drawShape(g_cubeBuffer, 36, hDrawR, colorHoof);
}