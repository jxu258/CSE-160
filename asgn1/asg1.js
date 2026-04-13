/*
 * File: asg1.js
 * Name: Peter Xu
 * Date: 2026-04-10
 */

// Shaders

// Input: an array of points comes from javascript.
// In this example, think of this array as the variable a_Position;
// Q: Why a_Position is not an array?
// A: Because the GPU process every vertex in parallel
// The language that we use to write the shaders is called GLSL

// Output: sends "an array of points" to the rasterizer.
var VERTEX_SHADER = `
    precision mediump float;

    attribute vec3 a_Position; // a_Position only has x and y coordinates;
    uniform float u_Size;

    void main() {
        // a_Position is a variable of type vec4 (x,y,z,w)
        gl_Position = vec4(a_Position, 1.0); // return a_Position;
        gl_PointSize = u_Size;
    }
`;

// Input: a fragment (a grid of pixels) comes from the rasterizer.
// It doesn't have vertices as input
// Ouput: a color goes to HTML canvas.
var FRAGMENT_SHADER = `
    precision mediump float;

    uniform vec3 u_Color;

    void main() {
        // Return color red.
        // Colors are defined as vec4, where x->red, y->green, z->blue, w->alpha
        gl_FragColor = vec4(u_Color, 1.0);
    }
`;

// Global variables
let canvas;
let gl;
let a_Position;
let u_Color;
let u_Size;

// We will use HTML sliders to set this variable
let color = [0.0, 0.25, 1.0];
let g_selectedSize = 10.0;
let g_selectedSegments = 10;
let g_selectedType = 'point';
let g_mirrorMode = false;

// All pointers here
let g_shapesList = [];
let g_isDragging = false;
let g_actionCounts = [];

// Store drawPicture triangles separately
let g_pictureTriangles = [];
let g_showPicture = false;

// Point class
class Point {
    constructor() {
        this.type = 'point';
        this.position = [0.0, 0.0, 0.0];
        this.color = [1.0, 1.0, 1.0];
        this.size = 10.0;
    }

    render() {
        let xy = this.position;
        let rgb = this.color;
        let size = this.size;

        gl.disableVertexAttribArray(a_Position);
        gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);
        gl.uniform3f(u_Color, rgb[0], rgb[1], rgb[2]);
        gl.uniform1f(u_Size, size);

        gl.drawArrays(gl.POINTS, 0, 1);
    }
}

class Triangle {
    constructor() {
        this.type = 'triangle';
        this.position = [0.0, 0.0, 0.0];
        this.color = [1.0, 1.0, 1.0];
        this.size = 10.0;
    }

    render() {
        let xy = this.position;
        let rgb = this.color;
        let size = this.size;

        gl.uniform3f(u_Color, rgb[0], rgb[1], rgb[2]);
        // convert size into a small offset
        let d = size / 200.0;
        // draw an upright triangle centered around xy
        drawTriangle([
            xy[0],     xy[1] + d, xy[2],
            xy[0] - d, xy[1] - d, xy[2],
            xy[0] + d, xy[1] - d, xy[2]
        ]);
    }
}

class Circle {
    constructor() {
        this.type = 'circle';
        this.position = [0.0, 0.0, 0.0];
        this.color = [1.0, 1.0, 1.0];
        this.size = 10.0;
        this.segments = 10;
    }

    render() {
        let xy = this.position;
        let rgb = this.color;
        let size = this.size;
        let segments = this.segments;

        gl.uniform3f(u_Color, rgb[0], rgb[1], rgb[2]);

        let d = size / 200.0;
        let angleStep = 360 / segments;

        for (let angle = 0; angle < 360; angle += angleStep) {
            let angle1 = angle * Math.PI / 180;
            let angle2 = (angle + angleStep) * Math.PI / 180;

            let x1 = xy[0] + Math.cos(angle1) * d;
            let y1 = xy[1] + Math.sin(angle1) * d;
            let x2 = xy[0] + Math.cos(angle2) * d;
            let y2 = xy[1] + Math.sin(angle2) * d;

            drawTriangle([
                xy[0], xy[1], xy[2],
                x1,    y1,    xy[2],
                x2,    y2,    xy[2]
            ]);
        }
    }
}

// A function to draw a triangle using 3 vertices
function drawTriangle(vertices) {
    let vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.log("Failed to create buffer object");
        return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function main() {
    // step 1
    setupWebGL();
    // step 2
    connectVariablesToGLSL();
    // step 3
    addActionsForHtmlUI();
    // step 4
    handleClicks();
    // setting the clear color to be black (0, 0, 0)
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Actually clear screen
    gl.clear(gl.COLOR_BUFFER_BIT);
}

function setupWebGL() {
    let canvasElement = document.getElementById("webgl");

    // Retrieve WebGL rendering context
    let glContext = getWebGLContext(canvasElement);
    if (!glContext) {
        console.log("Failed to get WebGL context.");
        return -1;
    }

    canvas = canvasElement;
    gl = glContext;
}

function handleClicks() {
    // Mouse click and drag drawing
    canvas.onmousedown = function(ev) {
        g_isDragging = true;
        click(ev);
    };

    canvas.onmousemove = function(ev) {
        if (g_isDragging) {
            click(ev);
        }
    };

    canvas.onmouseup = function() {
        g_isDragging = false;
    };

    canvas.onmouseleave = function() {
        g_isDragging = false;
    };
}

function connectVariablesToGLSL() {
    // We have to compile the vertex and fragment shaders and
    // load them in the GPU
    if (!initShaders(gl, VERTEX_SHADER, FRAGMENT_SHADER)) {
        console.log("Failed to compile and load shaders.");
        return -1;
    }
    a_Position = gl.getAttribLocation(gl.program, "a_Position");
    if (a_Position < 0) {
        console.log("Failed to get a_Position.");
        return -1;
    }
    u_Color = gl.getUniformLocation(gl.program, "u_Color");
    if (!u_Color) {
        console.log("Failed to get u_Color.");
        return -1;
    }

    u_Size = gl.getUniformLocation(gl.program, "u_Size");
    if (!u_Size) {
        console.log("Failed to get u_Size.");
        return -1;
    }
}

function addActionsForHtmlUI() {
    document.getElementById('pointButton').onclick = function () {
        g_selectedType = 'point';
    };

    document.getElementById('triangleButton').onclick = function () {
        g_selectedType = 'triangle';
    };

    document.getElementById('circleButton').onclick = function () {
        g_selectedType = 'circle';
    };

    // Change the red component in the color using the slider
    document.getElementById('redS').addEventListener('mouseup', function () {
        color[0] = this.value / 20;
    });

    document.getElementById('greenS').addEventListener('mouseup', function () {
        color[1] = this.value / 20;
    });

    document.getElementById('blueS').addEventListener('mouseup', function () {
        color[2] = this.value / 20;
    });

    document.getElementById('sizeS').addEventListener('mouseup', function () {
        g_selectedSize = Number(this.value);
    });

    document.getElementById('segmentS').addEventListener('mouseup', function () {
        g_selectedSegments = Number(this.value);
    });

    document.getElementById('clearButton').onclick = function () {
        g_shapesList = [];
        g_actionCounts = [];
        g_pictureTriangles = [];
        g_showPicture = false;
        renderAllShapes();
    };

    document.getElementById('undoButton').onclick = function () {
        undoLastAction();
    };

    document.getElementById('drawPictureButton').onclick = function () {
        drawPicture();
    };

    document.getElementById('mirrorButton').onclick = function () {
        g_mirrorMode = !g_mirrorMode;

        if (g_mirrorMode) {
            this.textContent = 'Mirror Mode: ON';
        } else {
            this.textContent = 'Mirror Mode: OFF';
        }
    };
}

function undoLastAction() {
    if (g_actionCounts.length === 0) {
        return;
    }

    let count = g_actionCounts.pop();

    for (let i = 0; i < count; i++) {
        g_shapesList.pop();
    }

    renderAllShapes();
}

function click(ev) {
    let [x, y] = convertCoordinatesEventToGL(ev);

    // draw original shape
    let shape;

    if (g_selectedType === 'point') {
        shape = new Point();
    } else if (g_selectedType === 'triangle') {
        shape = new Triangle();
    } else if (g_selectedType === 'circle') {
        shape = new Circle();
    }

    shape.position = [x, y, 0.0];
    shape.color = [color[0], color[1], color[2]];
    shape.size = g_selectedSize;

    if (g_selectedType === 'circle') {
        shape.segments = g_selectedSegments;
    }

    g_shapesList.push(shape);

    let shapesAdded = 1;

    // draw mirrored shape if mirror mode is on
    if (g_mirrorMode) {
        let mirrorShape;

        if (g_selectedType === 'point') {
            mirrorShape = new Point();
        } else if (g_selectedType === 'triangle') {
            mirrorShape = new Triangle();
        } else if (g_selectedType === 'circle') {
            mirrorShape = new Circle();
        }

        mirrorShape.position = [-x, y, 0.0];
        mirrorShape.color = [color[0], color[1], color[2]];
        mirrorShape.size = g_selectedSize;

        if (g_selectedType === 'circle') {
            mirrorShape.segments = g_selectedSegments;
        }

        g_shapesList.push(mirrorShape);
        shapesAdded = 2;
    }

    g_actionCounts.push(shapesAdded);

    renderAllShapes();
}

function convertCoordinatesEventToGL(ev) {
    let x = ev.clientX;
    let y = ev.clientY;
    let rect = ev.target.getBoundingClientRect();

    x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
    y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

    return [x, y];
}

function renderPictureTriangles() {
    for (let i = 0; i < g_pictureTriangles.length; i++) {
        let t = g_pictureTriangles[i];
        gl.uniform3f(u_Color, t.color[0], t.color[1], t.color[2]);
        drawTriangle(t.vertices);
    }
}

function renderAllShapes() {
    // Actually clear screen
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (g_showPicture) {
        renderPictureTriangles();
    }

    // Finally, we can call a Draw function
    for (let i = 0; i < g_shapesList.length; i++) {
        g_shapesList[i].render();
    }

}

function drawPicture() {
    // Clear previous painting
    g_shapesList = [];
    g_actionCounts = [];
    g_pictureTriangles = [];
    g_showPicture = true;
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    function tri(vertices, rgb) {
        g_pictureTriangles.push({
            vertices: [...vertices],
            color: [...rgb]
        });
    }

    function diamond(cx, cy, rx, ry, rgb) {
        tri([
            cx,      cy + ry, 0.0,
            cx - rx, cy,      0.0,
            cx + rx, cy,      0.0
        ], rgb);

        tri([
            cx,      cy - ry, 0.0,
            cx - rx, cy,      0.0,
            cx + rx, cy,      0.0
        ], rgb);
    }

    function rect(x1, y1, x2, y2, rgb) {
        tri([
            x1, y1, 0.0,
            x2, y1, 0.0,
            x1, y2, 0.0
        ], rgb);

        tri([
            x2, y1, 0.0,
            x2, y2, 0.0,
            x1, y2, 0.0
        ], rgb);
    }

    // Colors
    let petal1  = [0.96, 0.76, 0.88];
    let petal2  = [0.84, 0.62, 0.86];
    let petal3  = [0.92, 0.70, 0.90];
    let center1 = [1.00, 0.92, 0.45];
    let center2 = [1.00, 0.97, 0.70];
    let stem    = [0.22, 0.72, 0.30];

    let rx = 0.07;
    let ry = 0.07;

    rect(-0.22, -0.62, -0.14, 0.18, stem);

    rect(-0.14, 0.20, 0.00, 0.26, stem);

    diamond(0.00, 0.24, rx, ry, petal2);

    diamond(0.08, 0.40, rx, ry, petal1);
    diamond(0.22, 0.48, rx, ry, petal3);
    diamond(0.36, 0.40, rx, ry, petal1);
    diamond(0.44, 0.24, rx, ry, petal2);
    diamond(0.36, 0.08, rx, ry, petal1);
    diamond(0.22, 0.00, rx, ry, petal3);
    diamond(0.08, 0.08, rx, ry, petal1);
    diamond(0.22, 0.24, rx * 0.55, ry * 0.55, center1);
    diamond(0.22, 0.24, rx * 0.28, ry * 0.28, center2);
    tri([
        0.22, 0.61, 0.0,
        0.15, 0.53, 0.0,
        0.29, 0.53, 0.0
    ], petal2);
    tri([
        0.57, 0.24, 0.0,
        0.49, 0.31, 0.0,
        0.49, 0.17, 0.0
    ], petal1);

    tri([
        0.22, -0.13, 0.0,
        0.15, -0.05, 0.0,
        0.29, -0.05, 0.0
    ], petal2);

    renderAllShapes();
}